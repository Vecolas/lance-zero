/**
 * Superfície pública da camada de engine.
 *
 * `worker-factory` fica de fora de propósito: ele toca `Worker` e deve ser
 * importado sob demanda, no momento em que a engine é realmente necessária.
 */

export type {
  AnalysisOptions,
  EngineAnalysis,
  EngineLine,
  EngineProvider,
  EngineTurn,
  EngineWdl,
} from './types'

export {
  AnalysisCancelledError,
  EngineDisposedError,
  EngineError,
  EngineTimeoutError,
  EngineWorkerError,
} from './errors'

export {
  normalizeScoreToWhite,
  normalizeWdlToWhite,
  parseBestMove,
  parseInfoLine,
  parseUciLine,
  turnFromFen,
  type UciBestMove,
  type UciInfo,
  type UciMessage,
} from './uci'

export {
  DEFAULT_ENGINE_CONFIG,
  StockfishProvider,
  buildGoCommand,
  extractEngineLine,
  type EngineConfig,
  type StockfishProviderInit,
} from './stockfish-provider'
