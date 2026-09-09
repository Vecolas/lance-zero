import { Chess } from 'chess.js'
import {
  ChessParseError,
  START_FEN,
  type GameOutcome,
  type LegalMove,
  type MoveInput,
  type PieceColor,
  type PieceType,
  type PositionStatus,
  type PromotionPiece,
  type SquareName,
} from './types'

/** Cria uma instância validando o FEN e traduzindo o erro para o nosso tipo. */
function load(fen: string): Chess {
  try {
    return new Chess(fen)
  } catch (error) {
    throw new ChessParseError(
      `FEN inválido: ${fen}${error instanceof Error ? ` (${error.message})` : ''}`,
    )
  }
}

export function isValidFen(fen: string): boolean {
  try {
    load(fen)
    return true
  } catch {
    return false
  }
}

/**
 * Normaliza um FEN passando por uma carga e uma serialização. Útil para
 * comparar duas posições que só diferem em espaçamento ou em campos redundantes.
 */
export function normalizeFen(fen: string): string {
  return load(fen).fen()
}

function toUci(from: SquareName, to: SquareName, promotion?: string): string {
  return `${from}${to}${promotion ?? ''}`
}

interface VerboseMove {
  from: string
  to: string
  san: string
  piece: string
  color: string
  promotion?: string
  captured?: string
  flags: string
}

function describe(move: VerboseMove, fenAfter: string): LegalMove {
  const after = new Chess(fenAfter)
  return {
    from: move.from,
    to: move.to,
    san: move.san,
    uci: toUci(move.from, move.to, move.promotion),
    piece: move.piece as PieceType,
    color: move.color as PieceColor,
    promotion: move.promotion as PromotionPiece | undefined,
    captured: move.captured as PieceType | undefined,
    isCapture: move.flags.includes('c') || move.flags.includes('e'),
    isEnPassant: move.flags.includes('e'),
    isCastle: move.flags.includes('k') || move.flags.includes('q'),
    isPromotion: move.flags.includes('p'),
    isCheck: after.isCheck(),
    isCheckmate: after.isCheckmate(),
  }
}

/** Todos os lances legais da posição, ou apenas os da casa informada. */
export function legalMoves(fen: string, from?: SquareName): LegalMove[] {
  const chess = load(fen)
  const verbose = (from
    ? chess.moves({ square: from as never, verbose: true })
    : chess.moves({ verbose: true })) as unknown as VerboseMove[]

  return verbose.map((move) => {
    const probe = new Chess(fen)
    probe.move({ from: move.from, to: move.to, promotion: move.promotion })
    return describe(move, probe.fen())
  })
}

export interface AppliedMove {
  move: LegalMove
  fenAfter: string
}

/**
 * Aplica um lance se ele for legal. Devolve `null` para lance ilegal — o
 * chamador decide se isso é um erro do usuário ou um bug.
 */
export function applyMove(fen: string, input: MoveInput): AppliedMove | null {
  const chess = load(fen)
  try {
    const result = chess.move(input as never) as unknown as VerboseMove | null
    if (!result) return null
    const fenAfter = chess.fen()
    return { move: describe(result, fenAfter), fenAfter }
  } catch {
    return null
  }
}

export function isLegalMove(fen: string, input: MoveInput): boolean {
  return applyMove(fen, input) !== null
}

function outcomeOf(chess: Chess): GameOutcome {
  if (chess.isCheckmate()) return 'mate'
  if (chess.isStalemate()) return 'afogamento'
  if (chess.isInsufficientMaterial()) return 'material-insuficiente'
  if (chess.isDraw()) return 'empate'
  return 'em-andamento'
}

export function positionStatus(fen: string): PositionStatus {
  const chess = load(fen)
  return {
    turn: chess.turn() as PieceColor,
    inCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isStalemate: chess.isStalemate(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
    isDraw: chess.isDraw(),
    isGameOver: chess.isGameOver(),
    outcome: outcomeOf(chess),
    moveNumber: Number(fen.split(' ')[5] ?? 1),
  }
}

export { START_FEN }
