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
  /**
   * O QUE foi jogado no desvio, e o que o repertório previa.
   *
   * Eles existem para a seção "Das suas partidas" (plano VNext §36) não ter de
   * reandar a partida por fora: duas travessias do mesmo grafo são duas
   * respostas para a mesma pergunta, e a segunda envelhece sozinha.
   *
   * `null` quando a partida não desviou — e aí não há o que comparar.
   */
  jogadoUci: string | null
  /** O lance do repertório naquele nó. `null` quando o nó é folha. */
  esperadoUci: string | null
  /** De quem foi o lance que saiu da linha. `null` quando não houve desvio. */
  autorDoDesvio: 'aluno' | 'adversario' | null
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
      jogadoUci: null,
      esperadoUci: null,
      autorDoDesvio: null,
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
            jogadoUci: ply.uci,
            esperadoUci: lanceDoRepertorioNoNo(node),
            autorDoDesvio: 'aluno',
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
          jogadoUci: ply.uci,
          esperadoUci: lanceDoRepertorioNoNo(node),
          autorDoDesvio: 'aluno',
        }
      }
      return {
        openingId: opening.id,
        classification: 'opponent_deviation',
        ply: ply.index,
        nodeId: node?.id ?? null,
        message:
          'O adversário saiu da linha ensinada; agora os princípios importam mais que a memorização.',
        jogadoUci: ply.uci,
        esperadoUci: node ? lanceDoRepertorioNoNo(node) : null,
        autorDoDesvio: 'adversario',
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
    jogadoUci: null,
    esperadoUci: null,
    autorDoDesvio: null,
  }
}

/**
 * O lance que o repertório prevê num nó.
 *
 * A PRINCIPAL PRIMEIRO, e o primeiro dos demais como recurso. É a mesma escolha
 * que `openingReviewCards` faz — e ela mora aqui para as duas não divergirem no
 * dia em que alguém mudar só uma.
 */
function lanceDoRepertorioNoNo(node: { outgoingMoves: readonly { uci: string; role: string }[] }) {
  const principal = node.outgoingMoves.find((edge) => edge.role === 'main')
  return principal?.uci ?? node.outgoingMoves[0]?.uci ?? null
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
