import { applyMove } from './position'
import type { ChessGame, MoveInput, Ply, SquareName } from './types'

/**
 * Navegação pura sobre uma linha de lances.
 *
 * O ply `0` é a posição inicial; o ply `n` é a posição depois do n-ésimo
 * meio-lance. Tudo aqui é função pura para poder ser testado sem React.
 */

export function lastPly(game: ChessGame): number {
  return game.plies.length
}

export function clampPly(game: ChessGame, ply: number): number {
  if (!Number.isFinite(ply)) return 0
  return Math.min(Math.max(Math.trunc(ply), 0), lastPly(game))
}

export function fenAtPly(game: ChessGame, ply: number): string {
  const target = clampPly(game, ply)
  return target === 0 ? game.startFen : game.plies[target - 1].fenAfter
}

/** O lance que levou até esta posição, para destacar as casas no tabuleiro. */
export function plyAt(game: ChessGame, ply: number): Ply | null {
  const target = clampPly(game, ply)
  return target === 0 ? null : game.plies[target - 1]
}

export type NavigationStep = 'primeiro' | 'anterior' | 'proximo' | 'ultimo'

export function navigate(game: ChessGame, current: number, step: NavigationStep): number {
  switch (step) {
    case 'primeiro':
      return 0
    case 'anterior':
      return clampPly(game, current - 1)
    case 'proximo':
      return clampPly(game, current + 1)
    case 'ultimo':
      return lastPly(game)
  }
}

export interface PlayResult {
  game: ChessGame
  ply: number
}

/**
 * Joga um lance a partir da posição atual.
 *
 * Se o usuário não estiver no fim da linha, os lances seguintes são
 * descartados — a linha passa a ser a nova. Devolve `null` se o lance for
 * ilegal, sem alterar nada.
 */
export function playMove(game: ChessGame, ply: number, input: MoveInput): PlayResult | null {
  const current = clampPly(game, ply)
  const fen = fenAtPly(game, current)
  const applied = applyMove(fen, input)
  if (!applied) return null

  const kept = game.plies.slice(0, current)
  const next: Ply = {
    index: current + 1,
    moveNumber: Number(fen.split(' ')[5] ?? 1),
    color: applied.move.color,
    san: applied.move.san,
    uci: applied.move.uci,
    from: applied.move.from,
    to: applied.move.to,
    fenBefore: fen,
    fenAfter: applied.fenAfter,
  }

  return { game: { ...game, plies: [...kept, next] }, ply: current + 1 }
}

/** Agrupa os meios-lances em pares para a lista de lances. */
export interface MovePair {
  moveNumber: number
  white: Ply | null
  black: Ply | null
}

export function toMovePairs(game: ChessGame): MovePair[] {
  const pairs: MovePair[] = []
  for (const ply of game.plies) {
    const last = pairs[pairs.length - 1]
    if (ply.color === 'w' || !last || last.black !== null) {
      pairs.push({
        moveNumber: ply.moveNumber,
        white: ply.color === 'w' ? ply : null,
        black: ply.color === 'b' ? ply : null,
      })
    } else {
      last.black = ply
    }
  }
  return pairs
}

/** Casas destacadas para o lance que chegou até a posição atual. */
export function highlightedSquares(game: ChessGame, ply: number): SquareName[] {
  const move = plyAt(game, ply)
  return move ? [move.from, move.to] : []
}
