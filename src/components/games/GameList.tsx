'use client'

import Link from 'next/link'
import type { Game } from '@/domain/types'
import styles from './GameList.module.css'

const FONTE: Record<Game['source'], string> = {
  pgn: 'PGN',
  lichess: 'Lichess',
  chesscom: 'Chess.com',
}

function dataCurta(iso: string): string {
  const data = new Date(iso)
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR')
}

export function GameList({ games }: { games: Game[] }) {
  if (games.length === 0) {
    return (
      <p className={styles.state}>
        Nenhuma partida ainda. Importe as suas acima — o LanceZero só consegue descobrir o que perde
        suas partidas depois de ver algumas.
      </p>
    )
  }

  return (
    <ul className={styles.list}>
      {games.map((game) => {
        const revisada = game.humanReview !== undefined
        return (
          <li key={game.id} className={styles.item}>
            <Link href={`/games/${encodeURIComponent(game.id)}`} className={styles.link}>
              <span className={styles.players}>
                {game.white} × {game.black}
              </span>
              <span className={`${styles.badge} ${revisada ? styles.revisada : styles.pendente}`}>
                {revisada ? '✓ Revisada' : '· Sem revisão'}
              </span>
              <span className={styles.meta}>
                <span>{dataCurta(game.playedAt)}</span>
                <span>{FONTE[game.source]}</span>
                <span>{game.result}</span>
                <span>Você jogou de {game.userColor === 'w' ? 'brancas' : 'pretas'}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
