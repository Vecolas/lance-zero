/**
 * Backup local: exportar e importar tudo o que o usuário tem no navegador.
 *
 * O arquivo é JSON puro, sem compressão nem criptografia, para que o usuário
 * possa inspecionar o que está levando embora. A ida e a volta precisam
 * preservar IDs e o `SchedulerState` bit a bit — é o que garante que restaurar
 * um backup não zera o espaçamento das revisões.
 */
import type {
  Game,
  PositionAnalysis,
  PuzzleAttempt,
  ReviewCard,
  ReviewLog,
  SchedulerState,
  SkillMastery,
  UserProfile,
} from '@/domain/types'
import { StorageError, UnsupportedBackupVersionError, type BackupRepository } from './repository'

/** Versão do formato de arquivo. Independente da versão do schema IndexedDB. */
export const BACKUP_VERSION = 1

export interface BackupFile {
  version: number
  exportedAt: string
  profile: UserProfile | null
  games: Game[]
  puzzleAttempts: PuzzleAttempt[]
  positionAnalyses: PositionAnalysis[]
  reviewCards: ReviewCard[]
  reviewLogs: ReviewLog[]
  skillMastery: SkillMastery[]
}

export interface ImportCounts {
  profile: number
  games: number
  puzzleAttempts: number
  positionAnalyses: number
  reviewCards: number
  reviewLogs: number
  skillMastery: number
}

export interface ImportResult {
  version: number
  exportedAt: string
  imported: ImportCounts
}

/** Lê todas as coleções e monta o arquivo. O relógio entra por parâmetro. */
export async function exportBackup(
  repo: BackupRepository,
  now: Date = new Date(),
): Promise<BackupFile> {
  const [profile, games, puzzleAttempts, positionAnalyses, reviewCards, reviewLogs, skillMastery] =
    await Promise.all([
      repo.getProfile(),
      repo.listGames(),
      repo.listPuzzleAttempts(),
      repo.listAllPositionAnalyses(),
      repo.listReviewCards(),
      repo.listReviewLogs(),
      repo.getSkillMastery(),
    ])

  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    profile,
    games,
    puzzleAttempts,
    positionAnalyses,
    reviewCards,
    reviewLogs,
    skillMastery,
  }
}

/**
 * Valida e grava um arquivo de backup.
 *
 * A validação inteira acontece antes da primeira escrita: um arquivo
 * corrompido não pode deixar o banco pela metade.
 */
export async function importBackup(repo: BackupRepository, file: unknown): Promise<ImportResult> {
  const parsed = validateBackupFile(file)

  if (parsed.profile) {
    await repo.saveProfile(parsed.profile)
  }
  for (const game of parsed.games) {
    await repo.saveGame(game)
  }
  for (const attempt of parsed.puzzleAttempts) {
    await repo.savePuzzleAttempt(attempt)
  }
  await repo.savePositionAnalyses(parsed.positionAnalyses)
  for (const card of parsed.reviewCards) {
    await repo.saveReviewCard(card)
  }
  for (const log of parsed.reviewLogs) {
    await repo.saveReviewLog(log)
  }
  await repo.saveSkillMastery(parsed.skillMastery)

  return {
    version: parsed.version,
    exportedAt: parsed.exportedAt,
    imported: {
      profile: parsed.profile ? 1 : 0,
      games: parsed.games.length,
      puzzleAttempts: parsed.puzzleAttempts.length,
      positionAnalyses: parsed.positionAnalyses.length,
      reviewCards: parsed.reviewCards.length,
      reviewLogs: parsed.reviewLogs.length,
      skillMastery: parsed.skillMastery.length,
    },
  }
}

// ------------------------------------------------------------------ validação

type UnknownRecord = Record<string, unknown>

function invalid(message: string): StorageError {
  return new StorageError('formato-invalido', `Backup invalido: ${message}`)
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(record: UnknownRecord, field: string, where: string): string {
  const value = record[field]
  if (typeof value !== 'string') {
    throw invalid(`${where}.${field} deveria ser texto.`)
  }
  return value
}

function readNumber(record: UnknownRecord, field: string, where: string): number {
  const value = record[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalid(`${where}.${field} deveria ser numero.`)
  }
  return value
}

function readArray(root: UnknownRecord, field: string): unknown[] {
  const value = root[field]
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    throw invalid(`${field} deveria ser uma lista.`)
  }
  return value
}

function readRecords(root: UnknownRecord, field: string): UnknownRecord[] {
  return readArray(root, field).map((item, index) => {
    if (!isRecord(item)) {
      throw invalid(`${field}[${index}] deveria ser um objeto.`)
    }
    return item
  })
}

/**
 * Checa que o estado do escalonador chegou completo.
 *
 * O valor é repassado sem recalcular nada: reagendar no import destruiria o
 * histórico de espaçamento do usuário.
 */
function validateSchedulerState(value: unknown, where: string): SchedulerState {
  if (!isRecord(value)) {
    throw invalid(`${where}.scheduler deveria ser um objeto.`)
  }
  const state = value['state']
  if (state !== 'new' && state !== 'learning' && state !== 'review' && state !== 'relearning') {
    throw invalid(`${where}.scheduler.state desconhecido.`)
  }
  const lastReviewAt = value['lastReviewAt']
  if (lastReviewAt !== null && typeof lastReviewAt !== 'string') {
    throw invalid(`${where}.scheduler.lastReviewAt deveria ser texto ou nulo.`)
  }
  return {
    stability: readNumber(value, 'stability', `${where}.scheduler`),
    difficulty: readNumber(value, 'difficulty', `${where}.scheduler`),
    elapsedDays: readNumber(value, 'elapsedDays', `${where}.scheduler`),
    scheduledDays: readNumber(value, 'scheduledDays', `${where}.scheduler`),
    reps: readNumber(value, 'reps', `${where}.scheduler`),
    lapses: readNumber(value, 'lapses', `${where}.scheduler`),
    state,
    lastReviewAt,
  }
}

/**
 * Valida o envelope e todas as coleções.
 *
 * A validação é estrutural, não semântica: campos obrigatórios e tipos. Ela
 * existe para recusar arquivo de outra ferramenta, não para julgar o conteúdo
 * de xadrez.
 */
export function validateBackupFile(file: unknown): BackupFile {
  if (!isRecord(file)) {
    throw invalid('o arquivo deveria ser um objeto JSON.')
  }

  const version = file['version']
  if (typeof version !== 'number' || version !== BACKUP_VERSION) {
    throw new UnsupportedBackupVersionError(version, BACKUP_VERSION)
  }

  const exportedAt = file['exportedAt']
  if (typeof exportedAt !== 'string' || Number.isNaN(Date.parse(exportedAt))) {
    throw invalid('exportedAt deveria ser uma data ISO-8601.')
  }

  const rawProfile = file['profile']
  let profile: UserProfile | null = null
  if (rawProfile !== null && rawProfile !== undefined) {
    if (!isRecord(rawProfile)) {
      throw invalid('profile deveria ser um objeto ou nulo.')
    }
    readString(rawProfile, 'id', 'profile')
    readNumber(rawProfile, 'estimatedRating', 'profile')
    profile = rawProfile as unknown as UserProfile
  }

  const games = readRecords(file, 'games').map((item, index) => {
    readString(item, 'id', `games[${index}]`)
    readString(item, 'pgn', `games[${index}]`)
    readString(item, 'source', `games[${index}]`)
    return item as unknown as Game
  })

  const puzzleAttempts = readRecords(file, 'puzzleAttempts').map((item, index) => {
    readString(item, 'id', `puzzleAttempts[${index}]`)
    readString(item, 'puzzleId', `puzzleAttempts[${index}]`)
    return item as unknown as PuzzleAttempt
  })

  const positionAnalyses = readRecords(file, 'positionAnalyses').map((item, index) => {
    readString(item, 'gameId', `positionAnalyses[${index}]`)
    readNumber(item, 'ply', `positionAnalyses[${index}]`)
    return item as unknown as PositionAnalysis
  })

  const reviewCards = readRecords(file, 'reviewCards').map((item, index) => {
    const where = `reviewCards[${index}]`
    readString(item, 'id', where)
    readString(item, 'fen', where)
    readString(item, 'dueAt', where)
    readString(item, 'createdAt', where)
    if (!Array.isArray(item['skillIds'])) {
      throw invalid(`${where}.skillIds deveria ser uma lista.`)
    }
    if (!Array.isArray(item['solutionUci'])) {
      throw invalid(`${where}.solutionUci deveria ser uma lista.`)
    }
    validateSchedulerState(item['scheduler'], where)
    return item as unknown as ReviewCard
  })

  const reviewLogs = readRecords(file, 'reviewLogs').map((item, index) => {
    readString(item, 'cardId', `reviewLogs[${index}]`)
    readString(item, 'reviewedAt', `reviewLogs[${index}]`)
    return item as unknown as ReviewLog
  })

  const skillMastery = readRecords(file, 'skillMastery').map((item, index) => {
    readString(item, 'skillId', `skillMastery[${index}]`)
    readNumber(item, 'mastery', `skillMastery[${index}]`)
    return item as unknown as SkillMastery
  })

  return {
    version,
    exportedAt,
    profile,
    games,
    puzzleAttempts,
    positionAnalyses,
    reviewCards,
    reviewLogs,
    skillMastery,
  }
}

/** Serializa o backup como texto pronto para download. */
export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file, null, 2)
}

/** Lê o texto de um arquivo escolhido pelo usuário. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new StorageError('formato-invalido', 'Backup invalido: nao e um JSON valido.', {
      cause: error,
    })
  }
  return validateBackupFile(raw)
}
