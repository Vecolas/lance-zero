/**
 * Adapter de posição sobre o `chess.js`: validar FEN, listar lances legais,
 * aplicar lance, ler o estado da posição.
 *
 * DECISÃO: `chess.js` não vaza daqui. Os tipos que saem são os nossos
 * (`LegalMove`, `PositionStatus`), e o erro que sai é `ChessParseError`.
 *
 * DECISÃO: validar FEN tem DOIS níveis, e confundi-los já custou caro.
 * `isValidFen` responde "este texto descreve um tabuleiro"; `posicaoEhJogavel`
 * responde "esta posição poderia ter acontecido numa partida". Leia o bloco de
 * `posicaoEhJogavel` antes de aceitar FEN vindo de fora.
 */

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
 * A posição pode ter surgido de uma partida legal e é jogável?
 *
 * POR QUE EXISTE, ao lado de `isValidFen` e não dentro dele: `isValidFen` (e
 * portanto o `chess.js` por trás dele) só responde "este texto descreve um
 * tabuleiro". Ele aceita alegremente uma posição em que o lado que NÃO tem a
 * vez está em xeque — posição que nunca poderia ter acontecido numa partida. O
 * sintoma não é um erro de validação: é o gerador de lances devolvendo a
 * captura do rei adversário, e a primeira exceção aparece três camadas abaixo,
 * dentro do adapter.
 *
 * Isto foi escrito depois de o portão do currículo de finais cair exatamente
 * assim, com um FEN escrito à mão em que a dama dava xeque com as brancas a
 * jogar. O detector óbvio mentiu; este é o que não mente. Mora aqui, e não em
 * `@/domain/endgames`, porque é regra de xadrez GERAL: qualquer domínio que
 * aceite FEN de fora — puzzles, importação, repertório — tem o mesmo buraco
 * (issue #55, item 3).
 *
 * As duas respostas são diferentes DE PROPÓSITO e não devem ser fundidas:
 * `isValidFen` é a pergunta certa para "consigo carregar isto?", e esta é a
 * pergunta certa para "posso treinar em cima disto?".
 *
 * Devolve `false` para FEN inválido e para posição em que o lado sem a vez está
 * em xeque. Não lança: quem chama é um portão que quer listar todas as posições
 * quebradas de uma vez.
 */
export function posicaoEhJogavel(fen: string): boolean {
  if (!isValidFen(fen)) {
    return false
  }
  const invertido = comAVezTrocada(fen)
  if (invertido === null || !isValidFen(invertido)) {
    return false
  }
  // Com a vez trocada, "está em xeque" responde pelo lado que no FEN original
  // não tinha a vez — que é exatamente a pergunta.
  return !positionStatus(invertido).inCheck
}

/**
 * Troca de quem é a vez, zerando en passant e contadores.
 *
 * A casa de en passant depende de quem acabou de jogar; mantê-la depois da
 * troca produziria um FEN que descreve outra coisa.
 */
function comAVezTrocada(fen: string): string | null {
  const campos = fen.trim().split(/\s+/)
  if (campos.length < 3) {
    return null
  }
  const vez = campos[1] === 'w' ? 'b' : 'w'
  return [campos[0], vez, campos[2], '-', '0', '1'].join(' ')
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
