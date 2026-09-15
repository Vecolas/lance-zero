'use client'

import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import {
  boardHighlights,
  boardThemes,
  DEFAULT_BOARD_THEME,
  type BoardThemeName,
} from '@/lib/design/board'
import { legalMoves, type PieceColor, type PromotionPiece, type SquareName } from '@/lib/chess'
import styles from './ChessBoardView.module.css'

export interface ChessBoardViewProps {
  fen: string
  orientation: PieceColor
  theme?: BoardThemeName
  /** Casas do último lance, destacadas em âmbar. */
  lastMove?: SquareName[]
  /** Rotas pedagógicas desenhadas sobre a posição. */
  arrows?: readonly { from: SquareName; to: SquareName }[]
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

const PROMOTION_OPTIONS: readonly { piece: PromotionPiece; label: string }[] = [
  { piece: 'q', label: 'Dama' },
  { piece: 'r', label: 'Torre' },
  { piece: 'b', label: 'Bispo' },
  { piece: 'n', label: 'Cavalo' },
]

export function ChessBoardView({
  fen,
  orientation,
  theme = DEFAULT_BOARD_THEME,
  lastMove = [],
  arrows = [],
  selected = null,
  targets = [],
  checkSquare = null,
  interactive = true,
  onMove,
  onSquareClick,
}: ChessBoardViewProps) {
  const palette = boardThemes[theme]
  const [promotion, setPromotion] = useState<
    { from: SquareName; to: SquareName; fen: string } | null
  >(null)

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

  const drop = (from: SquareName, to: SquareName): boolean => {
    const possible = legalMoves(fen, from).filter((move) => move.to === to)
    if (possible.some((move) => move.promotion !== undefined)) {
      setPromotion({ from, to, fen })
      return false
    }
    return onMove?.(from, to) ?? false
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
            arrows: arrows.map((arrow) => ({
              startSquare: arrow.from,
              endSquare: arrow.to,
              color: '#22d3ee',
            })),
            onSquareClick: ({ square }) => onSquareClick?.(square),
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!onMove || !targetSquare) return false
              // A promoção padrão é dama; escolher outra peça é assunto da Fase 3.
              return drop(sourceSquare, targetSquare)
            },
          }}
        />
      </div>
      {promotion?.fen === fen ? (
        <div className={styles.promotion} role="group" aria-label="Escolha a peça da promoção">
          <span className={styles.promotionLabel}>Promover para</span>
          {PROMOTION_OPTIONS.map((option) => (
            <button
              key={option.piece}
              type="button"
              className={styles.promotionButton}
              onClick={() => {
                const accepted = onMove?.(promotion.from, promotion.to, option.piece) ?? false
                if (accepted) setPromotion(null)
              }}
            >
              {option.label}
            </button>
          ))}
          <button type="button" className={styles.promotionCancel} onClick={() => setPromotion(null)}>
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  )
}
