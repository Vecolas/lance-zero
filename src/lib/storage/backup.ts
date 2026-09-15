/**
 * Backup local: exportar e importar tudo o que o usuário tem no navegador.
 *
 * O arquivo é JSON puro, sem compressão nem criptografia, para que o usuário
 * possa inspecionar o que está levando embora. A ida e a volta precisam
 * preservar IDs e o `SchedulerState` bit a bit — é o que garante que restaurar
 * um backup não zera o espaçamento das revisões.
 */
import type {
  DefinicaoDeRepertorio,
  Game,
  PlanoDoDia,
  PositionAnalysis,
  PuzzleAttempt,
  RepertorioDoAluno,
  ReviewCard,
  ReviewLog,
  SchedulerState,
  SkillMastery,
  SkillState,
  UserProfile,
  OpeningProgress,
} from '@/domain/types'
import { idDeRepertorioEhUsavel } from '@/domain/repertoire'
import { StorageError, UnsupportedBackupVersionError, type BackupRepository } from './repository'

/**
 * Versão do formato de arquivo. Independente da versão do schema IndexedDB.
 *
 * QUANDO ELA SOBE, e é a decisão que este número carrega: quando um arquivo
 * escrito por uma build antiga deixaria de ser lido CORRETAMENTE. Coleção
 * ACRESCENTADA não é esse caso — `readArray` lê campo ausente como lista vazia,
 * e lista vazia é a verdade sobre um aluno que nunca editou o repertório. Subir
 * a versão aqui faria `validateBackupFile` RECUSAR o backup de todo mundo que já
 * exportou, e recusar backup é a pior coisa que um arquivo de backup pode fazer.
 *
 * O que ela NÃO cobre, declarado: restaurar num app ANTIGO um arquivo escrito
 * por um app novo descarta em silêncio o que o antigo não conhece. Downgrade não
 * é suportado, e a versão do arquivo não é o lugar de fingir que é.
 */
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
  /**
   * Os repertórios que o aluno editou.
   *
   * Sem isto, restaurar um backup devolveria o repertório de FÁBRICA a quem
   * escreveu as próprias ideias — e devolveria calado, com os cards de revisão
   * inteiros apontando para nós que voltaram a ter texto de outra pessoa.
   */
  repertorios: RepertorioDoAluno[]
  /**
   * O degrau de aprendizagem por habilidade.
   *
   * SEM ISTO, RESTAURAR UM BACKUP APAGARIA O ENSINO. Todas as habilidades
   * voltariam a `unseen`, e o aluno que já sabia garfo receberia de novo a
   * lição de garfo — calado, parecendo decisão pedagógica em vez de perda de
   * dado. Pior ainda no sentido contrário: os cards de revisão VOLTAM (eles
   * estão no backup), e cards de tema `unseen` são exatamente a situação que
   * `precisaDeReensino` existe para tratar.
   *
   * A VERSÃO DO BACKUP NÃO SUBIU, e a escolha é deliberada: `validateBackupFile`
   * exige a versão EXATA, então subir para 2 faria o app recusar todo backup
   * que alguém já baixou. Como os campos novos são aditivos e `readArray`
   * devolve lista vazia para campo ausente, um arquivo antigo continua
   * importando — sem estágio, que é o estado correto de quem exportou antes de
   * o estágio existir.
   */
  skillStates: SkillState[]
  /**
   * Os planos já gerados, com as conclusões.
   *
   * É o que faz o ✓ atravessar uma troca de aparelho. Um backup sem eles
   * devolveria um histórico em que o aluno nunca concluiu nada.
   */
  planosDoDia: PlanoDoDia[]
  openingProgress?: OpeningProgress[]
}

export interface ImportCounts {
  profile: number
  games: number
  puzzleAttempts: number
  positionAnalyses: number
  reviewCards: number
  reviewLogs: number
  skillMastery: number
  repertorios: number
  skillStates: number
  planosDoDia: number
  openingProgress: number
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
  const [
    profile,
    games,
    puzzleAttempts,
    positionAnalyses,
    reviewCards,
    reviewLogs,
    skillMastery,
    repertorios,
    skillStates,
    planosDoDia,
    openingProgress,
  ] = await Promise.all([
    repo.getProfile(),
    repo.listGames(),
    repo.listPuzzleAttempts(),
    repo.listAllPositionAnalyses(),
    repo.listReviewCards(),
    repo.listReviewLogs(),
    repo.getSkillMastery(),
    repo.listRepertorios(),
    repo.getSkillStates(),
    // SEM TETO, de propósito. O histórico de planos é o que sustenta o ✓ ao
    // longo do tempo, e um `limit` aqui cortaria em silêncio os dias mais
    // antigos de um backup que o aluno acha completo.
    repo.listPlanosDoDia(),
    repo.listOpeningProgress(),
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
    repertorios,
    skillStates,
    planosDoDia,
    openingProgress,
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
  for (const repertorio of parsed.repertorios) {
    await repo.saveRepertorio(repertorio)
  }
  await repo.saveSkillStates(parsed.skillStates)
  for (const plano of parsed.planosDoDia) {
    // `put` por `dateKey`: restaurar por cima de um dia que já existe
    // SUBSTITUI. É o comportamento certo aqui e não contradiz a fusão
    // monotônica de `@/domain/aprendizado/plano`: importar backup é uma
    // restauração deliberada do aluno, não uma reconciliação de duas cópias
    // vivas. Quem quer fundir usa sync; quem importa backup quer o arquivo.
    await repo.savePlanoDoDia(plano)
  }
  for (const progress of parsed.openingProgress ?? []) {
    await repo.saveOpeningProgress(progress)
  }

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
      repertorios: parsed.repertorios.length,
      skillStates: parsed.skillStates.length,
      planosDoDia: parsed.planosDoDia.length,
      openingProgress: parsed.openingProgress?.length ?? 0,
    },
  }
}

// ------------------------------------------------------------------ validação

type UnknownRecord = Record<string, unknown>

function invalid(message: string): StorageError {
  return new StorageError('formato-invalido', `Backup inválido: ${message}`)
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
 * Checa a definição de repertório que chegou no arquivo.
 *
 * O `id` é checado com `idDeRepertorioEhUsavel`, importado do domínio: um id com
 * `:` parte o id do card de revisão no lugar errado e o card nunca mais encontra
 * o próprio nó — falha muda, e do tipo que só aparece semanas depois, quando o
 * aluno percebe que aquele repertório parou de vir para revisão. Repetir a regra
 * do `:` aqui seria a segunda cópia dela.
 *
 * O resto é estrutural, como manda a política deste arquivo: campos e tipos. Se
 * um lance for ilegal ou faltar ideia, quem diz é `construirRepertorio`, que já
 * devolve conflito em vez de lançar — recusar o backup inteiro por causa de um
 * SAN torto tiraria do aluno TODO o resto dos dados dele.
 */
function validateDefinicaoDeRepertorio(value: unknown, where: string): DefinicaoDeRepertorio {
  if (!isRecord(value)) {
    throw invalid(`${where}.definicao deveria ser um objeto.`)
  }
  const onde = `${where}.definicao`
  const id = readString(value, 'id', onde)
  if (!idDeRepertorioEhUsavel(id)) {
    throw invalid(`${onde}.id não pode ser vazio nem conter ":".`)
  }
  readString(value, 'titulo', onde)
  readString(value, 'principio', onde)
  const lado = value['lado']
  if (lado !== 'w' && lado !== 'b') {
    throw invalid(`${onde}.lado deveria ser "w" ou "b".`)
  }
  if (!Array.isArray(value['habilidades'])) {
    throw invalid(`${onde}.habilidades deveria ser uma lista.`)
  }
  const linhas = value['linhas']
  if (!Array.isArray(linhas)) {
    throw invalid(`${onde}.linhas deveria ser uma lista.`)
  }
  linhas.forEach((linha, indice) => {
    const ondeLinha = `${onde}.linhas[${indice}]`
    if (!isRecord(linha)) {
      throw invalid(`${ondeLinha} deveria ser um objeto.`)
    }
    readString(linha, 'id', ondeLinha)
    const lances = linha['lances']
    if (!Array.isArray(lances)) {
      throw invalid(`${ondeLinha}.lances deveria ser uma lista.`)
    }
    lances.forEach((lance, posicao) => {
      const ondeLance = `${ondeLinha}.lances[${posicao}]`
      if (!isRecord(lance)) {
        throw invalid(`${ondeLance} deveria ser um objeto.`)
      }
      readString(lance, 'san', ondeLance)
      const ideia = lance['ideia']
      if (ideia !== undefined && typeof ideia !== 'string') {
        throw invalid(`${ondeLance}.ideia deveria ser texto quando existe.`)
      }
    })
  })
  return value as unknown as DefinicaoDeRepertorio
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

  const repertorios = readRecords(file, 'repertorios').map((item, index) => {
    const where = `repertorios[${index}]`
    readString(item, 'atualizadoEm', where)
    validateDefinicaoDeRepertorio(item['definicao'], where)
    return item as unknown as RepertorioDoAluno
  })

  const skillStates = readRecords(file, 'skillStates').map((item, index) => {
    const where = `skillStates[${index}]`
    readString(item, 'skillId', where)
    readString(item, 'stage', where)
    return item as unknown as SkillState
  })

  const planosDoDia = readRecords(file, 'planosDoDia').map((item, index) => {
    const where = `planosDoDia[${index}]`
    // `dateKey` é a CHAVE da store. Um plano sem ela seria gravado por cima do
    // plano `undefined` — uma linha que nenhum dia consegue ler de volta.
    readString(item, 'dateKey', where)
    if (!Array.isArray(item['activities'])) {
      throw invalid(`${where}.activities deveria ser uma lista.`)
    }
    return item as unknown as PlanoDoDia
  })

  const openingProgress = readRecords(file, 'openingProgress').map((item, index) => {
    const where = `openingProgress[${index}]`
    readString(item, 'openingId', where)
    readString(item, 'status', where)
    readString(item, 'lastPracticedAt', where)
    if (!Array.isArray(item['learnedNodeIds']) || !Array.isArray(item['trainedNodeIds']) || !Array.isArray(item['weakNodeIds'])) {
      throw invalid(`${where} deveria conter listas de nodes.`)
    }
    return item as unknown as OpeningProgress
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
    repertorios,
    skillStates,
    planosDoDia,
    openingProgress,
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
    throw new StorageError('formato-invalido', 'Backup inválido: não é um JSON válido.', {
      cause: error,
    })
  }
  return validateBackupFile(raw)
}
