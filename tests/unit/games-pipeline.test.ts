import { describe, expect, it } from 'vitest'

import { CRITICAL_CONFIG } from '@/domain/games/critical'
import {
  AnalysisAbortedError,
  PIPELINE_CONFIG,
  analyzeGame,
  type GameAnalysis,
} from '@/domain/games/pipeline'
import { SEVERITY_CONFIG } from '@/domain/games/severity'
import type { Game } from '@/domain/types'
import { START_FEN, applyMove, legalMoves, parsePgn, positionStatus } from '@/lib/chess'
import type { AnalysisOptions, EngineAnalysis, EngineProvider } from '@/lib/engine/types'
import type { ChessGame, PieceColor } from '@/lib/chess'

/**
 * Partida gerada de forma determinística: a mesma sequência de lances legais
 * sai em toda execução. O que interessa aqui são FENs válidas e alternância de
 * lado, não a qualidade do xadrez.
 */
function gerarPgn(maxPlies: number): string {
  let fen = START_FEN
  const sans: string[] = []

  for (let i = 1; i <= maxPlies; i += 1) {
    const legais = legalMoves(fen).sort((a, b) => a.uci.localeCompare(b.uci))
    if (legais.length === 0) break
    const aplicado = applyMove(fen, legais[(i * 7) % legais.length].uci)
    if (!aplicado) break
    sans.push(aplicado.move.san)
    fen = aplicado.fenAfter
  }

  const partes: string[] = []
  sans.forEach((san, i) => {
    if (i % 2 === 0) partes.push(`${i / 2 + 1}.`)
    partes.push(san)
  })

  return `${partes.join(' ')} *`
}

/** 39 meios-lances: o primeiro e o último são das brancas. */
const PGN = gerarPgn(39)

function montarPartida(userColor: PieceColor = 'b'): Game {
  return {
    id: 'partida-1',
    source: 'pgn',
    pgn: PGN,
    playedAt: '2026-01-01T00:00:00.000Z',
    white: 'oponente',
    black: 'usuario',
    userColor,
    result: '*',
    importedAt: '2026-01-02T00:00:00.000Z',
  }
}

/**
 * Centipeões que produzem exatamente `perdaPp` de perda para o usuário quando
 * a posição anterior valia 0 cp. É a inversa da logística de `severity`, então
 * o roteiro fala em pontos percentuais e não em números mágicos.
 */
function cpParaPerda(perdaPp: number): number {
  const p = 0.5 + perdaPp / 100
  return Math.log(p / (1 - p)) / SEVERITY_CONFIG.logisticaK
}

/** Roteiro de avaliações por FEN, montado a partir das perdas desejadas. */
function montarRoteiro(
  partida: ChessGame,
  userColor: PieceColor,
  perda: (indiceDoLance: number) => number,
): Map<string, number> {
  const roteiro = new Map<string, number>()
  let indice = 0

  for (const ply of partida.plies) {
    if (ply.color !== userColor) continue
    roteiro.set(ply.fenBefore, 0)
    roteiro.set(ply.fenAfter, cpParaPerda(perda(indice)))
    indice += 1
  }

  return roteiro
}

interface ChamadaDaEngine {
  fen: string
  nodes: number
  multiPv: number
  showWdl: boolean
}

interface FakeEngineOptions {
  /** Centipeões na perspectiva de quem joga o FEN. Ausente vira 0. */
  roteiro: Map<string, number>
  /** FENs em que a engine falha, para exercitar robustez. */
  falharEm?: Set<string>
  /** Chamado antes de resolver, com o número da chamada. Serve para abortar no meio. */
  aoAnalisar?: (chamada: number, fen: string) => void
}

/**
 * Engine falsa que fala o contrato inteiro e responde por roteiro.
 *
 * Estável por FEN de propósito: aprofundar não muda o número, então qualquer
 * diferença entre as duas passadas vem do pipeline e não do roteiro.
 * Resolve de forma assíncrona, como um worker de verdade.
 */
class FakeEngine implements EngineProvider {
  readonly chamadas: ChamadaDaEngine[] = []
  inicializada = 0
  parada = 0

  constructor(private readonly options: FakeEngineOptions) {}

  async init(): Promise<void> {
    this.inicializada += 1
  }

  async analyzePosition(fen: string, options: AnalysisOptions): Promise<EngineAnalysis> {
    this.chamadas.push({
      fen,
      nodes: options.nodes ?? 0,
      multiPv: options.multiPv ?? 1,
      showWdl: options.showWdl === true,
    })
    this.options.aoAnalisar?.(this.chamadas.length, fen)
    await Promise.resolve()

    if (this.options.falharEm?.has(fen)) {
      throw new Error('engine falhou nesta posição')
    }

    const legais = legalMoves(fen).sort((a, b) => a.uci.localeCompare(b.uci))
    const melhor = legais[0]?.uci ?? null
    const cp = Math.round(this.options.roteiro.get(fen) ?? 0)

    return {
      fen,
      turn: positionStatus(fen).turn,
      depth: 12,
      nodes: options.nodes ?? 0,
      bestMoveUci: melhor,
      ponderUci: null,
      lines: melhor
        ? [
            {
              multiPv: 1,
              scoreCp: cp,
              mateIn: null,
              pv: [melhor],
              depth: 12,
              nodes: 0,
              // A engine só reporta WDL quando pedimos, como a de verdade.
              ...(options.showWdl === true ? { wdl: { win: 600, draw: 300, loss: 100 } } : {}),
            },
          ]
        : [],
      elapsedMs: 1,
    }
  }

  async stop(): Promise<void> {
    this.parada += 1
  }

  async dispose(): Promise<void> {}

  /** Chamadas de uma das passadas, identificadas pelo orçamento de nós. */
  comNodes(nodes: number): ChamadaDaEngine[] {
    return this.chamadas.filter((chamada) => chamada.nodes === nodes)
  }
}

/** Perda pequena em todos os lances, exceto quatro pontos combinados. */
const PERDAS_ESCOLHIDAS: Record<number, number> = { 2: 25, 5: 12, 9: 9, 14: 6 }

function perdaEscolhida(indice: number): number {
  return PERDAS_ESCOLHIDAS[indice] ?? 1
}

function fensDoUsuario(partida: ChessGame, userColor: PieceColor): Set<string> {
  const fens = new Set<string>()
  for (const ply of partida.plies) {
    if (ply.color !== userColor) continue
    fens.add(ply.fenBefore)
    if (!positionStatus(ply.fenAfter).isGameOver) fens.add(ply.fenAfter)
  }
  return fens
}

async function analisar(
  engine: FakeEngine,
  extra: Partial<Parameters<typeof analyzeGame>[0]> = {},
): Promise<GameAnalysis> {
  return analyzeGame({ game: montarPartida(), engine, ...extra })
}

describe('varredura rasa', () => {
  it('analisa apenas os lances do lado do usuário', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    const resultado = await analisar(engine)

    const lancesDoUsuario = partida.plies.filter((ply) => ply.color === 'b')
    const esperadas = fensDoUsuario(partida, 'b')
    const rasas = engine.comNodes(PIPELINE_CONFIG.varreduraNodes)

    // Duas posições por lance do usuário: antes e depois. Nenhuma a mais.
    expect(rasas).toHaveLength(esperadas.size)
    expect(new Set(rasas.map((chamada) => chamada.fen))).toEqual(esperadas)

    // A posição inicial só interessa ao lance das brancas: nunca vai à engine.
    expect(rasas.some((chamada) => chamada.fen === START_FEN)).toBe(false)
    // A posição final também é de lance das brancas e fica de fora.
    const ultima = partida.plies[partida.plies.length - 1]
    expect(ultima.color).toBe('w')
    expect(engine.chamadas.some((chamada) => chamada.fen === ultima.fenAfter)).toBe(false)

    // Uma análise por lance do usuário, e só dele.
    expect(resultado.analises).toHaveLength(lancesDoUsuario.length)
    expect(
      resultado.analises.every((analise) => positionStatus(analise.fenBefore).turn === 'b'),
    ).toBe(true)
    expect(engine.inicializada).toBe(1)
  })

  it('classifica severidade a partir da perda roteirizada', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    const resultado = await analisar(engine)
    const porPerda = [...resultado.analises].sort(
      (a, b) => b.expectedScoreLossPp - a.expectedScoreLossPp,
    )

    expect(porPerda[0].expectedScoreLossPp).toBeCloseTo(25, 1)
    expect(porPerda[0].severity).toBe('erro-grave')
    expect(porPerda[1].severity).toBe('erro')
    expect(resultado.resumo.porSeveridade.ok).toBeGreaterThan(0)
    expect(resultado.resumo.pliesDoUsuario).toBe(resultado.analises.length)
  })
})

describe('aprofundamento', () => {
  it('usa mais nós que a varredura e roda só nos candidatos', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    expect(PIPELINE_CONFIG.varreduraNodes).toBeLessThan(PIPELINE_CONFIG.aprofundamentoNodes)

    const resultado = await analisar(engine)

    // Só as quatro perdas acima do limiar de candidato viram aprofundamento.
    const acimaDoLimiar = Object.values(PERDAS_ESCOLHIDAS).filter(
      (perda) => perda >= CRITICAL_CONFIG.limiarCandidatoPp,
    ).length
    expect(acimaDoLimiar).toBe(4)
    expect(resultado.resumo.pliesAprofundados).toBe(4)

    const profundas = engine.comNodes(PIPELINE_CONFIG.aprofundamentoNodes)
    expect(profundas).toHaveLength(4 * 2)

    // Toda posição aprofundada também apareceu na varredura: nada de posição nova.
    const rasas = new Set(engine.comNodes(PIPELINE_CONFIG.varreduraNodes).map((c) => c.fen))
    expect(profundas.every((chamada) => rasas.has(chamada.fen))).toBe(true)
    // E o aprofundamento é uma fração pequena da partida.
    expect(profundas.length).toBeLessThan(rasas.size)
  })

  it('respeita o teto de momentos numa partida cheia de erros', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', () => 9) })

    const resultado = await analisar(engine)

    expect(resultado.resumo.pliesAprofundados).toBe(CRITICAL_CONFIG.maxCandidatos)
    expect(resultado.momentos.length).toBeLessThanOrEqual(CRITICAL_CONFIG.maxMomentos)
    expect(resultado.momentos).toHaveLength(CRITICAL_CONFIG.maxMomentos)
    // Apresentação cronológica.
    const plies = resultado.momentos.map((momento) => momento.ply)
    expect([...plies].sort((a, b) => a - b)).toEqual(plies)
    // Todo momento carrega explicação, mesmo quando o código é `unknown`.
    expect(resultado.momentos.every((momento) => momento.explanation !== null)).toBe(true)
  }, 30_000)

  it('não destaca nenhum momento numa partida sem erro relevante', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', () => 0.5) })

    const resultado = await analisar(engine)

    expect(resultado.resumo.pliesAprofundados).toBe(0)
    expect(resultado.momentos).toHaveLength(0)
    expect(resultado.resumo.unknownRate).toBe(0)
    expect(engine.comNodes(PIPELINE_CONFIG.aprofundamentoNodes)).toHaveLength(0)
  })
})

describe('cancelamento', () => {
  it('rejeita com AnalysisAbortedError e para de chamar a engine', async () => {
    const partida = parsePgn(PGN)
    const controlador = new AbortController()
    const engine = new FakeEngine({
      roteiro: montarRoteiro(partida, 'b', perdaEscolhida),
      aoAnalisar: (chamada) => {
        if (chamada === 3) controlador.abort()
      },
    })

    await expect(analisar(engine, { signal: controlador.signal })).rejects.toBeInstanceOf(
      AnalysisAbortedError,
    )

    expect(engine.chamadas).toHaveLength(3)
    // Pediu à engine para largar a busca em andamento.
    expect(engine.parada).toBeGreaterThanOrEqual(1)
  })

  it('rejeita antes de qualquer chamada quando o signal já vem abortado', async () => {
    const partida = parsePgn(PGN)
    const controlador = new AbortController()
    controlador.abort()
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    await expect(analisar(engine, { signal: controlador.signal })).rejects.toBeInstanceOf(
      AnalysisAbortedError,
    )
    expect(engine.chamadas).toHaveLength(0)
  })
})

describe('robustez', () => {
  it('uma falha de engine não derruba a partida e entra no resumo', async () => {
    const partida = parsePgn(PGN)
    const lancesDoUsuario = partida.plies.filter((ply) => ply.color === 'b')
    const quebrado = lancesDoUsuario[3]
    const engine = new FakeEngine({
      roteiro: montarRoteiro(partida, 'b', perdaEscolhida),
      falharEm: new Set([quebrado.fenBefore]),
    })

    const resultado = await analisar(engine)

    expect(resultado.resumo.pliesComFalha).toBe(1)
    expect(resultado.analises).toHaveLength(lancesDoUsuario.length - 1)
    expect(resultado.analises.some((analise) => analise.ply === quebrado.index)).toBe(false)
    // A varredura continuou depois da falha.
    expect(resultado.analises.some((analise) => analise.ply > quebrado.index)).toBe(true)
  })

  it('falha no aprofundamento mantém o número raso do lance', async () => {
    const partida = parsePgn(PGN)
    const lancesDoUsuario = partida.plies.filter((ply) => ply.color === 'b')
    // Índice 2 é a maior perda do roteiro: primeiro candidato do aprofundamento.
    const candidato = lancesDoUsuario[2]

    let vezes = 0
    const engine = new FakeEngine({
      roteiro: montarRoteiro(partida, 'b', perdaEscolhida),
      aoAnalisar: (_chamada, fen) => {
        if (fen === candidato.fenBefore) vezes += 1
      },
    })
    await analisar(engine)
    expect(vezes).toBe(2)

    // Agora a engine falha só na segunda visita à mesma posição.
    let visitas = 0
    const instavel = new FakeEngine({
      roteiro: montarRoteiro(partida, 'b', perdaEscolhida),
      aoAnalisar: (_chamada, fen) => {
        if (fen !== candidato.fenBefore) return
        visitas += 1
        if (visitas > 1) throw new Error('timeout no aprofundamento')
      },
    })

    const resultado = await analyzeGame({ game: montarPartida(), engine: instavel })

    expect(resultado.resumo.aprofundamentosComFalha).toBe(1)
    expect(resultado.resumo.pliesAprofundados).toBe(3)
    const analise = resultado.analises.find((item) => item.ply === candidato.index)
    expect(analise?.expectedScoreLossPp).toBeCloseTo(25, 1)
  })
})

describe('progresso e determinismo', () => {
  it('chama onProgress uma vez por etapa, terminando em feito igual ao total', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })
    const chamadas: [number, number][] = []

    const resultado = await analisar(engine, {
      onProgress: (feito, total) => chamadas.push([feito, total]),
    })

    const lancesDoUsuario = partida.plies.filter((ply) => ply.color === 'b').length
    const candidatos = resultado.resumo.pliesAprofundados

    expect(chamadas).toHaveLength(lancesDoUsuario + candidatos)
    // `feito` é estritamente crescente, de 1 até o total.
    expect(chamadas.map(([feito]) => feito)).toEqual(
      Array.from({ length: chamadas.length }, (_, i) => i + 1),
    )
    // Durante a varredura o total ainda é o número de lances do usuário.
    expect(chamadas[0][1]).toBe(lancesDoUsuario)
    // O total cresce ao entrar no aprofundamento e fecha exatamente.
    const ultima = chamadas[chamadas.length - 1]
    expect(ultima).toEqual([lancesDoUsuario + candidatos, lancesDoUsuario + candidatos])
  })

  it('mesma partida e mesma engine falsa produzem o mesmo resultado', async () => {
    const partida = parsePgn(PGN)
    const primeira = await analisar(
      new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) }),
    )
    const segunda = await analisar(
      new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) }),
    )

    expect(segunda).toEqual(primeira)
    expect(JSON.stringify(segunda)).toBe(JSON.stringify(primeira))
  })
})

describe('precisão declarada e WDL', () => {
  it('lance que ficou só na varredura é marcado como raso', async () => {
    const partida = parsePgn(PGN)
    // Perda ínfima em todos: nenhum candidato, logo nenhum aprofundamento.
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', () => 0.5) })

    const { analises, resumo } = await analisar(engine)

    expect(resumo.pliesAprofundados).toBe(0)
    expect(analises.length).toBeGreaterThan(0)
    for (const a of analises) {
      expect(a.precisao, `ply ${a.ply}`).toBe('rasa')
    }
  })

  it('lance aprofundado é marcado como aprofundado', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    const { analises, resumo } = await analisar(engine)

    const aprofundadas = analises.filter((a) => a.precisao === 'aprofundada')
    expect(aprofundadas.length).toBe(resumo.pliesAprofundados)
    expect(aprofundadas.length).toBeGreaterThan(0)
  })

  // Sem isto, a tela apresentaria número de varredura rasa como diagnóstico —
  // que é exatamente a falsa precisão que o produto proíbe.
  it('a precisão declarada bate com o orçamento que o lance realmente recebeu', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    const { analises } = await analisar(engine)

    const fensAprofundados = new Set(
      engine.chamadas
        .filter((c) => c.nodes === PIPELINE_CONFIG.aprofundamentoNodes)
        .map((c) => c.fen),
    )
    for (const a of analises) {
      const esperado = fensAprofundados.has(a.fenBefore) ? 'aprofundada' : 'rasa'
      expect(a.precisao, `ply ${a.ply} (${a.fenBefore})`).toBe(esperado)
    }
  })

  it('WDL só é pedido no aprofundamento, nunca na varredura', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    await analisar(engine)

    const rasas = engine.chamadas.filter((c) => c.nodes === PIPELINE_CONFIG.varreduraNodes)
    const profundas = engine.chamadas.filter((c) => c.nodes === PIPELINE_CONFIG.aprofundamentoNodes)
    expect(rasas.length).toBeGreaterThan(0)
    expect(profundas.length).toBeGreaterThan(0)
    expect(rasas.every((c) => c.showWdl === false)).toBe(true)
    expect(profundas.every((c) => c.showWdl === true)).toBe(true)
  })

  it('análise rasa não inventa WDL', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', () => 0.5) })

    const { analises } = await analisar(engine)

    for (const a of analises) {
      expect(a.wdlBefore, `ply ${a.ply}`).toBeUndefined()
      expect(a.wdlAfter, `ply ${a.ply}`).toBeUndefined()
    }
  })

  it('análise aprofundada guarda WDL somando mil, na perspectiva das brancas', async () => {
    const partida = parsePgn(PGN)
    const engine = new FakeEngine({ roteiro: montarRoteiro(partida, 'b', perdaEscolhida) })

    const { analises } = await analisar(engine)
    const aprofundada = analises.find((a) => a.precisao === 'aprofundada')

    expect(aprofundada?.wdlBefore).toBeDefined()
    const { win, draw, loss } = aprofundada!.wdlBefore!
    expect(win + draw + loss).toBe(1000)
    // O usuário joga de pretas neste PGN: a engine reporta na perspectiva de
    // quem joga, e guardamos sempre em brancas. Como o roteiro devolve sempre
    // 600/300/100, a normalização tem de ter invertido em algum dos lados.
    expect(win === 600 && loss === 100).toBe(false)
  })
})
