import type { ReviewCard } from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import { applyMove } from '@/lib/chess'
import type { OpeningDefinition, OpeningProgress } from './index'

/** Cria revisões somente para nodes que o aluno já percorreu no Aprender. */
export function openingReviewCards(
  opening: OpeningDefinition,
  progress: OpeningProgress,
  now: Date,
): ReviewCard[] {
  return progress.learnedNodeIds.flatMap((nodeId) => {
    const node = opening.graph.get(nodeId)
    const solution =
      node?.outgoingMoves.find((edge) => edge.role === 'main') ?? node?.outgoingMoves[0]
    if (!node || !solution) return []
    const cards: ReviewCard[] = [
      createReviewCard(
        {
          // ID legado: mudar este formato reiniciaria o scheduler de quem já estudou.
          id: `opening:${opening.id}:${node.id}`,
          kind: 'repertorio',
          skillIds: ['opening.development', 'opening.center'],
          fen: node.fen,
          solutionUci: [solution.uci],
          prompt: 'Qual decisão do repertório faz sentido nesta posição?',
        },
        now,
      ),
    ]

    for (const plan of opening.plans.filter((item) => item.positionNodeId === node.id)) {
      const arrow = plan.arrows?.[0]
      if (!arrow) continue
      const planMove = applyMove(node.fen, { from: arrow.from, to: arrow.to, promotion: 'q' })
      if (!planMove) continue
      cards.push(
        createReviewCard(
          {
            id: `opening:${opening.id}:${node.id}:plan:${plan.id}`,
            kind: 'conceito',
            skillIds: ['opening.development', 'opening.center'],
            fen: node.fen,
            solutionUci: [planMove.move.uci],
            prompt: `Qual lance coloca em prática o plano “${plan.name}”?`,
          },
          now,
        ),
      )
    }

    for (const mistake of opening.mistakes.filter((item) => item.nodeId === node.id)) {
      cards.push(
        createReviewCard(
          {
            id: `opening:${opening.id}:${node.id}:mistake:${mistake.id}`,
            kind: 'conceito',
            skillIds: ['opening.development', 'opening.king-safety'],
            fen: node.fen,
            solutionUci: [solution.uci],
            prompt: `Que princípio evita o erro ${mistake.moveSan}?`,
          },
          now,
        ),
      )
    }

    for (const edge of node.outgoingMoves.filter(
      (item) => item.role === 'variation' || item.role === 'alternative',
    )) {
      cards.push(
        createReviewCard(
          {
            id: `opening:${opening.id}:${node.id}:branch:${edge.uci}`,
            kind: 'conceito',
            skillIds: ['opening.development', 'opening.center'],
            fen: node.fen,
            solutionUci: [edge.uci],
            prompt: `Qual alternativa estudada também funciona nesta posição?`,
          },
          now,
        ),
      )
    }
    return cards
  })
}
