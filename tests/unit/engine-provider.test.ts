import { describe, expect, it } from 'vitest'

import {
  AnalysisCancelledError,
  EngineDisposedError,
  EngineTimeoutError,
} from '@/lib/engine/errors'
import {
  DEFAULT_ENGINE_CONFIG,
  StockfishProvider,
  buildGoCommand,
  extractEngineLine,
  type EngineConfig,
} from '@/lib/engine/stockfish-provider'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const BLACK_TO_MOVE_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

const DEFAULT_GO_LINES = [
  'info depth 10 multipv 1 score cp 30 nodes 5000 pv e2e4 e7e5',
  'bestmove e2e4 ponder e7e5',
]

interface FakeWorkerScript {
  /** Responde `uciok`/`readyok`. Desligue para simular engine muda. */
  respondToHandshake?: boolean
  /** Responde ao `go`. Desligue para simular busca que nunca termina. */
  respondToGo?: boolean
  /** Linhas emitidas por chamada de `go`, em ordem. */
  goResponses?: string[][]
  /** Linhas emitidas ao receber `stop`. */
  stopResponse?: string[]
}

/**
 * Worker falso que fala UCI por script.
 *
 * Responde sempre de forma assíncrona, como um worker de verdade: responder
 * dentro do próprio `postMessage` esconderia corridas que existem no navegador.
 */
class FakeEngineWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  readonly commands: string[] = []
  terminated = false

  private goCount = 0
  private waiters: { match: (command: string) => boolean; resolve: () => void }[] = []

  /** Público e mutável: alguns testes mudam o roteiro no meio do caminho. */
  script: FakeWorkerScript

  constructor(script: FakeWorkerScript = {}) {
    this.script = script
  }

  postMessage(message: unknown): void {
    const command = String(message)
    this.commands.push(command)

    const matched = this.waiters.filter((waiter) => waiter.match(command))
    this.waiters = this.waiters.filter((waiter) => !matched.includes(waiter))
    for (const waiter of matched) waiter.resolve()

    this.react(command)
  }

  terminate(): void {
    this.terminated = true
  }

  /** Espera até o worker receber um comando com o prefixo indicado. */
  waitForCommand(prefix: string): Promise<void> {
    if (this.commands.some((command) => command.startsWith(prefix))) return Promise.resolve()
    return new Promise<void>((resolve) => {
      this.waiters.push({ match: (command) => command.startsWith(prefix), resolve })
    })
  }

  emit(...lines: string[]): void {
    for (const line of lines) {
      setTimeout(() => {
        if (this.terminated) return
        this.onmessage?.({ data: line })
      }, 0)
    }
  }

  private react(command: string): void {
    if (command === 'uci') {
      if (this.script.respondToHandshake === false) return
      this.emit('id name Fake Stockfish', 'option name MultiPV type spin default 1', 'uciok')
      return
    }
    if (command === 'isready') {
      if (this.script.respondToHandshake === false) return
      this.emit('readyok')
      return
    }
    if (command.startsWith('go')) {
      const index = this.goCount
      this.goCount += 1
      if (this.script.respondToGo === false) return
      this.emit(...(this.script.goResponses?.[index] ?? DEFAULT_GO_LINES))
      return
    }
    if (command === 'stop') {
      this.emit(...(this.script.stopResponse ?? ['bestmove e2e4']))
    }
  }
}

interface Harness {
  provider: StockfishProvider
  workers: FakeEngineWorker[]
}

function makeProvider(
  scriptFor: (index: number) => FakeWorkerScript = () => ({}),
  config: Partial<EngineConfig> = {},
): Harness {
  const workers: FakeEngineWorker[] = []
  const provider = new StockfishProvider({
    createWorker: () => {
      const worker = new FakeEngineWorker(scriptFor(workers.length))
      workers.push(worker)
      return worker as unknown as Worker
    },
    config: { handshakeTimeoutMs: 500, analysisTimeoutMs: 500, stopDrainTimeoutMs: 200, ...config },
  })
  return { provider, workers }
}

/** O worker só nasce dentro da fila assíncrona do provider. */
async function waitForWorker(workers: FakeEngineWorker[], index = 0): Promise<FakeEngineWorker> {
  for (let tick = 0; tick < 500; tick += 1) {
    const worker = workers[index]
    if (worker !== undefined) return worker
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
  throw new Error('O worker falso não foi criado a tempo.')
}

/** Espera a busca realmente chegar ao worker antes de mexer no provider. */
async function waitForRunningSearch(workers: FakeEngineWorker[]): Promise<FakeEngineWorker> {
  const worker = await waitForWorker(workers)
  await worker.waitForCommand('go')
  return worker
}

describe('extractEngineLine', () => {
  it('aceita string crua e mensagens embrulhadas', () => {
    expect(extractEngineLine('uciok')).toBe('uciok')
    expect(extractEngineLine({ line: 'readyok' })).toBe('readyok')
    expect(extractEngineLine({ data: 'bestmove e2e4' })).toBe('bestmove e2e4')
    expect(extractEngineLine({ nada: 1 })).toBeNull()
    expect(extractEngineLine(42)).toBeNull()
  })
})

describe('buildGoCommand', () => {
  it('usa o orçamento de nós padrão quando nada é pedido', () => {
    expect(buildGoCommand({}, 200000)).toBe('go nodes 200000')
  })

  it('respeita nós e profundidade explícitos', () => {
    expect(buildGoCommand({ nodes: 5000 }, 200000)).toBe('go nodes 5000')
    expect(buildGoCommand({ depth: 12 }, 200000)).toBe('go depth 12')
    expect(buildGoCommand({ depth: 12, nodes: 5000 }, 200000)).toBe('go depth 12 nodes 5000')
  })
})

describe('StockfishProvider — handshake', () => {
  it('faz o handshake UCI antes de aceitar qualquer análise', async () => {
    const { provider, workers } = makeProvider()

    await provider.init()

    expect(workers).toHaveLength(1)
    expect(workers[0].commands).toEqual([
      'uci',
      `setoption name Threads value ${DEFAULT_ENGINE_CONFIG.threads}`,
      `setoption name Hash value ${DEFAULT_ENGINE_CONFIG.hashMb}`,
      'isready',
    ])

    await provider.dispose()
  })

  it('não repete o handshake em análises seguintes', async () => {
    const { provider, workers } = makeProvider()

    await provider.analyzePosition(START_FEN, {})
    await provider.analyzePosition(START_FEN, {})

    expect(workers).toHaveLength(1)
    expect(workers[0].commands.filter((command) => command === 'uci')).toHaveLength(1)

    await provider.dispose()
  })

  it('falha com timeout quando a engine não responde ao handshake', async () => {
    const { provider, workers } = makeProvider(() => ({ respondToHandshake: false }), {
      handshakeTimeoutMs: 20,
    })

    await expect(provider.init()).rejects.toBeInstanceOf(EngineTimeoutError)
    expect(workers[0].terminated).toBe(true)

    await provider.dispose()
  })
})

describe('StockfishProvider — análise', () => {
  it('resolve com as linhas, o melhor lance e o lado que joga', async () => {
    const { provider, workers } = makeProvider(() => ({
      goResponses: [
        [
          'info depth 10 multipv 1 score cp 30 nodes 5000 wdl 300 600 100 pv e2e4 e7e5',
          'info depth 11 multipv 2 score cp 10 nodes 5200 pv d2d4 d7d5',
          'bestmove e2e4 ponder e7e5',
        ],
      ],
    }))

    const analysis = await provider.analyzePosition(START_FEN, { multiPv: 2, nodes: 5000 })

    expect(analysis.bestMoveUci).toBe('e2e4')
    expect(analysis.ponderUci).toBe('e7e5')
    expect(analysis.turn).toBe('w')
    expect(analysis.depth).toBe(11)
    expect(analysis.nodes).toBe(5200)
    expect(analysis.lines.map((line) => line.multiPv)).toEqual([1, 2])
    expect(analysis.lines[0].scoreCp).toBe(30)
    expect(analysis.lines[0].pv).toEqual(['e2e4', 'e7e5'])
    expect(analysis.lines[0].wdl).toEqual({ win: 300, draw: 600, loss: 100 })
    expect(analysis.lines[1].scoreCp).toBe(10)

    expect(workers[0].commands).toContain('setoption name MultiPV value 2')
    expect(workers[0].commands).toContain('setoption name UCI_ShowWDL value true')
    expect(workers[0].commands).toContain(`position fen ${START_FEN}`)
    expect(workers[0].commands).toContain('go nodes 5000')

    await provider.dispose()
  })

  it('guarda a perspectiva do FEN para quem for normalizar depois', async () => {
    const { provider } = makeProvider()

    const analysis = await provider.analyzePosition(BLACK_TO_MOVE_FEN, {})

    expect(analysis.turn).toBe('b')

    await provider.dispose()
  })

  it('ignora info sem pv e mantém a última profundidade de cada multipv', async () => {
    const { provider } = makeProvider(() => ({
      goResponses: [
        [
          'info depth 1 currmove e2e4 currmovenumber 1',
          'info string NNUE evaluation using nn-9067e33176e',
          'info depth 4 multipv 1 score cp 12 nodes 100 pv e2e4',
          'info depth 9 multipv 1 score cp 21 nodes 900 pv e2e4 e7e5',
          'bestmove e2e4',
        ],
      ],
    }))

    const analysis = await provider.analyzePosition(START_FEN, {})

    expect(analysis.lines).toHaveLength(1)
    expect(analysis.lines[0].scoreCp).toBe(21)
    expect(analysis.lines[0].depth).toBe(9)
    expect(analysis.ponderUci).toBeNull()

    await provider.dispose()
  })
})

describe('StockfishProvider — respostas obsoletas', () => {
  it('descarta o resultado da análise antiga quando uma nova começa', async () => {
    const { provider, workers } = makeProvider(() => ({
      respondToGo: false,
      // Chega só depois do `stop`: é o resultado da busca já cancelada.
      stopResponse: ['info depth 30 multipv 1 score cp 999 nodes 999999 pv a2a3', 'bestmove a2a3'],
      goResponses: [],
    }))

    const first = provider.analyzePosition(START_FEN, {})
    const firstResult = first.catch((error: unknown) => error)
    const worker = await waitForRunningSearch(workers)

    // A partir daqui o worker responde normalmente ao segundo `go`.
    worker.script.respondToGo = true
    worker.script.goResponses = [
      [],
      ['info depth 12 multipv 1 score cp 40 nodes 4000 pv d2d4', 'bestmove d2d4'],
    ]

    const second = await provider.analyzePosition(BLACK_TO_MOVE_FEN, {})

    expect(second.bestMoveUci).toBe('d2d4')
    expect(second.lines).toHaveLength(1)
    // O `cp 999` da busca cancelada não pode ter vazado para a análise nova.
    expect(second.lines[0].scoreCp).toBe(40)
    expect(second.nodes).toBe(4000)
    expect(second.fen).toBe(BLACK_TO_MOVE_FEN)

    await expect(firstResult).resolves.toBeInstanceOf(AnalysisCancelledError)
    expect(worker.commands).toContain('stop')

    await provider.dispose()
  })

  it('rejeita com AnalysisCancelledError quando stop() é chamado', async () => {
    const { provider, workers } = makeProvider(() => ({
      respondToGo: false,
      stopResponse: ['bestmove a2a3'],
    }))

    const pending = provider.analyzePosition(START_FEN, {})
    const settled = pending.catch((error: unknown) => error)
    const worker = await waitForRunningSearch(workers)

    await provider.stop()

    await expect(settled).resolves.toBeInstanceOf(AnalysisCancelledError)
    expect(worker.commands).toContain('stop')

    await provider.dispose()
  })
})

describe('StockfishProvider — timeout e reinício', () => {
  it('reinicia o worker e rejeita a análise pendurada', async () => {
    const { provider, workers } = makeProvider(
      (index) => (index === 0 ? { respondToGo: false } : {}),
      { analysisTimeoutMs: 30 },
    )

    await expect(provider.analyzePosition(START_FEN, {})).rejects.toBeInstanceOf(EngineTimeoutError)

    expect(workers).toHaveLength(1)
    expect(workers[0].terminated).toBe(true)
    expect(workers[0].onmessage).toBeNull()

    // A próxima análise levanta um worker novo e volta a funcionar.
    const analysis = await provider.analyzePosition(START_FEN, {})

    expect(workers).toHaveLength(2)
    expect(analysis.bestMoveUci).toBe('e2e4')

    await provider.dispose()
  })
})

describe('StockfishProvider — dispose', () => {
  it('encerra o worker, solta os listeners e rejeita o que estava pendente', async () => {
    const { provider, workers } = makeProvider(() => ({ respondToGo: false }))

    const pending = provider.analyzePosition(START_FEN, {})
    const settled = pending.catch((error: unknown) => error)
    const worker = await waitForRunningSearch(workers)

    await provider.dispose()

    await expect(settled).resolves.toBeInstanceOf(EngineDisposedError)
    expect(worker.terminated).toBe(true)
    expect(worker.onmessage).toBeNull()
    expect(worker.onerror).toBeNull()
  })

  it('recusa novas análises depois de encerrado', async () => {
    const { provider } = makeProvider()

    await provider.init()
    await provider.dispose()

    await expect(provider.analyzePosition(START_FEN, {})).rejects.toBeInstanceOf(
      EngineDisposedError,
    )
    await expect(provider.init()).rejects.toBeInstanceOf(EngineDisposedError)
  })

  it('mensagens que chegam depois do dispose não fazem nada', async () => {
    const { provider, workers } = makeProvider()

    await provider.init()
    const worker = workers[0]
    await provider.dispose()

    expect(() => worker.onmessage?.({ data: 'bestmove e2e4' })).not.toThrow()
  })
})
