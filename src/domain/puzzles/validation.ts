/**
 * Validação de puzzle para o pipeline de ingestão.
 *
 * O dump do Lichess é grande e o nosso parser é tolerante. Antes de um puzzle
 * entrar no artefato de produção, a linha inteira da solução precisa ser legal
 * lance a lance — não basta o primeiro. Puzzle quebrado é descartado aqui, não
 * na frente do usuário.
 */

import { applyMove, positionStatus } from '@/lib/chess'
import type { Puzzle, SolvablePuzzle } from '@/domain/types'
import { PuzzleParseError, parseUci, toSolvable } from './parser'

export interface PuzzleValidation {
  valido: boolean
  /** Frase curta em PT-BR explicando a recusa. Ausente quando válido. */
  motivo?: string
  /** Índice em `solutionUci` do lance que quebrou. Ausente quando válido. */
  indiceDoLanceInvalido?: number
  /** FEN ao fim da linha, quando toda a solução é legal. */
  fenFinal?: string
  /** `true` quando a solução termina em mate. */
  terminaEmMate?: boolean
}

/**
 * Roda a solução inteira a partir de `startFen`, um lance por vez.
 *
 * Também recusa solução de tamanho par: a linha do dataset alterna
 * jogador / adversário começando pelo jogador, então uma solução válida sempre
 * termina com um lance do jogador e tem comprimento ímpar.
 */
export function validateSolution(solvable: SolvablePuzzle): PuzzleValidation {
  const { solutionUci } = solvable

  if (solutionUci.length === 0) {
    return { valido: false, motivo: 'Solução vazia.' }
  }

  if (solutionUci.length % 2 === 0) {
    return {
      valido: false,
      motivo: `Solução com ${solutionUci.length} lances: a linha teria que terminar com um lance do jogador.`,
      indiceDoLanceInvalido: solutionUci.length - 1,
    }
  }

  let fen = solvable.startFen

  for (let i = 0; i < solutionUci.length; i += 1) {
    const uci = solutionUci[i]
    const entrada = parseUci(uci)
    if (entrada === null) {
      return {
        valido: false,
        motivo: `Lance ${i + 1} da solução fora do formato UCI ("${uci}").`,
        indiceDoLanceInvalido: i,
      }
    }

    const aplicado = applyMove(fen, entrada)
    if (aplicado === null) {
      return {
        valido: false,
        motivo: `Lance ${i + 1} da solução ("${uci}") é ilegal na posição alcançada.`,
        indiceDoLanceInvalido: i,
      }
    }

    fen = aplicado.fenAfter
  }

  const status = positionStatus(fen)

  return {
    valido: true,
    fenFinal: fen,
    terminaEmMate: status.isCheckmate,
  }
}

/**
 * Valida um puzzle cru: aplica o lance preparatório e depois a solução.
 * Erro do lance preparatório vira recusa, não exceção — o pipeline processa
 * o dump inteiro sem parar.
 */
export function validatePuzzle(puzzle: Puzzle): PuzzleValidation {
  let solvable: SolvablePuzzle
  try {
    solvable = toSolvable(puzzle)
  } catch (error) {
    return {
      valido: false,
      motivo:
        error instanceof PuzzleParseError
          ? error.message
          : `Puzzle ${puzzle.id}: falha ao aplicar o lance preparatório.`,
      indiceDoLanceInvalido: 0,
    }
  }
  return validateSolution(solvable)
}
