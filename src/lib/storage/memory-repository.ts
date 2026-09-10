/**
 * Repositório em memória.
 *
 * Serve de fixture para as outras camadas (planner, puzzles, revisão de
 * partidas) e de implementação de referência do contrato: quando o
 * comportamento de memória e de IndexedDB divergem, o teste de contrato falha.
 *
 * Pré-condição das datas que o próprio app gera (`dueAt`, `createdAt`,
 * `attemptedAt`): são sempre ISO-8601 em UTC, o que torna a comparação textual
 * equivalente à comparação cronológica.
 *
 * `Game.playedAt` NÃO tem essa garantia — vem de importador e de backup
 * restaurado, e pode trazer offset. Por isso o recorte por data de partidas
 * compara instante, e não texto. A regra e o porquê estão em `./query`.
 */
import type {
  Game,
  GameQuery,
  PositionAnalysis,
  PuzzleAttempt,
  RepertorioDoAluno,
  ReviewCard,
  ReviewLog,
  SkillMastery,
  UserProfile,
} from '@/domain/types'
import type { BackupRepository } from './repository'
import {
  applyGameQuery,
  cloneJson,
  gameDedupeKey,
  positionAnalysisKey,
  selectDueCards,
  sortPositionAnalyses,
  sortPuzzleAttempts,
  sortRepertorios,
  sortReviewCards,
} from './query'

export class MemoryTrainingRepository implements BackupRepository {
  private profile: UserProfile | null = null
  private readonly games = new Map<string, Game>()
  private readonly puzzleAttempts = new Map<string, PuzzleAttempt>()
  private readonly positionAnalyses = new Map<string, PositionAnalysis>()
  private readonly reviewCards = new Map<string, ReviewCard>()
  private readonly reviewLogs: ReviewLog[] = []
  private readonly skillMastery = new Map<string, SkillMastery>()
  private readonly repertorios = new Map<string, RepertorioDoAluno>()

  async getProfile(): Promise<UserProfile | null> {
    return this.profile ? cloneJson(this.profile) : null
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    this.profile = cloneJson(profile)
  }

  /**
   * Grava a partida deduplicando por origem.
   *
   * Quando já existe uma partida com o mesmo `source` + `sourceGameId`, o
   * conteúdo é substituído mas o `id` original é preservado: análises e cards
   * de revisão já apontam para ele e não podem virar referências órfãs.
   */
  async saveGame(game: Game): Promise<void> {
    const key = gameDedupeKey(game)
    if (key !== null) {
      for (const existing of this.games.values()) {
        if (gameDedupeKey(existing) === key && existing.id !== game.id) {
          this.games.set(existing.id, { ...cloneJson(game), id: existing.id })
          return
        }
      }
    }
    this.games.set(game.id, cloneJson(game))
  }

  async listGames(query?: GameQuery): Promise<Game[]> {
    return applyGameQuery([...this.games.values()], query).map((game) => cloneJson(game))
  }

  async savePuzzleAttempt(attempt: PuzzleAttempt): Promise<void> {
    this.puzzleAttempts.set(attempt.id, cloneJson(attempt))
  }

  async listPuzzleAttempts(limit?: number): Promise<PuzzleAttempt[]> {
    return sortPuzzleAttempts([...this.puzzleAttempts.values()], limit).map((item) =>
      cloneJson(item),
    )
  }

  async savePositionAnalyses(items: PositionAnalysis[]): Promise<void> {
    for (const item of items) {
      this.positionAnalyses.set(positionAnalysisKey(item), cloneJson(item))
    }
  }

  async listPositionAnalyses(gameId: string): Promise<PositionAnalysis[]> {
    const items = [...this.positionAnalyses.values()].filter((item) => item.gameId === gameId)
    return sortPositionAnalyses(items).map((item) => cloneJson(item))
  }

  async listAllPositionAnalyses(): Promise<PositionAnalysis[]> {
    return [...this.positionAnalyses.values()].map((item) => cloneJson(item))
  }

  async getDueCards(now: Date): Promise<ReviewCard[]> {
    return selectDueCards([...this.reviewCards.values()], now).map((card) => cloneJson(card))
  }

  async listReviewCards(): Promise<ReviewCard[]> {
    return sortReviewCards([...this.reviewCards.values()]).map((card) => cloneJson(card))
  }

  async saveReviewCard(card: ReviewCard): Promise<void> {
    this.reviewCards.set(card.id, cloneJson(card))
  }

  async saveReviewLog(log: ReviewLog): Promise<void> {
    this.reviewLogs.push(cloneJson(log))
  }

  async listReviewLogs(): Promise<ReviewLog[]> {
    return this.reviewLogs.map((log) => cloneJson(log))
  }

  async getSkillMastery(): Promise<SkillMastery[]> {
    return [...this.skillMastery.values()].map((item) => cloneJson(item))
  }

  async saveSkillMastery(mastery: SkillMastery[]): Promise<void> {
    for (const item of mastery) {
      this.skillMastery.set(item.skillId, cloneJson(item))
    }
  }

  async listRepertorios(): Promise<RepertorioDoAluno[]> {
    return sortRepertorios([...this.repertorios.values()]).map((item) => cloneJson(item))
  }

  /** A chave é `definicao.id`: regravar o mesmo repertório substitui, não duplica. */
  async saveRepertorio(repertorio: RepertorioDoAluno): Promise<void> {
    this.repertorios.set(repertorio.definicao.id, cloneJson(repertorio))
  }

  /** Apaga tudo. Existe para os testes, não faz parte do contrato. */
  clear(): void {
    this.profile = null
    this.games.clear()
    this.puzzleAttempts.clear()
    this.positionAnalyses.clear()
    this.reviewCards.clear()
    this.reviewLogs.length = 0
    this.skillMastery.clear()
    this.repertorios.clear()
  }
}
