import type { ReactNode } from 'react'
import styles from './ChessWorkspace.module.css'

/**
 * Composição comum das telas em que a posição é a tarefa principal.
 * O painel tem largura mínima previsível no desktop e vira fluxo normal no
 * mobile; nenhum feedback precisa ser desenhado por cima do tabuleiro.
 */
export function ChessWorkspace({
  board,
  panel,
  below,
}: {
  board: ReactNode
  panel: ReactNode
  below?: ReactNode
}) {
  return (
    <section className={styles.workspace} aria-label="Área de trabalho de xadrez">
      <div className={styles.boardColumn}>{board}</div>
      <aside className={styles.panel}>{panel}</aside>
      {below ? <div className={styles.below}>{below}</div> : null}
    </section>
  )
}
