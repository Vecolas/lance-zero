/**
 * Helpers puros de card de revisão.
 *
 * Nada aqui toca armazenamento nem relógio implícito: a data de referência
 * entra sempre por parâmetro.
 */
import type { ReviewCard, ReviewCardKind, ReviewRating, SkillId } from '@/domain/types'
import { createSchedulerState, schedule } from './scheduler'

export interface CreateReviewCardInput {
  id: string
  kind: ReviewCardKind
  skillIds: SkillId[]
  fen: string
  solutionUci: string[]
  prompt: string
  sourceGameId?: string
  sourcePly?: number
}

/**
 * Cria um card novo.
 *
 * Um card recém-criado já nasce vencido: o primeiro contato acontece na mesma
 * sessão em que o erro apareceu, e só depois o FSRS assume o espaçamento.
 */
export function createReviewCard(input: CreateReviewCardInput, now: Date): ReviewCard {
  const timestamp = now.toISOString()
  const card: ReviewCard = {
    id: input.id,
    kind: input.kind,
    skillIds: [...input.skillIds],
    fen: input.fen,
    solutionUci: [...input.solutionUci],
    prompt: input.prompt,
    createdAt: timestamp,
    dueAt: timestamp,
    scheduler: createSchedulerState(now),
  }
  if (input.sourceGameId !== undefined) {
    card.sourceGameId = input.sourceGameId
  }
  if (input.sourcePly !== undefined) {
    card.sourcePly = input.sourcePly
  }
  return card
}

/** Devolve um novo card com o estado do escalonador avançado. Não muta a entrada. */
export function applyReview(card: ReviewCard, rating: ReviewRating, now: Date): ReviewCard {
  const result = schedule(card.scheduler, rating, now)
  return { ...card, dueAt: result.dueAt, scheduler: result.state }
}

/** Um card está vencido quando `dueAt` já passou (ou é exatamente agora). */
export function isDue(card: ReviewCard, now: Date): boolean {
  const dueAt = Date.parse(card.dueAt)
  if (Number.isNaN(dueAt)) {
    return false
  }
  return dueAt <= now.getTime()
}

/** Ordena por vencimento crescente; empates caem no `id` para ser determinístico. */
export function byDueAtAsc(a: ReviewCard, b: ReviewCard): number {
  if (a.dueAt === b.dueAt) {
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  }
  return a.dueAt < b.dueAt ? -1 : 1
}
