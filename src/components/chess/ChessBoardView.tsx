'use client'

import { Chessboard } from 'react-chessboard'
import { boardHighlights, boardThemes, type BoardThemeName } from '@/lib/design/board'
import type { PieceColor, PromotionPiece, SquareName } from '@/lib/chess'
import styles from './ChessBoardView.module.css'

export interface ChessBoardViewProps {
  fen: string
  orientation: PieceColor
  theme?: BoardThemeName
  /** Casas do último lance, destacadas em âmbar. */
  lastMove?: SquareName[]
  /** Casa que o usuário selecionou, destacada em coral. */
  selected?: SquareName | null
  /** Destinos legais a partir da casa selecionada. */
  targets?: SquareName[]
  /** Casa do rei em xeque, destacada por contorno. */
  checkSquare?: SquareName | null
  interactive?: boolean
  /** Devolve `true` se o lance foi aceito. */
  onMove?: (from: SquareName, to: SquareName, promotion?: PromotionPiece) => boolean
  onSquareClick?: (square: SquareName) => void
}

export function ChessBoardView({
  fen,
  orientation,
  theme = 'paper',
  lastMove = [],
  selected = null,
  targets = [],
  checkSquare = null,
  interactive = true,
  onMove,
  onSquareClick,
}: ChessBoardViewProps) {
  const palette = boardThemes[theme]

  const squareStyles: Record<string, React.CSSProperties> = {}
  for (const square of lastMove) {
    squareStyles[square] = { backgroundColor: boardHighlights.lastMove }
  }
  for (const square of targets) {
    squareStyles[square] = {
      ...squareStyles[square],
      backgroundImage: `radial-gradient(circle, ${boardHighlights.legalTarget} 18%, transparent 20%)`,
    }
  }
  if (selected) {
    squareStyles[selected] = {
      ...squareStyles[selected],
      backgroundColor: boardHighlights.selected,
    }
  }
  if (checkSquare) {
    squareStyles[checkSquare] = {
      ...squareStyles[checkSquare],
      boxShadow: `inset 0 0 0 3px ${boardHighlights.check}`,
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.board}>
        <Chessboard
          options={{
            id: 'lancezero-board',
            position: fen,
            boardOrientation: orientation === 'w' ? 'white' : 'black',
            allowDragging: interactive,
            showNotation: true,
            animationDurationInMs: 180,
            lightSquareStyle: { backgroundColor: palette.light },
            darkSquareStyle: { backgroundColor: palette.dark },
            squareStyles,
            onSquareClick: ({ square }) => onSquareClick?.(square),
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!onMove || !targetSquare) return false
              // A promoção padrão é dama; escolher outra peça é assunto da Fase 3.
              return onMove(sourceSquare, targetSquare, 'q')
            },
          }}
        />
      </div>
    </div>
  )
}
