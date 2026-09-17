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
  /** Informa a tela quando o arraste termina em uma casa sem lance legal. */
  onIllegalMove?: (from: SquareName, to: SquareName) => void
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
  onIllegalMove,
  onSquareClick,
}: ChessBoardViewProps) {
  const palette = boardThemes[theme]
  const [promotion, setPromotion] = useState<{
    from: SquareName
    to: SquareName
    fen: string
  } | null>(null)

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
    if (possible.length === 0) {
      onIllegalMove?.(from, to)
      return false
    }
    if (possible.some((move) => move.promotion !== undefined)) {
      setPromotion({ from, to, fen })
      return false
    }
    return onMove?.(from, to) ?? false
  }

  return (
    <div className={styles.wrapper}>
      {/*
        `data-testid` no invólucro do tabuleiro, e não numa classe de módulo.

        O nome da classe é gerado no build (`ChessBoardView-module__xYz__board`) e
        muda quando o arquivo muda — um teste ancorado nele quebra por refatoração
        e não por defeito. O `data-testid` é contrato: ele existe para ser mirado,
        e é o que permite MEDIR o tabuleiro, que é como a regra "tabuleiro grande"
        deixa de ser uma frase que ninguém confere.
      */}
      {/*
        `data-interactive` É CONTRATO, como o `data-testid` ao lado.

        "Este tabuleiro aceita lance?" é a diferença entre a resposta e a
        ilustração, e não havia como perguntar isso de fora: a biblioteca de
        tabuleiro implementa o arraste por conta própria e não marca as peças com
        o `draggable` do HTML. Sem este atributo, um portão que quisesse provar
        "a etapa que cobra lance é jogável" teria de adivinhar pela estrutura
        interna de uma dependência.

        `data-fen` está aqui pelo MESMO motivo: um portão que precisa jogar um
        lance tem de saber que posição está na tela. Sem ele, o e2e só descobria
        o lance por força bruta — clicar casa a casa até alguma virar lance legal
        — e um portão que leva trinta segundos para achar um clique é um portão
        que alguém vai desligar.

        A alternativa seria cravar o UCI no teste, e ela é pior: amarraria o
        portão a uma FEN do catálogo, e ele passaria a reprovar quando o CONTEÚDO
        mudasse — reprovando o código certo, que é o pior tipo de portão.
      */}
      <div
        className={styles.board}
        data-testid="chessboard"
        data-interactive={interactive ? 'true' : 'false'}
        data-fen={fen}
      >
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
          <button
            type="button"
            className={styles.promotionCancel}
            onClick={() => setPromotion(null)}
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  )
}
