/**
 * Regras de leitura compartilhadas pelas implementações de repositório.
 *
 * Memória e IndexedDB precisam responder igual ao mesmo teste de contrato, e
 * a única forma barata de garantir isso é as duas chamarem as mesmas funções
 * puras de filtro e ordenação.
 */
import type { Game, GameQuery, PositionAnalysis, PuzzleAttempt, ReviewCard } from '@/domain/types'

/** Clona valores JSON puros para que o repositório nunca devolva referência viva. */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function compareDesc(a: string, b: string): number {
  if (a === b) {
    return 0
  }
  return a < b ? 1 : -1
}

/** Chave de deduplicação de importação. `null` quando a partida não tem origem externa. */
export function gameDedupeKey(game: Pick<Game, 'source' | 'sourceGameId'>): string | null {
  if (game.sourceGameId === undefined || game.sourceGameId === '') {
    return null
  }
  return `${game.source}:${game.sourceGameId}`
}

/** Filtra, ordena da mais recente para a mais antiga e aplica o limite. */
export function applyGameQuery(games: Game[], query?: GameQuery): Game[] {
  let result = games
  if (query?.source) {
    result = result.filter((game) => game.source === query.source)
  }
  if (query?.since) {
    const since = query.since
    result = result.filter((game) => game.playedAt >= since)
  }
  result = [...result].sort(
    (a, b) => compareDesc(a.playedAt, b.playedAt) || compareDesc(a.id, b.id),
  )
  if (query?.limit !== undefined) {
    result = result.slice(0, Math.max(0, query.limit))
  }
  return result
}

/** Tentativas da mais recente para a mais antiga. */
export function sortPuzzleAttempts(attempts: PuzzleAttempt[], limit?: number): PuzzleAttempt[] {
  const sorted = [...attempts].sort(
    (a, b) => compareDesc(a.attemptedAt, b.attemptedAt) || compareDesc(a.id, b.id),
  )
  return limit === undefined ? sorted : sorted.slice(0, Math.max(0, limit))
}

/** Análises de uma partida em ordem de lance. */
export function sortPositionAnalyses(items: PositionAnalysis[]): PositionAnalysis[] {
  return [...items].sort((a, b) => a.ply - b.ply)
}

/** Chave composta de uma análise de posição. */
export function positionAnalysisKey(item: Pick<PositionAnalysis, 'gameId' | 'ply'>): string {
  return `${item.gameId}#${item.ply}`
}

function compareReviewCards(a: ReviewCard, b: ReviewCard): number {
  if (a.dueAt !== b.dueAt) {
    return a.dueAt < b.dueAt ? -1 : 1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Cards vencidos até `now`, do mais atrasado para o menos atrasado. */
export function selectDueCards(cards: ReviewCard[], now: Date): ReviewCard[] {
  const limit = now.toISOString()
  return cards.filter((card) => card.dueAt <= limit).sort(compareReviewCards)
}

/** Todos os cards, ordenados por vencimento. */
export function sortReviewCards(cards: ReviewCard[]): ReviewCard[] {
  return [...cards].sort(compareReviewCards)
}
