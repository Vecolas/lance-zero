'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChessBoardView } from './ChessBoardView'
import { MoveList } from './MoveList'
import {
  fenAtPly,
  highlightedSquares,
  legalMoves,
  navigate,
  playMove,
  positionStatus,
  type ChessGame,
  type NavigationStep,
  type PieceColor,
  type PromotionPiece,
  type SquareName,
} from '@/lib/chess'
import { DEFAULT_BOARD_THEME, type BoardThemeName } from '@/lib/design/board'
import styles from './GameViewer.module.css'

const OUTCOME_LABEL: Record<string, string> = {
  'em-andamento': 'Em andamento',
  mate: 'Xeque-mate',
  afogamento: 'Rei afogado — empate',
  'material-insuficiente': 'Material insuficiente — empate',
  empate: 'Empate',
}

export interface GameViewerProps {
  game: ChessGame
  onGameChange: (game: ChessGame) => void
  theme?: BoardThemeName
  /** Avisa que a linha original foi alterada por um lance do usuário. */
  modified?: boolean
  onRestore?: () => void
}

/** Casa do rei do lado em xeque, para o contorno no tabuleiro. */
function findKingSquare(fen: string, color: PieceColor): SquareName | null {
  const rows = fen.split(' ')[0].split('/')
  const target = color === 'w' ? 'K' : 'k'
  for (let rank = 0; rank < 8; rank += 1) {
    let file = 0
    for (const char of rows[rank]) {
      if (/\d/.test(char)) {
        file += Number(char)
      } else {
        if (char === target) return `${'abcdefgh'[file]}${8 - rank}`
        file += 1
      }
    }
  }
  return null
}

export function GameViewer({
  game,
  onGameChange,
  theme = DEFAULT_BOARD_THEME,
  modified = false,
  onRestore,
}: GameViewerProps) {
  const [ply, setPly] = useState(0)
  const [orientation, setOrientation] = useState<PieceColor>('w')
  const [selected, setSelected] = useState<SquareName | null>(null)
  const [rejected, setRejected] = useState(false)
  const regionRef = useRef<HTMLDivElement>(null)

  // Ao carregar outra partida, volta ao começo da nova linha. Ajuste durante a
  // renderização, e não em efeito: evita a renderização em cascata.
  const gameKey = `${game.startFen}|${game.headers.Event ?? ''}|${game.headers.Date ?? ''}`
  const [loadedKey, setLoadedKey] = useState(gameKey)
  if (loadedKey !== gameKey) {
    setLoadedKey(gameKey)
    setPly(0)
    setSelected(null)
    setRejected(false)
  }

  const fen = fenAtPly(game, ply)
  const status = useMemo(() => positionStatus(fen), [fen])
  const lastMove = highlightedSquares(game, ply)
  const targets = useMemo(
    () => (selected ? legalMoves(fen, selected).map((m) => m.to) : []),
    [fen, selected],
  )
  const checkSquare = status.inCheck ? findKingSquare(fen, status.turn) : null

  const step = useCallback(
    (direction: NavigationStep) => {
      setPly((current) => navigate(game, current, direction))
      setSelected(null)
    },
    [game],
  )

  const tryMove = useCallback(
    (from: SquareName, to: SquareName, promotion?: PromotionPiece) => {
      const result = playMove(game, ply, { from, to, promotion })
      if (!result) {
        setRejected(true)
        return false
      }
      setRejected(false)
      setSelected(null)
      onGameChange(result.game)
      setPly(result.ply)
      return true
    },
    [game, onGameChange, ply],
  )

  const handleSquareClick = useCallback(
    (square: SquareName) => {
      if (selected && selected !== square && tryMove(selected, square, 'q')) return
      const hasMoves = legalMoves(fen, square).length > 0
      setSelected(hasMoves && square !== selected ? square : null)
    },
    [fen, selected, tryMove],
  )

  // Teclado: setas navegam a partida quando o foco está na região do tabuleiro.
  useEffect(() => {
    const node = regionRef.current
    if (!node) return
    const onKeyDown = (event: KeyboardEvent) => {
      const map: Record<string, NavigationStep> = {
        ArrowLeft: 'anterior',
        ArrowRight: 'proximo',
        Home: 'primeiro',
        End: 'ultimo',
      }
      const direction = map[event.key]
      if (!direction) return
      event.preventDefault()
      step(direction)
    }
    node.addEventListener('keydown', onKeyDown)
    return () => node.removeEventListener('keydown', onKeyDown)
  }, [step])

  const atStart = ply === 0
  const atEnd = ply === game.plies.length

  return (
    <div
      className={styles.layout}
      ref={regionRef}
      tabIndex={-1}
      role="region"
      aria-label="Tabuleiro e lances"
    >
      <div>
        <ChessBoardView
          fen={fen}
          orientation={orientation}
          theme={theme}
          lastMove={lastMove}
          selected={selected}
          targets={targets}
          checkSquare={checkSquare}
          onMove={tryMove}
          onSquareClick={handleSquareClick}
        />
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.button}
            onClick={() => step('primeiro')}
            disabled={atStart}
            aria-label="Primeiro lance"
          >
            &#8676;
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => step('anterior')}
            disabled={atStart}
            aria-label="Lance anterior"
          >
            &#8592;
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => step('proximo')}
            disabled={atEnd}
            aria-label="Próximo lance"
          >
            &#8594;
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => step('ultimo')}
            disabled={atEnd}
            aria-label="Último lance"
          >
            &#8677;
          </button>
          <span className={styles.spacer} />
          <button
            type="button"
            className={styles.button}
            onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
          >
            Girar tabuleiro
          </button>
        </div>
        <p className={styles.hint}>
          Setas esquerda e direita percorrem os lances; Home e End vão ao início e ao fim.
        </p>
      </div>

      <div className={styles.sidebar}>
        <div className={styles.status} role="status">
          <span>
            Lance {ply} de {game.plies.length}
          </span>
          <span className={styles.badge}>
            {status.turn === 'w' ? 'Brancas jogam' : 'Pretas jogam'}
          </span>
          {status.inCheck && !status.isCheckmate ? (
            <span className={`${styles.badge} ${styles.badgeAlert}`}>! Xeque</span>
          ) : null}
          {status.isGameOver ? (
            <span className={`${styles.badge} ${styles.badgeAlert}`}>
              {OUTCOME_LABEL[status.outcome]}
            </span>
          ) : null}
        </div>

        {modified ? (
          <div className={styles.status}>
            <span>Você saiu da linha original.</span>
            {onRestore ? (
              <button type="button" className={styles.button} onClick={onRestore}>
                Restaurar partida
              </button>
            ) : null}
          </div>
        ) : null}

        {rejected ? (
          <p className={styles.hint} role="alert">
            Lance ilegal — nada foi alterado.
          </p>
        ) : null}

        <MoveList
          game={game}
          currentPly={ply}
          onSelectPly={(target) => {
            setPly(target)
            setSelected(null)
          }}
        />
      </div>
    </div>
  )
}
