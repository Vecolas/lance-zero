/**
 * Adaptador sobre `ts-fsrs`.
 *
 * Traduz entre o `SchedulerState` do domínio e o `Card` da biblioteca. O
 * relógio entra sempre por parâmetro: nenhuma função aqui chama `new Date()`,
 * para que o agendamento seja testável e determinístico.
 */
import { Rating, State, createEmptyCard, fsrs, generatorParameters } from 'ts-fsrs'
import type { Card, FSRSParameters, Grade } from 'ts-fsrs'
import type { ReviewRating, SchedulerState } from '@/domain/types'

/**
 * Configuração do escalonador.
 *
 * Todos os valores abaixo são heurísticas de produto, não constantes
 * científicas. Devem ser recalibrados quando houver telemetria real.
 *
 * - `requestRetention`: probabilidade de recordação alvo no vencimento.
 * - `maximumIntervalDays`: teto de um ano. Um padrão de xadrez que ficasse
 *   mais tempo fora de vista deixaria de ser treino e viraria arquivo.
 * - `enableFuzz`: desligado de propósito. Sem ruído aleatório o agendamento é
 *   reprodutível para o mesmo estado e o mesmo relógio.
 * - `enableShortTerm`: desligado. O LanceZero agenda em dias, não em minutos,
 *   e `SchedulerState` não guarda o passo de aprendizado da biblioteca.
 */
export const SCHEDULER_CONFIG = {
  requestRetention: 0.9,
  maximumIntervalDays: 365,
  enableFuzz: false,
  enableShortTerm: false,
} as const

/** Parâmetros já normalizados pela biblioteca. */
export const FSRS_PARAMETERS: FSRSParameters = generatorParameters({
  request_retention: SCHEDULER_CONFIG.requestRetention,
  maximum_interval: SCHEDULER_CONFIG.maximumIntervalDays,
  enable_fuzz: SCHEDULER_CONFIG.enableFuzz,
  enable_short_term: SCHEDULER_CONFIG.enableShortTerm,
})

const engine = fsrs(FSRS_PARAMETERS)

const RATING_TO_GRADE: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

const STATE_TO_DOMAIN: Record<State, SchedulerState['state']> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}

const STATE_FROM_DOMAIN: Record<SchedulerState['state'], State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

function toSchedulerState(card: Card): SchedulerState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_TO_DOMAIN[card.state],
    lastReviewAt: card.last_review ? card.last_review.toISOString() : null,
  }
}

/**
 * Reconstrói o `Card` da biblioteca a partir do nosso estado.
 *
 * `due` não participa do cálculo do FSRS (só `last_review` e `state` entram),
 * por isso usamos o relógio atual como preenchimento. `learning_steps` fica em
 * zero porque `enableShortTerm` está desligado.
 */
function toFsrsCard(state: SchedulerState, now: Date): Card {
  const lastReview = state.lastReviewAt ? new Date(state.lastReviewAt) : undefined
  return {
    due: lastReview ?? now,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    learning_steps: 0,
    reps: state.reps,
    lapses: state.lapses,
    state: STATE_FROM_DOMAIN[state.state],
    last_review: lastReview,
  }
}

/** Estado inicial de um card que nunca foi revisado. */
export function createSchedulerState(now: Date): SchedulerState {
  return toSchedulerState(createEmptyCard(now))
}

/** Aplica uma nota e devolve o novo estado junto do próximo vencimento. */
export function schedule(
  state: SchedulerState,
  rating: ReviewRating,
  now: Date,
): { state: SchedulerState; dueAt: string } {
  const { card } = engine.next(toFsrsCard(state, now), now, RATING_TO_GRADE[rating])
  return { state: toSchedulerState(card), dueAt: card.due.toISOString() }
}

/** Probabilidade estimada de recordação agora, 0..1. Uso interno de ranking. */
export function retrievability(state: SchedulerState, now: Date): number {
  return engine.get_retrievability(toFsrsCard(state, now), now, false)
}
