'use client'

import { useEffect, useState } from 'react'
import styles from './AppStatus.module.css'

export function AppStatus() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  )
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    const onUpdate = () => setUpdateReady(true)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('lancezero:pwa-update', onUpdate)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
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
