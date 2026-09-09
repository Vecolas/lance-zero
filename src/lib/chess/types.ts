/**
 * Tipos próprios do domínio de xadrez.
 *
 * Nada aqui vem de `chess.js`. A biblioteca é um detalhe de implementação do
 * adapter em `position.ts` e `pgn.ts`; trocá-la não deve tocar o resto do app.
 */

export type PieceColor = 'w' | 'b'
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type PromotionPiece = 'n' | 'b' | 'r' | 'q'

/** Casa em notação algébrica, de `a1` a `h8`. */
export type SquareName = string

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export interface LegalMove {
  from: SquareName
  to: SquareName
  /** Notação algébrica abreviada, como `Nf3` ou `exd5`. */
  san: string
  /** Notação longa usada pela engine e pelos puzzles, como `g1f3` ou `e7e8q`. */
  uci: string
  piece: PieceType
  color: PieceColor
  promotion?: PromotionPiece
  captured?: PieceType
  isCapture: boolean
  isEnPassant: boolean
  isCastle: boolean
  isPromotion: boolean
  isCheck: boolean
  isCheckmate: boolean
}

export type MoveInput = string | { from: SquareName; to: SquareName; promotion?: PromotionPiece }

export type GameOutcome =
  'em-andamento' | 'mate' | 'afogamento' | 'material-insuficiente' | 'empate'

export interface PositionStatus {
  turn: PieceColor
  inCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isInsufficientMaterial: boolean
  isDraw: boolean
  isGameOver: boolean
  outcome: GameOutcome
  /** Número do lance completo, como aparece na notação. */
  moveNumber: number
}

/** Um meio-lance já jogado, com a posição antes e depois. */
export interface Ply {
  /** 1 para o primeiro meio-lance da linha. */
  index: number
  moveNumber: number
  color: PieceColor
  san: string
  uci: string
  from: SquareName
  to: SquareName
  fenBefore: string
  fenAfter: string
}

export interface ChessGame {
  headers: Record<string, string>
  startFen: string
  plies: Ply[]
}

export class ChessParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChessParseError'
  }
}
