import type { OpeningDefinition, OpeningProgress } from '@/domain/openings'
import { openingReviewCards } from '@/domain/openings/review'
import type { TrainingRepository } from '@/domain/types'

/** Semeia cards de abertura sem jamais reiniciar um scheduler existente. */
export async function seedOpeningReviewCards(
  repo: TrainingRepository,
  opening: OpeningDefinition,
  progress: OpeningProgress,
  now: Date,
): Promise<number> {
  const existing = new Set((await repo.listReviewCards()).map((card) => card.id))
  const candidates = openingReviewCards(opening, progress, now).filter(
    (card) => !existing.has(card.id),
  )
  for (const card of candidates) await repo.saveReviewCard(card)
  return candidates.length
}
