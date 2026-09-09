/**
 * Fronteira de persistência.
 *
 * O contrato `TrainingRepository` mora em `@/domain/types` e é reexportado
 * aqui para que páginas e serviços importem armazenamento de um lugar só.
 * Nada acima desta camada deve conhecer IndexedDB.
 */
import type {
  Game,
  GameQuery,
  PositionAnalysis,
  PuzzleAttempt,
  ReviewCard,
  ReviewLog,
  SkillMastery,
  TrainingRepository,
  UserProfile,
} from '@/domain/types'

export type {
  Game,
  GameQuery,
  PositionAnalysis,
  PuzzleAttempt,
  ReviewCard,
  ReviewLog,
  SkillMastery,
  TrainingRepository,
  UserProfile,
}

/**
 * Contrato adicional exigido pelo backup.
 *
 * `TrainingRepository` é o que a aplicação usa no dia a dia e não precisa
 * varrer coleções inteiras. Exportar e importar precisa, então o backup pede
 * este contrato mais largo em vez de alargar o contrato do domínio.
 */
export interface BackupRepository extends TrainingRepository {
  listReviewLogs(): Promise<ReviewLog[]>
  listAllPositionAnalyses(): Promise<PositionAnalysis[]>
}

export type StorageErrorCode =
  | 'nao-encontrado'
  | 'formato-invalido'
  | 'versao-nao-suportada'
  | 'indexeddb-indisponivel'
  | 'falha-na-transacao'

/** Erro base da camada de armazenamento. Sempre carrega um código estável. */
export class StorageError extends Error {
  readonly code: StorageErrorCode

  constructor(code: StorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'StorageError'
    this.code = code
    if (options && 'cause' in options) {
      this.cause = options.cause
    }
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Registro pedido pelo id e ausente. */
export class NotFoundError extends StorageError {
  readonly entity: string
  readonly key: string

  constructor(entity: string, key: string) {
    super('nao-encontrado', `Nao encontrado: ${entity} "${key}".`)
    this.name = 'NotFoundError'
    this.entity = entity
    this.key = key
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Arquivo de backup com versão que esta build não sabe ler. */
export class UnsupportedBackupVersionError extends StorageError {
  readonly foundVersion: unknown
  readonly expectedVersion: number

  constructor(foundVersion: unknown, expectedVersion: number) {
    super(
      'versao-nao-suportada',
      `Versao de backup nao suportada: ${String(foundVersion)}. Esperada: ${expectedVersion}.`,
    )
    this.name = 'UnsupportedBackupVersionError'
    this.foundVersion = foundVersion
    this.expectedVersion = expectedVersion
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
