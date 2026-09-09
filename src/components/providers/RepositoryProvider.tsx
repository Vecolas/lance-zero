'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createDefaultProfile } from '@/domain/profile'
import type { UserProfile } from '@/domain/types'
import { IndexedDbTrainingRepository } from '@/lib/storage/indexeddb-repository'
import type { BackupRepository } from '@/lib/storage/repository'

export type RepositoryStatus = 'carregando' | 'pronto' | 'erro'

interface RepositoryValue {
  status: RepositoryStatus
  /** Só existe quando `status` é 'pronto'. */
  repo: BackupRepository | null
  profile: UserProfile | null
  erro: string | null
  saveProfile: (profile: UserProfile) => Promise<void>
  /** Faz as telas relerem os dados depois de uma escrita externa. */
  refresh: () => void
  /** Muda a cada refresh; use como dependência de efeito. */
  revision: number
}

const RepositoryContext = createContext<RepositoryValue | null>(null)

/**
 * Dá às telas um repositório já aberto, sem que nenhuma delas fale com o
 * IndexedDB diretamente. Local-first: se o navegador bloquear o banco, o app
 * diz isso em vez de quebrar em silêncio.
 */
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RepositoryStatus>('carregando')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [repo, setRepo] = useState<BackupRepository | null>(null)

  useEffect(() => {
    let cancelado = false

    async function abrir() {
      try {
        const aberto = new IndexedDbTrainingRepository()
        let perfil = await aberto.getProfile()
        if (!perfil) {
          perfil = createDefaultProfile(crypto.randomUUID(), new Date())
          await aberto.saveProfile(perfil)
        }
        if (cancelado) return
        setRepo(aberto)
        setProfile(perfil)
        setStatus('pronto')
      } catch (e) {
        if (cancelado) return
        setErro(
          e instanceof Error
            ? `Não consegui abrir o armazenamento local: ${e.message}`
            : 'Não consegui abrir o armazenamento local.',
        )
        setStatus('erro')
      }
    }

    void abrir()
    return () => {
      cancelado = true
    }
  }, [])

  const saveProfile = useCallback(
    async (proximo: UserProfile) => {
      if (!repo) return
      await repo.saveProfile(proximo)
      setProfile(proximo)
    },
    [repo],
  )

  const refresh = useCallback(() => setRevision((r) => r + 1), [])

  const value = useMemo<RepositoryValue>(
    () => ({
      status,
      repo,
      profile,
      erro,
      saveProfile,
      refresh,
      revision,
    }),
    [status, repo, profile, erro, saveProfile, refresh, revision],
  )

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
}

export function useRepository(): RepositoryValue {
  const value = useContext(RepositoryContext)
  if (!value) {
    throw new Error('useRepository precisa estar dentro de <RepositoryProvider>.')
  }
  return value
}
