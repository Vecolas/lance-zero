'use client'

import { useEffect } from 'react'

/**
 * Registra e atualiza o shell offline sem tornar o treino local dependente da
 * rede.
 *
 * A PRIMEIRA VISITA NÃO RECARREGA, e esta é a regra que o arquivo carrega.
 *
 * `sw.js` chama `skipWaiting()` na instalação e `clients.claim()` na ativação:
 * de propósito, para o modo offline valer já na primeira visita. O efeito
 * colateral é que o worker assume a página que JÁ ESTÁ ABERTA, e assumir dispara
 * `controllerchange` — que aqui recarregava.
 *
 * Ou seja: toda primeira visita em produção recarregava sozinha, no meio do que
 * a pessoa estivesse fazendo. Um puzzle começado, um PGN colado, uma nota
 * digitada: tudo isso voltava à estaca zero sem uma palavra. Era invisível em
 * desenvolvimento, porque o registro só acontece em produção — então o defeito
 * só existia para quem usava o app de verdade.
 *
 * Também derrubava o e2e de produção em dezenas de testes de telas que não têm
 * nada a ver com PWA: a página navegava embaixo do teste, e o relatório dizia
 * "execution context was destroyed" em `finais`, `calculo`, `treino`,
 * `aberturas`. Nenhum deles tinha defeito.
 *
 * O CONSERTO: recarregar só quando havia um controlador ANTES. Aí `controllerchange`
 * significa "uma versão nova substituiu a que estava rodando" — que é o único
 * caso em que recarregar serve para alguma coisa. Na primeira instalação não há
 * o que substituir, e o worker passa a valer na navegação seguinte, sozinho.
 */
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return

    /**
     * Havia um worker no comando quando esta página abriu?
     *
     * Lido UMA VEZ, agora: depois que o `controllerchange` dispara o campo já
     * mudou, e a pergunta deixaria de ter resposta.
     */
    const jaTinhaControlador = navigator.serviceWorker.controller !== null
    let recarregando = false

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
    const reload = () => {
      // Primeira instalação: não há versão anterior para substituir.
      if (!jaTinhaControlador || recarregando) return
      recarregando = true
      window.location.reload()
    }
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
