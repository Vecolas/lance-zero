/**
 * Erros tipados da camada de engine.
 *
 * A UI precisa distinguir "cancelei de propósito" de "a engine travou": o
 * primeiro é silencioso, o segundo merece aviso ao usuário.
 */

/** Base comum para reconhecer qualquer falha originada na engine. */
export class EngineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngineError'
  }
}

/**
 * A análise foi descartada de propósito: `stop()`, uma análise mais nova
 * assumindo o lugar, ou `dispose()` durante a espera.
 */
export class AnalysisCancelledError extends EngineError {
  constructor(message = 'Análise cancelada.') {
    super(message)
    this.name = 'AnalysisCancelledError'
  }
}

/** A engine não respondeu dentro do orçamento de tempo; o worker é reiniciado. */
export class EngineTimeoutError extends EngineError {
  constructor(message = 'A engine não respondeu a tempo.') {
    super(message)
    this.name = 'EngineTimeoutError'
  }
}

/** Uso do provider depois de `dispose()`. */
export class EngineDisposedError extends EngineError {
  constructor(message = 'A engine já foi encerrada.') {
    super(message)
    this.name = 'EngineDisposedError'
  }
}

/** O worker emitiu um erro de execução. */
export class EngineWorkerError extends EngineError {
  constructor(message = 'Falha no worker da engine.') {
    super(message)
    this.name = 'EngineWorkerError'
  }
}
