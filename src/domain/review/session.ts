import { applyMove, type SquareName } from '@/lib/chess'
import type { ReviewCard, ReviewRating } from '@/domain/types'

/**
 * Máquina de estado pura de uma revisão espaçada.
 *
 * O card guarda a solução em UCI. O aluno joga os lances de índice PAR; os
 * ÍMPARES são a resposta do adversário e entram sozinhos. Erro não interrompe o
 * fluxo: mostra a solução e a nota vai para `again`, porque esconder o erro
 * derrota o propósito da revisão.
 */

export type ReviewPhase = 'resolvendo' | 'acertou' | 'errou'

export interface ReviewSessionState {
  card: ReviewCard
  /** Quantos lances da solução já foram aplicados. */
  step: number
  phase: ReviewPhase
  /** FEN da posição mostrada agora. */
  fen: string
  /** Lance errado que o aluno tentou, quando `phase` é 'errou'. */
  lanceErrado: string | null
  /** Verdadeiro enquanto o aluno não errou nenhuma vez. */
  semErro: boolean
}

export function createReviewSession(card: ReviewCard): ReviewSessionState {
  return {
    card,
    step: 0,
    phase: card.solutionUci.length === 0 ? 'acertou' : 'resolvendo',
    fen: card.fen,
    lanceErrado: null,
    semErro: true,
  }
}

function aplicarUci(fen: string, uci: string): string | null {
  const from = uci.slice(0, 2) as SquareName
  const to = uci.slice(2, 4) as SquareName
  const promotion = uci.length > 4 ? uci[4] : undefined
  const resultado = applyMove(fen, {
    from,
    to,
    promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
  })
  return resultado ? resultado.fenAfter : null
}

/**
 * Aplica a tentativa do aluno. Devolve um estado novo; nunca muta o anterior.
 *
 * Lance certo avança o passo e já responde pelo adversário. Lance errado leva a
 * `errou` sem alterar a posição, para o aluno ver o que tentou.
 */
export function submitReviewMove(state: ReviewSessionState, uci: string): ReviewSessionState {
  if (state.phase !== 'resolvendo') return state

  const esperado = state.card.solutionUci[state.step]
  if (uci !== esperado) {
    return { ...state, phase: 'errou', lanceErrado: uci, semErro: false }
  }

  let fen = aplicarUci(state.fen, esperado)
  if (!fen) {
    // Solução inconsistente com a posição: falha do dado, não do aluno.
    return { ...state, phase: 'errou', lanceErrado: uci, semErro: false }
  }

  let step = state.step + 1

  // Resposta do adversário entra automaticamente.
  const resposta = state.card.solutionUci[step]
  if (resposta) {
    const depois = aplicarUci(fen, resposta)
    if (depois) {
      fen = depois
      step += 1
    }
  }

  return {
    ...state,
    step,
    fen,
    phase: step >= state.card.solutionUci.length ? 'acertou' : 'resolvendo',
  }
}

/** Desistir mostra a solução e vale como erro para o agendamento. */
export function giveUpReview(state: ReviewSessionState): ReviewSessionState {
  if (state.phase !== 'resolvendo') return state
  return { ...state, phase: 'errou', semErro: false }
}

/** Notas disponíveis: só quem acertou sem erro pode dizer que foi fácil. */
export function availableRatings(state: ReviewSessionState): ReviewRating[] {
  if (state.phase === 'errou') return ['again']
  return state.semErro ? ['again', 'hard', 'good', 'easy'] : ['again', 'hard', 'good']
}

export const RATING_LABEL: Record<ReviewRating, string> = {
  again: 'Errei',
  hard: 'Difícil',
  good: 'Bom',
  easy: 'Fácil',
}

/** Posição inicial do card, para o botão "ver de novo". */
export function resetReview(state: ReviewSessionState): ReviewSessionState {
  return { ...createReviewSession(state.card), semErro: state.semErro }
}

/** Lance que o aluno deve jogar agora, para a dica e para o destaque. */
export function expectedMove(state: ReviewSessionState): string | null {
  return state.phase === 'resolvendo' ? (state.card.solutionUci[state.step] ?? null) : null
}
