/**
 * `EngineProvider` sobre um Web Worker rodando Stockfish.
 *
 * Regras que este arquivo existe para garantir:
 * - handshake UCI (`uci` -> `uciok`, `isready` -> `readyok`) antes de analisar;
 * - fila serializada: um comando de busca por vez, nunca dois `go` em voo;
 * - descarte de resposta obsoleta: o `bestmove` de uma análise cancelada nunca
 *   é aplicado à análise seguinte;
 * - cancelamento explícito com erro tipado;
 * - timeout que reinicia o worker em vez de deixar a UI pendurada;
 * - `dispose()` que encerra o worker e solta os listeners.
 *
 * O worker chega por injeção (`createWorker`) para que o teste possa usar um
 * worker falso e o app possa escolher onde os binários moram.
 */

import {
  AnalysisCancelledError,
  EngineDisposedError,
  EngineTimeoutError,
  EngineWorkerError,
} from './errors'
import type {
  AnalysisOptions,
  EngineAnalysis,
  EngineLine,
  EngineProvider,
  EngineTurn,
} from './types'
import { parseUciLine, turnFromFen, type UciInfo } from './uci'

/** Parâmetros ajustáveis da engine. Nenhum número mágico espalhado no código. */
export interface EngineConfig {
  /** Tempo máximo para `uciok` + `readyok`. */
  handshakeTimeoutMs: number
  /** Tempo máximo de uma análise antes de considerar a engine travada. */
  analysisTimeoutMs: number
  /** Tempo máximo esperando o `bestmove` de uma busca cancelada. */
  stopDrainTimeoutMs: number
  /** Orçamento padrão de nós. Heurística de produto, não constante científica. */
  defaultNodes: number
  defaultMultiPv: number
  defaultShowWdl: boolean
  /** Tamanho da hash table em MB. Conservador para caber em celular. */
  hashMb: number
  /** O build distribuído é lite single-threaded: mais de 1 não faz sentido. */
  threads: number
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  handshakeTimeoutMs: 15_000,
  analysisTimeoutMs: 30_000,
  stopDrainTimeoutMs: 3_000,
  defaultNodes: 200_000,
  defaultMultiPv: 1,
  defaultShowWdl: true,
  hashMb: 16,
  threads: 1,
}

export interface StockfishProviderInit {
  /** Fábrica de worker. Injetada para permitir worker falso em teste. */
  createWorker: () => Worker
  config?: Partial<EngineConfig>
}

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined
  let reject: (error: Error) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** Pedido de análise feito pelo chamador, antes e durante a execução. */
interface AnalysisTicket {
  id: number
  fen: string
  turn: EngineTurn
  options: AnalysisOptions
  settled: boolean
  deferred: Deferred<EngineAnalysis>
}

/** Busca efetivamente em andamento no worker. */
interface AnalysisRun {
  ticket: AnalysisTicket
  startedAt: number
  lines: Map<number, EngineLine>
  maxDepth: number
  maxNodes: number
  timer: ReturnType<typeof setTimeout> | null
  /** Resolve quando a busca termina por qualquer motivo, para liberar a fila. */
  done: Deferred<void>
}

type PendingToken = 'uciok' | 'readyok'

interface TokenWaiter {
  token: PendingToken
  resolve: () => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new EngineWorkerError(String(value))
}

/**
 * Extrai a linha de texto de uma mensagem do worker.
 *
 * O build do stockfish.js posta strings cruas; aceitamos também `{ data }` ou
 * `{ line }` para tolerar pontes que embrulham a mensagem.
 */
export function extractEngineLine(data: unknown): string | null {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.line === 'string') return record.line
    if (typeof record.data === 'string') return record.data
  }
  return null
}

export class StockfishProvider implements EngineProvider {
  private readonly createWorker: () => Worker
  private readonly config: EngineConfig

  private worker: Worker | null = null
  private ready = false
  private disposed = false

  /** Fila serializada: cada análise só começa quando a anterior sai do worker. */
  private chain: Promise<void> = Promise.resolve()

  private nextAnalysisId = 0
  private tickets: AnalysisTicket[] = []
  private run: AnalysisRun | null = null

  /** Quantos `bestmove` obsoletos ainda devem ser engolidos antes de confiar. */
  private staleBestMoves = 0
  private drainWaiters: Deferred<void>[] = []
  private waiters: TokenWaiter[] = []

  constructor({ createWorker, config }: StockfishProviderInit) {
    this.createWorker = createWorker
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config }
  }

  // ------------------------------------------------------------------ público

  async init(): Promise<void> {
    if (this.disposed) throw new EngineDisposedError()
    await this.enqueue(() => this.ensureReady())
  }

  analyzePosition(fen: string, options: AnalysisOptions): Promise<EngineAnalysis> {
    if (this.disposed) return Promise.reject(new EngineDisposedError())

    const ticket: AnalysisTicket = {
      id: ++this.nextAnalysisId,
      fen,
      turn: turnFromFen(fen),
      options,
      settled: false,
      deferred: createDeferred<EngineAnalysis>(),
    }

    // Uma análise nova invalida a anterior imediatamente: quem pediu a antiga
    // recebe o erro de cancelamento agora, sem esperar a engine responder.
    this.cancelInFlight(
      new AnalysisCancelledError('Análise substituída por uma solicitação mais recente.'),
    )

    this.tickets.push(ticket)
    void this.enqueue(() => this.executeTicket(ticket))

    return ticket.deferred.promise
  }

  async stop(): Promise<void> {
    if (this.disposed) return
    this.cancelInFlight(new AnalysisCancelledError('Análise cancelada pelo aplicativo.'))
    await this.waitForDrain()
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.cancelInFlight(new EngineDisposedError())
    this.teardownWorker()
    this.chain = Promise.resolve()
  }

  // -------------------------------------------------------------------- fila

  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.chain.then(task, task)
    // Erros de uma tarefa não podem envenenar a fila das seguintes.
    this.chain = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  private async executeTicket(ticket: AnalysisTicket): Promise<void> {
    if (ticket.settled || this.disposed) return
    try {
      await this.ensureReady()
      await this.waitForDrain()
      if (ticket.settled || this.disposed) return
      await this.startRun(ticket)
    } catch (error) {
      this.settleTicket(ticket, null, toError(error))
    }
  }

  // --------------------------------------------------------------- handshake

  private async ensureReady(): Promise<void> {
    if (this.disposed) throw new EngineDisposedError()
    if (this.ready && this.worker) return

    const worker = this.spawnWorker()
    const { handshakeTimeoutMs, threads, hashMb } = this.config

    this.post(worker, 'uci')
    await this.waitForToken('uciok', handshakeTimeoutMs)
    this.post(worker, `setoption name Threads value ${threads}`)
    this.post(worker, `setoption name Hash value ${hashMb}`)
    this.post(worker, 'isready')
    await this.waitForToken('readyok', handshakeTimeoutMs)

    this.ready = true
  }

  private spawnWorker(): Worker {
    if (this.worker) return this.worker
    const worker = this.createWorker()
    worker.onmessage = (event: MessageEvent) => this.handleWorkerData(event.data)
    worker.onerror = () => this.handleWorkerFailure(new EngineWorkerError())
    this.worker = worker
    return worker
  }

  private post(worker: Worker, command: string): void {
    worker.postMessage(command)
  }

  private send(command: string): void {
    if (!this.worker) throw new EngineWorkerError('Worker da engine indisponível.')
    this.post(this.worker, command)
  }

  private waitForToken(token: PendingToken, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const waiter: TokenWaiter = {
        token,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((item) => item !== waiter)
          this.restartWorker()
          reject(new EngineTimeoutError(`A engine não respondeu \`${token}\` a tempo.`))
        }, timeoutMs),
      }
      this.waiters.push(waiter)
    })
  }

  private resolveToken(token: PendingToken): void {
    const waiter = this.waiters.find((item) => item.token === token)
    if (!waiter) return
    this.waiters = this.waiters.filter((item) => item !== waiter)
    clearTimeout(waiter.timer)
    waiter.resolve()
  }

  private rejectAllWaiters(error: Error): void {
    const pending = this.waiters
    this.waiters = []
    for (const waiter of pending) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
  }

  // ------------------------------------------------------------------ análise

  private startRun(ticket: AnalysisTicket): Promise<void> {
    const { defaultMultiPv, defaultShowWdl, defaultNodes, analysisTimeoutMs } = this.config
    const multiPv = ticket.options.multiPv ?? defaultMultiPv
    const showWdl = ticket.options.showWdl ?? defaultShowWdl

    const run: AnalysisRun = {
      ticket,
      startedAt: Date.now(),
      lines: new Map<number, EngineLine>(),
      maxDepth: 0,
      maxNodes: 0,
      timer: null,
      done: createDeferred<void>(),
    }
    this.run = run

    this.send(`setoption name MultiPV value ${multiPv}`)
    this.send(`setoption name UCI_ShowWDL value ${showWdl ? 'true' : 'false'}`)
    this.send(`position fen ${ticket.fen}`)
    this.send(buildGoCommand(ticket.options, defaultNodes))

    run.timer = setTimeout(() => this.handleAnalysisTimeout(run), analysisTimeoutMs)

    return run.done.promise
  }

  private handleAnalysisTimeout(run: AnalysisRun): void {
    if (this.run !== run) return
    this.finishRun(run, null, new EngineTimeoutError('A análise excedeu o tempo máximo.'))
    this.restartWorker()
  }

  private finishRun(run: AnalysisRun, analysis: EngineAnalysis | null, error: Error | null): void {
    if (run.timer) clearTimeout(run.timer)
    run.timer = null
    if (this.run === run) this.run = null
    this.settleTicket(run.ticket, analysis, error)
    run.done.resolve()
  }

  private settleTicket(
    ticket: AnalysisTicket,
    analysis: EngineAnalysis | null,
    error: Error | null,
  ): void {
    if (ticket.settled) return
    ticket.settled = true
    this.tickets = this.tickets.filter((item) => item !== ticket)
    if (error) ticket.deferred.reject(error)
    else if (analysis) ticket.deferred.resolve(analysis)
    else ticket.deferred.reject(new EngineWorkerError('Análise terminou sem resultado.'))
  }

  /**
   * Cancela a busca em andamento e tudo que estava na fila.
   *
   * Depois disto o `bestmove` que a engine ainda vai emitir é lixo: ele é
   * contado em `staleBestMoves` e descartado quando chegar.
   */
  private cancelInFlight(error: Error): void {
    const run = this.run
    if (run) {
      this.finishRun(run, null, error)
      if (this.worker) {
        this.staleBestMoves += 1
        this.post(this.worker, 'stop')
      }
    }
    for (const ticket of [...this.tickets]) {
      this.settleTicket(ticket, null, error)
    }
  }

  private waitForDrain(): Promise<void> {
    if (this.staleBestMoves === 0 || !this.worker) return Promise.resolve()
    const deferred = createDeferred<void>()
    this.drainWaiters.push(deferred)
    const timer = setTimeout(() => {
      // A engine ignorou o `stop`: reinicia em vez de travar a fila para sempre.
      this.restartWorker()
    }, this.config.stopDrainTimeoutMs)
    return deferred.promise.finally(() => clearTimeout(timer))
  }

  private releaseDrainWaiters(): void {
    const waiting = this.drainWaiters
    this.drainWaiters = []
    for (const deferred of waiting) deferred.resolve()
  }

  // -------------------------------------------------------- mensagens do worker

  private handleWorkerData(data: unknown): void {
    const text = extractEngineLine(data)
    if (text === null) return
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.length > 0) this.handleLine(trimmed)
    }
  }

  private handleLine(line: string): void {
    const message = parseUciLine(line)
    switch (message.type) {
      case 'uciok':
        this.resolveToken('uciok')
        return
      case 'readyok':
        this.resolveToken('readyok')
        return
      case 'info':
        // Info de uma busca cancelada não pode contaminar a busca seguinte.
        if (this.staleBestMoves > 0 || !this.run) return
        applyInfoToRun(this.run, message.info)
        return
      case 'bestmove':
        if (this.staleBestMoves > 0) {
          this.staleBestMoves -= 1
          if (this.staleBestMoves === 0) this.releaseDrainWaiters()
          return
        }
        if (!this.run) return
        this.finishRun(this.run, buildAnalysis(this.run, message.bestMove, message.ponder), null)
        return
      default:
        return
    }
  }

  private handleWorkerFailure(error: Error): void {
    this.cancelInFlight(error)
    this.rejectAllWaiters(error)
    this.restartWorker()
  }

  private restartWorker(): void {
    this.teardownWorker()
    if (this.disposed) return
    // O próximo `ensureReady` cria um worker novo e refaz o handshake.
    this.releaseDrainWaiters()
  }

  private teardownWorker(): void {
    const worker = this.worker
    this.worker = null
    this.ready = false
    this.staleBestMoves = 0
    this.rejectAllWaiters(new EngineWorkerError('Worker da engine reiniciado.'))
    this.releaseDrainWaiters()
    if (!worker) return
    worker.onmessage = null
    worker.onerror = null
    worker.terminate()
  }
}

// ------------------------------------------------------------------ auxiliares

/**
 * Monta o comando `go`.
 *
 * O projeto prefere orçamento de nós a profundidade fixa: nós dão custo estável
 * entre máquinas diferentes. Profundidade só entra quando pedida.
 */
export function buildGoCommand(options: AnalysisOptions, defaultNodes: number): string {
  const parts = ['go']
  if (options.depth !== undefined) parts.push('depth', String(options.depth))
  if (options.nodes !== undefined) parts.push('nodes', String(options.nodes))
  else if (options.depth === undefined) parts.push('nodes', String(defaultNodes))
  return parts.join(' ')
}

function applyInfoToRun(run: AnalysisRun, info: UciInfo): void {
  if (info.depth !== null) run.maxDepth = Math.max(run.maxDepth, info.depth)
  if (info.nodes !== null) run.maxNodes = Math.max(run.maxNodes, info.nodes)

  const hasScore = info.scoreCp !== null || info.mateIn !== null
  if (!hasScore || info.pv.length === 0) return

  const multiPv = info.multiPv ?? 1
  const line: EngineLine = {
    multiPv,
    scoreCp: info.scoreCp,
    mateIn: info.mateIn,
    pv: info.pv,
    depth: info.depth ?? 0,
    nodes: info.nodes ?? 0,
  }
  if (info.wdl) line.wdl = info.wdl
  run.lines.set(multiPv, line)
}

function buildAnalysis(
  run: AnalysisRun,
  bestMove: string | null,
  ponder: string | null,
): EngineAnalysis {
  const lines = [...run.lines.values()].sort((a, b) => a.multiPv - b.multiPv)
  return {
    fen: run.ticket.fen,
    turn: run.ticket.turn,
    depth: run.maxDepth,
    nodes: run.maxNodes,
    bestMoveUci: bestMove,
    ponderUci: ponder,
    lines,
    elapsedMs: Date.now() - run.startedAt,
  }
}
