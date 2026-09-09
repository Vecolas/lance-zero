import { Chess } from 'chess.js'
import { applyMove } from './position'
import { ChessParseError, START_FEN, type ChessGame, type PieceColor, type Ply } from './types'

/**
 * Converte um PGN em uma linha principal navegável.
 *
 * Variações e comentários são aceitos na entrada mas descartados da linha: o
 * viewer da Fase 1 mostra a linha principal. Guardar variações é problema da
 * Fase 6, quando a revisão de partida precisar delas.
 */
export function parsePgn(pgn: string): ChessGame {
  const trimmed = pgn.trim()
  if (!trimmed) {
    throw new ChessParseError('PGN vazio.')
  }

  const chess = new Chess()
  try {
    chess.loadPgn(trimmed)
  } catch (error) {
    throw new ChessParseError(
      `Não consegui ler este PGN${error instanceof Error ? `: ${error.message}` : '.'}`,
    )
  }

  const headers = chess.getHeaders()
  const startFen = headers.FEN ?? START_FEN
  const sanMoves = chess.history()

  if (sanMoves.length === 0) {
    throw new ChessParseError('O PGN não contém nenhum lance.')
  }

  return { headers, startFen, plies: buildPlies(startFen, sanMoves) }
}

/** Monta a lista de meios-lances a partir de uma sequência de SAN. */
export function buildPlies(startFen: string, sanMoves: string[]): Ply[] {
  const plies: Ply[] = []
  let fen = startFen

  sanMoves.forEach((san, i) => {
    const applied = applyMove(fen, san)
    if (!applied) {
      throw new ChessParseError(`Lance ilegal na posição ${i + 1}: ${san}`)
    }
    plies.push({
      index: i + 1,
      moveNumber: Number(fen.split(' ')[5] ?? 1),
      color: fen.split(' ')[1] as PieceColor,
      san: applied.move.san,
      uci: applied.move.uci,
      from: applied.move.from,
      to: applied.move.to,
      fenBefore: fen,
      fenAfter: applied.fenAfter,
    })
    fen = applied.fenAfter
  })

  return plies
}

/** Cria uma partida vazia a partir de um FEN, para o modo de exploração livre. */
export function gameFromFen(fen: string, headers: Record<string, string> = {}): ChessGame {
  return { headers: { ...headers, FEN: fen }, startFen: fen, plies: [] }
}

/** Serializa a linha principal de volta para PGN. */
export function toPgn(game: ChessGame): string {
  const chess = new Chess(game.startFen)
  for (const [key, value] of Object.entries(game.headers)) {
    if (key !== 'FEN' || game.startFen !== START_FEN) {
      chess.setHeader(key, value)
    }
  }
  for (const ply of game.plies) {
    chess.move(ply.san)
  }
  return chess.pgn()
}
