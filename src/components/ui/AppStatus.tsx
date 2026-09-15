'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import styles from './AppStatus.module.css'

export function AppStatus() {
  const online = useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange)
      window.addEventListener('offline', onChange)
      return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
      }
    },
    () => navigator.onLine,
    () => true,
  )
  const offline = !online
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true)

    window.addEventListener('lancezero:pwa-update', onUpdate)

    return () => {
      window.removeEventListener('lancezero:pwa-update', onUpdate)
    }
  }, [])

  if (!offline && !updateReady) return null

  return (
    <div className={styles.region} aria-live="polite">
      {offline ? (
        <p className={styles.message} role="status">
          Você está offline. O treino local continua disponível; sincronização fica pausada até a
          conexão voltar.
        </p>
      ) : null}
      {updateReady ? (
        <p className={styles.message} role="status">
          Uma versão nova do LanceZero está pronta.{' '}
          <button
            type="button"
            className={styles.action}
            onClick={() => window.dispatchEvent(new Event('lancezero:pwa-apply'))}
          >
            Atualizar agora
          </button>
        </p>
      ) : null}
    </div>
  )
}
