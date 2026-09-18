import type { ReviewCard, ReviewCardKind, ReviewRating } from '@/domain/types'
import type { RecallOutcome } from '@/domain/roadmap'

/**
 * Planeja unidades pedagógicas, não lances individuais.
 *
 * DECISÃO: cards FSRS continuam sendo a unidade de agendamento e evidência,
 * mas a sessão agrupa cards relacionados em um ReviewItem. Assim uma abertura
 * com vários nodes não monopoliza a fila nem faz o contador visual mentir.
 */

export type ReviewItemKind =
  'opening' | 'endgame' | 'tactic' | 'calculation' | 'game-error' | 'concept'

export interface ReviewStep {
  id: string
  card: ReviewCard
  position: number
}

export interface ReviewItem {
  id: string
  kind: ReviewItemKind
  learningObjectId: string
  dueAt: string
  priority: number
  steps: ReviewStep[]
  status: 'pending' | 'in_progress' | 'completed'
  outcome?: RecallOutcome
}

export interface ReviewItemResult {
  itemId: string
  outcome: RecallOutcome
  attempts: number
  hintsUsed: number
  completedAt: string
}

export interface RelearningSession {
  id: string
  sourceReviewItemId: string
  learningObjectId: string
  lessonId: string
  startedAt: string
  completedAt: string | null
  returnToReviewSessionId: string
}

export interface ReviewSessionV2 {
  id: string
  targetItemCount: number
  items: ReviewItem[]
  completedItemIds: string[]
  currentItemId: string | null
  generatedAt: string
  plannerVersion: 2
  seed: string
  status: 'active' | 'completed'
}

/**
 * Refina o agrupamento de um card, quando quem chama sabe mais que o planner.
 *
 * POR QUE NÃO RESOLVER AQUI: separar cards de abertura por RAMO exige ler o
 * conteúdo do curso, e o planner é domínio puro — ele não conhece a Italiana.
 * Quem chama conhece, e injeta.
 *
 * Devolver `null` mantém o agrupamento padrão. É isso que faz esta adição ser
 * inofensiva: sem resolvedor, nada muda.
 */
export type ResolvedorDeSubgrupo = (card: ReviewCard) => string | null

export interface ReviewPlannerInput {
  now: Date
  targetItemCount?: number
  seed?: string
  /** Gate V3: ausência de evidência não pode virar recuperação. */
  reviewEligible?: (card: ReviewCard) => boolean
  /**
   * Divide um grupo em subgrupos — hoje, abertura por ramo (plano VNext §45).
   *
   * SEM ELE, TODA A ITALIANA VIRA UM ITEM SÓ, e como `MAX_STEPS_PER_ITEM` é 7,
   * os cards além do sétimo simplesmente não entram na sessão. Eles continuam
   * vencidos e voltam depois — mas o aluno vê "1 item" onde há vinte posições, e
   * a fila não encolhe por mais que ele revise.
   */
  subgrupo?: ResolvedorDeSubgrupo
}

interface Group {
  key: string
  kind: ReviewItemKind
  learningObjectId: string
  cards: ReviewCard[]
}

const MAX_STEPS_PER_ITEM = 7
const MAX_CONSECUTIVE_CATEGORY = 2

function kindOf(card: ReviewCard): ReviewItemKind {
  if (card.kind === 'repertorio') return 'opening'
  if (card.kind === 'final') return 'endgame'
  if (card.kind === 'erro-de-partida') return 'game-error'
  if (card.kind === 'posicao-exata') return 'tactic'
  if (card.skillIds.some((skill) => skill.startsWith('calculation.'))) return 'calculation'
  return 'concept'
}

function groupKey(card: ReviewCard, kind: ReviewItemKind, subgrupo?: ResolvedorDeSubgrupo): string {
  if (kind === 'opening' || card.id.startsWith('opening:')) {
    const parts = card.id.split(':')
    const base = `opening:${parts[1] ?? card.id}`
    /*
      O SUBGRUPO REFINA, NUNCA SUBSTITUI. Ele é acrescentado ao id da abertura,
      então um resolvedor ausente ou que devolva `null` produz exatamente a
      chave de antes — e nenhuma sessão já gravada muda de forma.
    */
    const refinamento = subgrupo?.(card)
    return refinamento ? `${base}:${refinamento}` : base
  }
  if (kind === 'endgame') {
    return `endgame:${card.skillIds[0] ?? card.id}`
  }
  // Erros reais são evidência contextual: um erro por partida permanece um
  // item, enquanto táticas/conceitos podem compartilhar um pequeno conjunto.
  if (kind === 'game-error') return `game-error:${card.sourceGameId ?? card.id}`
  if (kind === 'tactic' || kind === 'calculation' || kind === 'concept') {
    return `${kind}:${card.skillIds[0] ?? card.id}`
  }
  return card.id
}

function dueUrgency(card: ReviewCard, now: Date): number {
  const due = Date.parse(card.dueAt)
  if (!Number.isFinite(due)) return 0
  return Math.max(0, Math.min(1, (now.getTime() - due) / (7 * 86_400_000)))
}

function cardScore(card: ReviewCard, now: Date): number {
  const scheduler = card.scheduler
  const weakness = Math.min(1, (scheduler.lapses + 1) / 5)
  const recurrence = Math.min(1, scheduler.reps === 0 ? 1 : scheduler.lapses / scheduler.reps)
  const urgency = dueUrgency(card, now)
  return 0.45 * urgency + 0.3 * weakness + 0.2 * recurrence + 0.05 * (1 / (scheduler.stability + 1))
}

function compareGroups(a: Group, b: Group, now: Date): number {
  const aScore = Math.max(...a.cards.map((card) => cardScore(card, now)))
  const bScore = Math.max(...b.cards.map((card) => cardScore(card, now)))
  if (aScore !== bScore) return bScore - aScore
  return a.key.localeCompare(b.key)
}

function chooseDiverse(groups: Group[], target: number, now: Date): Group[] {
  const remaining = [...groups].sort((a, b) => compareGroups(a, b, now))
  const selected: Group[] = []
  const categoryCap = Math.max(1, Math.ceil(target * 0.3))
  while (remaining.length > 0 && selected.length < target) {
    const last = selected.at(-1)?.kind
    const streak = selected.length > 1 && selected.at(-2)?.kind === last ? 2 : 0
    const counts = new Map<ReviewItemKind, number>()
    for (const item of selected) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)
    const hasOtherCategory = remaining.some((group) => group.kind !== last)
    const index = remaining.findIndex((group) => {
      if (selected.at(-1)?.learningObjectId === group.learningObjectId) return false
      if (streak >= MAX_CONSECUTIVE_CATEGORY && group.kind === last) return false
      if (hasOtherCategory && (counts.get(group.kind) ?? 0) >= categoryCap) return false
      return true
    })
    const chosen = remaining.splice(index < 0 ? 0 : index, 1)[0]
    if (chosen) selected.push(chosen)
  }
  return selected
}

export function groupIntoPedagogicalReviewItems(
  cards: readonly ReviewCard[],
  now: Date,
  subgrupo?: ResolvedorDeSubgrupo,
): ReviewItem[] {
  const groups = new Map<string, Group>()
  for (const card of cards) {
    const kind = kindOf(card)
    const key = groupKey(card, kind, subgrupo)
    const current = groups.get(key) ?? { key, kind, learningObjectId: key, cards: [] }
    current.cards.push(card)
    groups.set(key, current)
  }

  return [...groups.values()].map((group) => {
    const cardsDoItem = [...group.cards]
      .sort((a, b) => {
        const score = cardScore(b, now) - cardScore(a, now)
        return score !== 0 ? score : a.id.localeCompare(b.id)
      })
      .slice(0, MAX_STEPS_PER_ITEM)
    return {
      id: `review-item:${group.key}`,
      kind: group.kind,
      learningObjectId: group.learningObjectId,
      dueAt: cardsDoItem[0]?.dueAt ?? now.toISOString(),
      priority: cardsDoItem.reduce((sum, card) => sum + cardScore(card, now), 0),
      steps: cardsDoItem.map((card, position) => ({ id: card.id, card, position })),
      status: 'pending' as const,
    }
  })
}

export function createReviewSessionV2(
  cards: readonly ReviewCard[],
  {
    now,
    targetItemCount = 20,
    seed = now.toISOString(),
    reviewEligible = () => true,
    subgrupo,
  }: ReviewPlannerInput,
): ReviewSessionV2 {
  const eligibleCards = cards.filter(reviewEligible)
  const groups = new Map<string, Group>()
  for (const card of eligibleCards) {
    const kind = kindOf(card)
    const key = groupKey(card, kind, subgrupo)
    const current = groups.get(key) ?? { key, kind, learningObjectId: key, cards: [] }
    current.cards.push(card)
    groups.set(key, current)
  }
  const selectedGroups = chooseDiverse(
    [...groups.values()],
    Math.min(targetItemCount, groups.size),
    now,
  )
  const items = selectedGroups.map((group) => {
    const cardsDoItem = [...group.cards]
      .sort((a, b) => cardScore(b, now) - cardScore(a, now) || a.id.localeCompare(b.id))
      .slice(0, MAX_STEPS_PER_ITEM)
    return {
      id: `review-item:${group.key}`,
      kind: group.kind,
      learningObjectId: group.learningObjectId,
      dueAt: cardsDoItem[0]?.dueAt ?? now.toISOString(),
      priority: cardsDoItem.reduce((sum, card) => sum + cardScore(card, now), 0),
      steps: cardsDoItem.map((card, position) => ({ id: card.id, card, position })),
      status: 'pending' as const,
    }
  })
  return {
    id: `review-session:${seed}`,
    targetItemCount: items.length,
    items,
    completedItemIds: [],
    currentItemId: items[0]?.id ?? null,
    generatedAt: now.toISOString(),
    plannerVersion: 2,
    seed,
    status: items.length === 0 ? 'completed' : 'active',
  }
}

export function completeReviewItem(session: ReviewSessionV2, itemId: string): ReviewSessionV2 {
  if (session.completedItemIds.includes(itemId)) return session
  const completedItemIds = [...session.completedItemIds, itemId]
  const next = session.items.find((item) => !completedItemIds.includes(item.id))
  return {
    ...session,
    completedItemIds,
    currentItemId: next?.id ?? null,
    status: next ? 'active' : 'completed',
    items: session.items.map((item) =>
      item.id === itemId ? { ...item, status: 'completed' as const } : item,
    ),
  }
}

/** Converte o resultado pedagógico em nota FSRS sem chamar reaprendizado de acerto. */
export function ratingForRecallOutcome(outcome: RecallOutcome): ReviewRating {
  if (outcome === 'recalled') return 'good'
  if (outcome === 'recalled-with-hint') return 'hard'
  if (outcome === 'failed' || outcome === 'declared-forgotten') return 'again'
  // Reaprender é uma intervenção, não uma lembrança perfeita.
  return outcome === 'relearned' ? 'hard' : 'again'
}

export function setReviewItemOutcome(
  session: ReviewSessionV2,
  itemId: string,
  outcome: RecallOutcome,
): ReviewSessionV2 {
  return {
    ...session,
    items: session.items.map((item) => (item.id === itemId ? { ...item, outcome } : item)),
  }
}

export function reviewItemLabel(kind: ReviewItemKind): string {
  const labels: Record<ReviewItemKind, string> = {
    opening: 'Abertura',
    endgame: 'Final',
    tactic: 'Tática',
    calculation: 'Cálculo',
    'game-error': 'Erro de partida',
    concept: 'Conceito',
  }
  return labels[kind]
}

export function isReviewCardKind(kind: string): kind is ReviewCardKind {
  return ['posicao-exata', 'erro-de-partida', 'final', 'conceito', 'repertorio'].includes(kind)
}
