import { describe, expect, it } from 'vitest'
import { createReviewSessionV2, groupIntoPedagogicalReviewItems } from '@/domain/review/planner-v2'
import { createReviewCard } from '@/lib/fsrs/cards'
import type { ReviewCard } from '@/domain/types'

const NOW = new Date('2026-09-15T12:00:00.000Z')

function card(id: string, kind: ReviewCard['kind'], skill = 'opening.center'): ReviewCard {
  return createReviewCard(
    {
      id,
      kind,
      skillIds: [skill as never],
      fen: '8/8/8/8/8/8/8/K6k w - - 0 1',
      solutionUci: ['a1a2'],
      prompt: id,
    },
    NOW,
  )
}

describe('Review Planner V2', () => {
  it('agrupa nodes da mesma abertura em uma unidade com passos internos', () => {
    const cards = Array.from({ length: 8 }, (_, index) => card(`opening:italiana:node-${index}`, 'repertorio'))
    const items = groupIntoPedagogicalReviewItems(cards, NOW)

    expect(items).toHaveLength(1)
    expect(items[0]?.steps).toHaveLength(7)
  })

  it('conta uma abertura agrupada como um item, não como seus plies', () => {
    const cards = [
      ...Array.from({ length: 7 }, (_, index) => card(`opening:italiana:node-${index}`, 'repertorio')),
      card('final:oposicao:1', 'final', 'endgame.opposition'),
      card('tactic:fork:1', 'posicao-exata', 'tactics.fork'),
    ]
    const session = createReviewSessionV2(cards, { now: NOW, targetItemCount: 20 })

    expect(session.items).toHaveLength(3)
    expect(session.items.find((item) => item.kind === 'opening')?.steps).toHaveLength(7)
    expect(session.targetItemCount).toBe(3)
  })

  it('não inventa itens quando o pool vencido é menor que o alvo', () => {
    const session = createReviewSessionV2(
      [card('tactic:fork:1', 'posicao-exata', 'tactics.fork'), card('final:oposicao:1', 'final', 'endgame.opposition')],
      { now: NOW, targetItemCount: 20 },
    )

    expect(session.targetItemCount).toBe(2)
    expect(session.items).toHaveLength(2)
  })

  it('intercala categorias disponíveis sem rotação fixa', () => {
    const cards = [
      ...Array.from({ length: 4 }, (_, index) => card(`opening:a:${index}`, 'repertorio')),
      ...Array.from({ length: 2 }, (_, index) => card(`final:b:${index}`, 'final', 'endgame.opposition')),
      ...Array.from({ length: 2 }, (_, index) => card(`tactic:c:${index}`, 'posicao-exata', 'tactics.fork')),
    ]
    const session = createReviewSessionV2(cards, { now: NOW, targetItemCount: 3 })
    const kinds = session.items.map((item) => item.kind)

    expect(kinds).toContain('opening')
    expect(new Set(kinds).size).toBeGreaterThan(1)
  })
})
