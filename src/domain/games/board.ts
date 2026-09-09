/**
 * Geometria de tabuleiro para os detectores de erro.
 *
 * O adapter `@/lib/chess` responde tudo que é REGRA: quais lances são legais,
 * o que acontece ao aplicar um lance, se a posição é xeque-mate. Ele não expõe
 * mapa de ataques nem raios — e "peça pendurada", "cravada" e "corredor" são
 * perguntas de geometria sobre a colocação das peças, não de legalidade.
 *
 * Este arquivo faz só isso: lê o campo de colocação do FEN e responde quem
 * ataca o quê. Nunca decide legalidade, xeque, roque ou en passant; qualquer
 * pergunta desse tipo continua indo para `@/lib/chess`.
 */

import type { PieceColor, PieceType, SquareName } from '@/lib/chess'

/** Valores de material em centipeões. Heurística de produto, a calibrar. */
export const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 300,
  b: 320,
  r: 500,
  q: 900,
  /** O rei nunca é capturado; o valor alto só o mantém fora das trocas. */
  k: 100_000,
}

export interface BoardPiece {
  square: SquareName
  type: PieceType
  color: PieceColor
}

export type Board = ReadonlyMap<SquareName, { type: PieceType; color: PieceColor }>

const FILES = 'abcdefgh'

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
]

const KING_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

export function squareName(file: number, rank: number): SquareName | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${FILES[file]}${rank + 1}`
}

export interface SquareCoords {
  /** 0 = coluna a. */
  file: number
  /** 0 = primeira fileira. */
  rank: number
}

export function squareCoords(square: SquareName): SquareCoords | null {
  const file = FILES.indexOf(square[0] ?? '')
  const rank = Number(square[1]) - 1
  if (file < 0 || !Number.isInteger(rank) || rank < 0 || rank > 7) return null
  return { file, rank }
}

/** Lê apenas o campo de colocação do FEN. Não valida a posição. */
export function parseBoard(fen: string): Board {
  const placement = fen.trim().split(/\s+/)[0] ?? ''
  const board = new Map<SquareName, { type: PieceType; color: PieceColor }>()

  placement.split('/').forEach((row, index) => {
    const rank = 7 - index
    let file = 0
    for (const char of row) {
      if (char >= '1' && char <= '8') {
        file += Number(char)
        continue
      }
      const lower = char.toLowerCase() as PieceType
      const name = squareName(file, rank)
      if (name) board.set(name, { type: lower, color: char === lower ? 'b' : 'w' })
      file += 1
    }
  })

  return board
}

export function piecesOf(board: Board, color: PieceColor): BoardPiece[] {
  const pieces: BoardPiece[] = []
  for (const [square, piece] of board) {
    if (piece.color === color) pieces.push({ square, ...piece })
  }
  return pieces.sort((a, b) => a.square.localeCompare(b.square))
}

export function kingSquare(board: Board, color: PieceColor): SquareName | null {
  for (const [square, piece] of board) {
    if (piece.type === 'k' && piece.color === color) return square
  }
  return null
}

function slideDirs(type: PieceType): ReadonlyArray<readonly [number, number]> {
  if (type === 'r') return ROOK_DIRS
  if (type === 'b') return BISHOP_DIRS
  return [...ROOK_DIRS, ...BISHOP_DIRS]
}

/**
 * Casas atacadas pela peça em `square`.
 *
 * Uma casa ocupada por peça amiga também entra: para o cálculo de trocas o que
 * importa é quem consegue alcançar a casa, não se o lance é legal agora.
 */
export function attacksFrom(board: Board, square: SquareName): SquareName[] {
  const piece = board.get(square)
  const origin = squareCoords(square)
  if (!piece || !origin) return []

  const alvos: SquareName[] = []

  const push = (file: number, rank: number): SquareName | null => {
    const name = squareName(file, rank)
    if (name) alvos.push(name)
    return name
  }

  if (piece.type === 'p') {
    const direction = piece.color === 'w' ? 1 : -1
    push(origin.file - 1, origin.rank + direction)
    push(origin.file + 1, origin.rank + direction)
    return alvos
  }

  if (piece.type === 'n') {
    for (const [df, dr] of KNIGHT_DELTAS) push(origin.file + df, origin.rank + dr)
    return alvos
  }

  if (piece.type === 'k') {
    for (const [df, dr] of KING_DELTAS) push(origin.file + df, origin.rank + dr)
    return alvos
  }

  for (const [df, dr] of slideDirs(piece.type)) {
    let file = origin.file + df
    let rank = origin.rank + dr
    while (true) {
      const name = squareName(file, rank)
      if (!name) break
      alvos.push(name)
      if (board.has(name)) break
      file += df
      rank += dr
    }
  }

  return alvos
}

/** Peças de `color` que atacam `square`, ordenadas por casa para ser determinístico. */
export function attackersOf(board: Board, square: SquareName, color: PieceColor): BoardPiece[] {
  return piecesOf(board, color).filter((piece) => attacksFrom(board, piece.square).includes(square))
}

/**
 * Ganho material aproximado de capturar em `square`, em centipeões.
 *
 * É uma troca de um lance só: capturamos e o adversário recaptura com a peça
 * mais barata. Deliberadamente conservador — prefere não acusar material
 * ganho a inventar um ganho que não existe.
 */
export function captureGain(board: Board, square: SquareName, attacker: PieceColor): number {
  const alvo = board.get(square)
  if (!alvo || alvo.color === attacker || alvo.type === 'k') return 0

  const atacantes = attackersOf(board, square, attacker)
  if (atacantes.length === 0) return 0

  const defensores = attackersOf(board, square, alvo.color)
  if (defensores.length === 0) return PIECE_VALUES[alvo.type]

  // Com a casa defendida, o rei não pode capturar: ele não é candidato à troca.
  const semRei = atacantes.filter((peca) => peca.type !== 'k')
  if (semRei.length === 0) return 0

  const menorAtacante = Math.min(...semRei.map((peca) => PIECE_VALUES[peca.type]))
  return PIECE_VALUES[alvo.type] - menorAtacante
}

export interface HangingPiece {
  piece: BoardPiece
  /** Centipeões que o adversário ganha capturando. */
  gain: number
}

/** Peça de `side` mais cara de perder na posição, do ponto de vista do adversário. */
export function worstHangingPiece(board: Board, side: PieceColor): HangingPiece | null {
  const adversario: PieceColor = side === 'w' ? 'b' : 'w'
  let pior: HangingPiece | null = null

  for (const peca of piecesOf(board, side)) {
    const gain = captureGain(board, peca.square, adversario)
    if (gain <= 0) continue
    if (!pior || gain > pior.gain) pior = { piece: peca, gain }
  }

  return pior
}

export interface PinInfo {
  /** Peça que crava. */
  pinner: BoardPiece
  /** Peça cravada. */
  pinned: BoardPiece
  /** Peça mais valiosa atrás da cravada, na mesma linha. */
  target: BoardPiece
}

/** Cravadas em que uma peça de `pinnerColor` prende uma peça adversária. */
export function findPins(board: Board, pinnerColor: PieceColor): PinInfo[] {
  const pins: PinInfo[] = []

  for (const peca of piecesOf(board, pinnerColor)) {
    if (peca.type !== 'b' && peca.type !== 'r' && peca.type !== 'q') continue
    const origin = squareCoords(peca.square)
    if (!origin) continue

    for (const [df, dr] of slideDirs(peca.type)) {
      let file = origin.file + df
      let rank = origin.rank + dr
      let cravada: BoardPiece | null = null

      while (true) {
        const name = squareName(file, rank)
        if (!name) break
        const ocupante = board.get(name)
        if (ocupante) {
          if (ocupante.color === pinnerColor) break
          if (!cravada) {
            cravada = { square: name, ...ocupante }
          } else {
            const maisValiosa =
              ocupante.type === 'k' || PIECE_VALUES[ocupante.type] > PIECE_VALUES[cravada.type]
            if (maisValiosa) {
              pins.push({ pinner: peca, pinned: cravada, target: { square: name, ...ocupante } })
            }
            break
          }
        }
        file += df
        rank += dr
      }
    }
  }

  return pins
}

/**
 * Zona do rei: a própria casa, as oito vizinhas e o abrigo duas fileiras à
 * frente. É a região onde um ataque ao rei costuma se materializar.
 */
export function kingZone(board: Board, color: PieceColor): SquareName[] {
  const square = kingSquare(board, color)
  const origin = square ? squareCoords(square) : null
  if (!origin) return []

  const zona: SquareName[] = []
  const frente = color === 'w' ? 1 : -1

  for (let df = -1; df <= 1; df += 1) {
    for (let dr = -1; dr <= 1; dr += 1) {
      const name = squareName(origin.file + df, origin.rank + dr)
      if (name) zona.push(name)
    }
    const abrigo = squareName(origin.file + df, origin.rank + 2 * frente)
    if (abrigo) zona.push(abrigo)
  }

  return zona.sort((a, b) => a.localeCompare(b))
}

/** Nome em PT-BR da peça, com artigo, para compor os textos dos detectores. */
export function pieceName(type: PieceType): string {
  switch (type) {
    case 'p':
      return 'o peão'
    case 'n':
      return 'o cavalo'
    case 'b':
      return 'o bispo'
    case 'r':
      return 'a torre'
    case 'q':
      return 'a dama'
    case 'k':
      return 'o rei'
  }
}
