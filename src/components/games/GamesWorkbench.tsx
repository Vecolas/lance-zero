'use client'

import { useCallback, useEffect, useState } from 'react'
import { PgnWorkbench } from '@/components/chess/PgnWorkbench'
import { GameImportPanel } from '@/components/games/GameImportPanel'
import { GameList } from '@/components/games/GameList'
import { useRepository } from '@/components/providers/RepositoryProvider'
import type { Game } from '@/domain/types'
import styles from './GameList.module.css'

export function GamesWorkbench() {
  const { status, repo, erro, revision } = useRepository()
  const [games, setGames] = useState<Game[] | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)

  const recarregar = useCallback(() => setRecarga((r) => r + 1), [])

  useEffect(() => {
    if (!repo) return
    let cancelado = false

    async function carregar() {
      if (!repo) return
      try {
        const lista = await repo.listGames({ limit: 100 })
        if (!cancelado) setGames(lista)
      } catch (e) {
        if (!cancelado) setFalha(e instanceof Error ? e.message : 'Não consegui ler suas partidas.')
      }
    }

    void carregar()
    return () => {
      cancelado = true
    }
  }, [repo, revision, recarga])

  if (status === 'carregando') return <p className={styles.state}>Abrindo seus dados locais…</p>
  if (status === 'erro' || falha) {
    return (
      <p className={styles.state} role="alert">
        {falha ?? erro}
      </p>
    )
  }

  return (
    <>
      <GameImportPanel onImported={recarregar} />

      <h2>Suas partidas</h2>
      {games === null ? (
        <p className={styles.state}>Lendo suas partidas…</p>
      ) : (
        <GameList games={games} />
      )}

      <h2>Ver uma posição avulsa</h2>
      <p>
        Para estudar um PGN ou um FEN sem guardar nada. O que você importa acima fica salvo e pode
        ser revisado.
      </p>
      <PgnWorkbench />
    </>
  )
}
