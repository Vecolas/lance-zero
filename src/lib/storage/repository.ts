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
 *
 * `listReviewLogs` SAIU DAQUI e subiu para o contrato do dia a dia, com um
 * `limit` opcional — a tela de Revisar precisa do histórico e pede um número
 * pequeno. A regra acima não foi quebrada: continua não havendo varredura de
 * coleção inteira no caminho do dia a dia; ela só é possível, e é o backup que
 * a pede, omitindo o limite.
 */
export interface BackupRepository extends TrainingRepository {
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
    super('nao-encontrado', `Não encontrado: ${entity} "${key}".`)
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
      `Versão de backup não suportada: ${String(foundVersion)}. Esta versão do LanceZero lê a ${expectedVersion}.`,
    )
    this.name = 'UnsupportedBackupVersionError'
    this.foundVersion = foundVersion
    this.expectedVersion = expectedVersion
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
