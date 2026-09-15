import { identidadeDePosicao, START_FEN, type ChessGame } from '@/lib/chess'
import type { OpeningDefinition, OpeningProgress } from './index'

export type OpeningGameClassification =
  'opponent_deviation' | 'repertoire_mistake' | 'normal_transition' | 'opening_blunder'

export interface OpeningGameReview {
  openingId: string
  classification: OpeningGameClassification
  ply: number | null
  nodeId: string | null
  message: string
}

/**
 * Cruza uma partida real com o grafo autorado, sem chamar engine.
 * Um desvio do adversário encerra a abertura sem culpar o aluno; um lance do
 * aluno fora do repertório vira evidência de recuperação apenas se o node era
 * conhecido pelo curso.
 */
export function reviewOpeningGame(
  opening: OpeningDefinition,
  game: ChessGame,
  userColor: 'w' | 'b',
  progress?: OpeningProgress,
): OpeningGameReview {
  if (game.startFen !== START_FEN || opening.side !== (userColor === 'w' ? 'white' : 'black')) {
    return {
      openingId: opening.id,
      classification: 'normal_transition',
      ply: null,
      nodeId: null,
      message: 'A partida não começa numa posição coberta por este curso.',
    }
  }

  let nodeId = opening.rootNodeId
  for (const ply of game.plies) {
    const node = opening.graph.get(nodeId)
    const edge = node?.outgoingMoves.find((candidate) => candidate.uci === ply.uci)
    if (!node || !edge) {
      const isUserMove = ply.color === userColor
      if (isUserMove && node) {
        const known = progress === undefined || progress.learnedNodeIds.includes(node.id)
        if (!known && node.outgoingMoves.length > 0) {
          return {
            openingId: opening.id,
            classification: 'normal_transition',
            ply: ply.index,
            nodeId: node.id,
            message:
              'Essa resposta ainda não faz parte do seu repertório; não é tratada como esquecimento.',
          }
        }
        return {
          openingId: opening.id,
          classification:
            known && node.outgoingMoves.length > 0 ? 'repertoire_mistake' : 'opening_blunder',
          ply: ply.index,
          nodeId: node.id,
          message:
            known && node.outgoingMoves.length > 0
              ? 'Você saiu do repertório numa posição já ensinada; essa posição entrou em reforço.'
              : 'O lance encerrou a abertura antes de uma transição saudável para o meio-jogo.',
        }
      }
      return {
        openingId: opening.id,
        classification: 'opponent_deviation',
        ply: ply.index,
        nodeId: node?.id ?? null,
        message:
          'O adversário saiu da linha ensinada; agora os princípios importam mais que a memorização.',
      }
    }
    nodeId = edge.nextNodeId
  }

  return {
    openingId: opening.id,
    classification: 'normal_transition',
    ply: null,
    nodeId,
    message: 'A partida permaneceu na linha ensinada até o ponto de transição para o meio-jogo.',
  }
}

/** Registra só evidência de erro em node já aprendido; não cria domínio por acidente. */
export function registerOpeningGameEvidence(
  progress: OpeningProgress,
  review: OpeningGameReview,
  now: string,
): OpeningProgress {
  if (review.classification !== 'repertoire_mistake' || review.nodeId === null) return progress
  const weakNodeIds = progress.weakNodeIds.includes(review.nodeId)
    ? progress.weakNodeIds
    : [...progress.weakNodeIds, review.nodeId]
  return {
    ...progress,
    weakNodeIds,
    status: 'consolidating',
    lastPracticedAt: now,
  }
}

export function openingNodeIdFromFen(fen: string): string {
  return identidadeDePosicao(fen)
}
