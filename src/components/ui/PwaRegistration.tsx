'use client'

import { useEffect } from 'react'

/** Registra e atualiza o shell offline sem tornar o treino local dependente da rede. */
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | undefined
    let disposed = false

    const announceUpdate = () => {
      if (!disposed && registration?.waiting) {
        window.dispatchEvent(new Event('lancezero:pwa-update'))
      }
    }

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((value) => {
        registration = value
        announceUpdate()
        value.addEventListener('updatefound', () => {
          const worker = value.installing
          if (!worker) return
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announceUpdate()
          })
        })
      })
      .catch(() => {
        // PWA é uma melhoria opcional; o núcleo local-first não depende dele.
      })

    const applyUpdate = () => registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    const reload = () => window.location.reload()
    window.addEventListener('lancezero:pwa-apply', applyUpdate)
    navigator.serviceWorker.addEventListener('controllerchange', reload)

    return () => {
      disposed = true
      window.removeEventListener('lancezero:pwa-apply', applyUpdate)
      navigator.serviceWorker.removeEventListener('controllerchange', reload)
    }
  }, [])

  return null
}
