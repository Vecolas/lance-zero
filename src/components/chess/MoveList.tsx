'use client'

import { toMovePairs, type ChessGame, type Ply } from '@/lib/chess'
import styles from './MoveList.module.css'

export interface MoveListProps {
  game: ChessGame
  currentPly: number
  onSelectPly: (ply: number) => void
}

function MoveCell({
  ply,
  currentPly,
  onSelectPly,
}: {
  ply: Ply | null
  currentPly: number
  onSelectPly: (ply: number) => void
}) {
  if (!ply) return <td className={styles.cell} />
  const isCurrent = ply.index === currentPly
  return (
    <td className={styles.cell}>
      <button
        type="button"
        className={isCurrent ? `${styles.move} ${styles.current}` : styles.move}
        aria-current={isCurrent ? 'step' : undefined}
        onClick={() => onSelectPly(ply.index)}
      >
        {ply.san}
      </button>
    </td>
  )
}

/**
 * Lista textual de lances. É também a alternativa acessível ao tabuleiro:
 * dá para percorrer a partida inteira só por aqui, com teclado.
 */
export function MoveList({ game, currentPly, onSelectPly }: MoveListProps) {
  const pairs = toMovePairs(game)

  return (
    <div className={styles.wrapper}>
      {pairs.length === 0 ? (
        <p className={styles.empty}>Nenhum lance ainda. Arraste uma peça ou carregue um PGN.</p>
      ) : (
        <table className={styles.table}>
          <caption className="sr-only">Lances da partida</caption>
          <tbody>
            {pairs.map((pair, i) => (
              <tr key={`${pair.moveNumber}-${i}`}>
                <th scope="row" className={styles.number}>
                  {pair.moveNumber}.
                </th>
                <MoveCell ply={pair.white} currentPly={currentPly} onSelectPly={onSelectPly} />
                <MoveCell ply={pair.black} currentPly={currentPly} onSelectPly={onSelectPly} />
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
