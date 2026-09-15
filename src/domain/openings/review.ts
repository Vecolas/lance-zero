import type { ReviewCard } from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import type { OpeningDefinition, OpeningProgress } from './index'

/** Cria revisões somente para nodes que o aluno já percorreu no Aprender. */
export function openingReviewCards(opening: OpeningDefinition, progress: OpeningProgress, now: Date): ReviewCard[] {
  return progress.learnedNodeIds.flatMap((nodeId) => {
    const node = opening.graph.get(nodeId)
    const solution = node?.outgoingMoves.find((edge) => edge.role === 'main') ?? node?.outgoingMoves[0]
    if (!node || !solution) return []
    return [createReviewCard({
      id: `opening:${opening.id}:${node.id}`,
      kind: 'repertorio',
      skillIds: ['opening.development', 'opening.center'],
      fen: node.fen,
      solutionUci: [solution.uci],
      prompt: 'Qual decisão do repertório faz sentido nesta posição?',
    }, now)]
  })
}
