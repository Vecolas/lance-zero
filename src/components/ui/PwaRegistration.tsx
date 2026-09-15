'use client'

import { useEffect } from 'react'

/**
 * Registra o shell offline apenas em produção.
 *
 * O registro não participa da renderização: falha de suporte ou de rede não
 * pode impedir o treino local, que continua funcionando sem service worker.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return
    }

    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // PWA é uma melhoria opcional; o núcleo local-first não depende dele.
    })
  }, [])

  return null
}
