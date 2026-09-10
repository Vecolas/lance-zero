/**
 * Máquina de estado de uma tentativa de puzzle. Pura: sem relógio, sem
 * aleatoriedade, sem React. Quem chama injeta `agora` e `thinkTimeMs`.
 *
 * A alternância vem do dataset: em `solutionUci`, os índices PARES são lances
 * do jogador e os ÍMPARES são a resposta do adversário. A resposta do
 * adversário é aplicada automaticamente logo depois do acerto do jogador.
 */

import { applyMove, normalizeUci, parseUci, positionStatus } from '@/lib/chess'
import type { PuzzleAttempt, SolvablePuzzle } from '@/domain/types'
import { MAX_HINT_LEVEL, type HintLevel } from './hints'

/**
 * Pesos e limiares da tentativa.
 *
 * São heurísticas de produto, a calibrar com dados reais de uso. Nenhum destes
 * números tem base empírica ainda.
 */
export const ATTEMPT_CONFIG = {
  /** Quantos lances errados o jogador pode dar antes da tentativa falhar. */
  maxErrosAntesDeFalhar: 2,
  /**
   * Aceita qualquer lance legal que dê mate, mesmo fora da linha do dataset.
   * O dump guarda uma linha só; recusar um mate correto seria mentir para o
   * jogador.
   */
  aceitarMateAlternativo: true,
} as const

export type AttemptStatus = 'em-andamento' | 'resolvido' | 'falhou'

export interface AttemptState {
  readonly solvable: SolvablePuzzle
  readonly status: AttemptStatus
  /** Posição atual no tabuleiro. */
  readonly currentFen: string
  /** Índice do próximo lance esperado do jogador em `solutionUci`. Sempre par. */
  readonly solutionIndex: number
  /** Lances aplicados desde `startFen`, incluindo as respostas automáticas. */
  readonly playedUci: readonly string[]
  /** Lances errados do jogador, em ordem. */
  readonly wrongMoves: readonly string[]
  /** Maior nível de dica já pedido: 0 a 3. */
  readonly hintsUsed: number
  /** Ainda sem dica e sem lance errado. */
  readonly firstTry: boolean
  readonly gaveUp: boolean
}

export function createAttemptState(solvable: SolvablePuzzle): AttemptState {
  return {
    solvable,
    status: 'em-andamento',
    currentFen: solvable.startFen,
    solutionIndex: 0,
    playedUci: [],
    wrongMoves: [],
    hintsUsed: 0,
    firstTry: true,
    gaveUp: false,
  }
}

export interface SubmitMoveResult {
  state: AttemptState
  /** `true` quando o lance do jogador foi aceito. */
  correto: boolean
  /** Resposta do adversário aplicada automaticamente, quando houve. */
  respostaDoAdversarioUci: string | null
  /** Preenchido quando o lance foi recusado, para a UI explicar. */
  motivo?: 'tentativa-encerrada' | 'formato-invalido' | 'lance-ilegal' | 'lance-errado'
}

function daMate(fen: string, uci: string): boolean {
  const entrada = parseUci(uci)
  if (entrada === null) return false
  const aplicado = applyMove(fen, entrada)
  return aplicado !== null && positionStatus(aplicado.fenAfter).isCheckmate
}

/**
 * Submete um lance do jogador.
 *
 * Acerto: aplica o lance e, se a linha continuar, aplica também a resposta do
 * adversário. Erro: registra e, passado o limite de erros, a tentativa falha.
 * Nunca lança — lance ilegal é entrada de usuário, não bug.
 */
export function submitMove(state: AttemptState, uci: string): SubmitMoveResult {
  if (state.status !== 'em-andamento') {
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'tentativa-encerrada' }
  }

  const lance = normalizeUci(uci)
  const entrada = parseUci(lance)
  if (entrada === null) {
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'formato-invalido' }
  }

  const esperado = state.solvable.solutionUci[state.solutionIndex]
  if (esperado === undefined) {
    // Não deveria acontecer: o estado vira 'resolvido' antes de acabar a linha.
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'tentativa-encerrada' }
  }

  const mateAlternativo =
    ATTEMPT_CONFIG.aceitarMateAlternativo && lance !== esperado && daMate(state.currentFen, lance)

  if (lance !== esperado && !mateAlternativo) {
    const aplicavel = applyMove(state.currentFen, entrada) !== null
    const wrongMoves = [...state.wrongMoves, lance]
    const excedeu = wrongMoves.length >= ATTEMPT_CONFIG.maxErrosAntesDeFalhar
    return {
      state: {
        ...state,
        wrongMoves,
        firstTry: false,
        status: excedeu ? 'falhou' : 'em-andamento',
      },
      correto: false,
      respostaDoAdversarioUci: null,
      motivo: aplicavel ? 'lance-errado' : 'lance-ilegal',
    }
  }

  const aplicado = applyMove(state.currentFen, entrada)
  if (aplicado === null) {
    // Solução do dataset ilegal na posição atual: dado podre, não erro do jogador.
    return { state, correto: false, respostaDoAdversarioUci: null, motivo: 'lance-ilegal' }
  }

  const playedUci = [...state.playedUci, lance]
  let fen = aplicado.fenAfter

  if (mateAlternativo || positionStatus(fen).isCheckmate) {
    return {
      state: {
        ...state,
        status: 'resolvido',
        currentFen: fen,
        playedUci,
        solutionIndex: state.solvable.solutionUci.length,
      },
      correto: true,
      respostaDoAdversarioUci: null,
    }
  }

  const indiceDaResposta = state.solutionIndex + 1
  const resposta = state.solvable.solutionUci[indiceDaResposta]

  if (resposta === undefined) {
    return {
      state: {
        ...state,
        status: 'resolvido',
        currentFen: fen,
        playedUci,
        solutionIndex: indiceDaResposta,
      },
      correto: true,
      respostaDoAdversarioUci: null,
    }
  }

  const entradaResposta = parseUci(resposta)
  const respostaAplicada = entradaResposta === null ? null : applyMove(fen, entradaResposta)
  if (respostaAplicada === null) {
    // Linha do dataset quebrada no meio: encerra como resolvido em vez de
    // travar o jogador numa posição sem continuação.
    return {
      state: {
        ...state,
        status: 'resolvido',
        currentFen: fen,
        playedUci,
        solutionIndex: state.solvable.solutionUci.length,
      },
      correto: true,
      respostaDoAdversarioUci: null,
    }
  }

  fen = respostaAplicada.fenAfter

  return {
    state: {
      ...state,
      currentFen: fen,
      playedUci: [...playedUci, resposta],
      solutionIndex: indiceDaResposta + 1,
    },
    correto: true,
    respostaDoAdversarioUci: resposta,
  }
}

/**
 * Sobe um nível de dica. `hintsUsed` guarda o maior nível pedido, então pedir
 * a mesma dica de novo não conta duas vezes.
 */
export function useHint(state: AttemptState): AttemptState {
  if (state.status !== 'em-andamento') return state
  if (state.hintsUsed >= MAX_HINT_LEVEL) return state
  return { ...state, hintsUsed: state.hintsUsed + 1, firstTry: false }
}

/** O nível da próxima dica, ou `null` quando as três já foram usadas. */
export function nextHintLevel(state: AttemptState): HintLevel | null {
  if (state.hintsUsed >= MAX_HINT_LEVEL) return null
  return (state.hintsUsed + 1) as HintLevel
}

export function giveUp(state: AttemptState): AttemptState {
  if (state.status !== 'em-andamento') return state
  return { ...state, status: 'falhou', firstTry: false, gaveUp: true }
}

export interface ToPuzzleAttemptOptions {
  /** Relógio injetado. Nada de `new Date()` aqui dentro. */
  agora: Date
  thinkTimeMs: number
  /** Id do registro. Quando omitido, é derivado do puzzle e do relógio. */
  id?: string
}

/** Converte o estado no registro que a persistência e o modelo de skill leem. */
export function toPuzzleAttempt(
  state: AttemptState,
  { agora, thinkTimeMs, id }: ToPuzzleAttemptOptions,
): PuzzleAttempt {
  const { puzzle } = state.solvable
  const solved = state.status === 'resolvido'
  return {
    id: id ?? `${puzzle.id}:${agora.getTime()}`,
    puzzleId: puzzle.id,
    skillIds: puzzle.skillIds,
    attemptedAt: agora.toISOString(),
    solved,
    firstTry: solved && state.hintsUsed === 0 && state.wrongMoves.length === 0,
    hintsUsed: state.hintsUsed,
    thinkTimeMs: Math.max(0, Math.round(thinkTimeMs)),
    puzzleRating: puzzle.rating,
  }
}
