/**
 * O portão da primeira visita: ELA NÃO RECARREGA.
 *
 * `sw.js` chama `skipWaiting()` e `clients.claim()` de propósito, para o modo
 * offline valer já na primeira visita. O preço é que o worker assume a página
 * que já está aberta, e assumir dispara `controllerchange`.
 *
 * Enquanto `controllerchange` recarregava sem perguntar, toda primeira visita em
 * produção se recarregava sozinha no meio do que a pessoa estivesse fazendo — um
 * puzzle começado, um PGN colado, uma nota digitada. E era invisível em
 * desenvolvimento, porque o registro só acontece em produção: o defeito existia
 * só para quem usava o app de verdade. No e2e de produção ele derrubava dezenas
 * de testes de telas sem nenhuma relação com PWA.
 *
 * Estes testes rodam com `NODE_ENV` de produção forçado, porque é o único modo
 * em que o componente faz alguma coisa. Sem isso eles passariam sem tocar em
 * nada — verde por não executar, que é o pior tipo de verde.
 */

import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Um `navigator.serviceWorker` de mentira, com os ouvintes acessíveis. */
function montarServiceWorker(controller: object | null) {
  const ouvintes = new Map<string, Set<() => void>>()
  const registro = {
    waiting: null,
    installing: null,
    addEventListener: vi.fn(),
  }
  return {
    api: {
      controller,
      register: vi.fn(() => Promise.resolve(registro)),
      addEventListener: (tipo: string, ouvinte: () => void) => {
        if (!ouvintes.has(tipo)) ouvintes.set(tipo, new Set())
        ouvintes.get(tipo)!.add(ouvinte)
      },
      removeEventListener: (tipo: string, ouvinte: () => void) => {
        ouvintes.get(tipo)?.delete(ouvinte)
      },
    },
    disparar(tipo: string) {
      for (const ouvinte of ouvintes.get(tipo) ?? []) ouvinte()
    },
  }
}

const recarregar = vi.fn()

beforeEach(() => {
  // Desfeito AQUI, e não no `afterEach`: a limpeza do Testing Library desmonta o
  // componente depois dele, e o desmonte chama `removeEventListener` no
  // `navigator.serviceWorker`. Tirar o global antes disso derrubaria a limpeza
  // com um erro que não tem nada a ver com o que o teste mede.
  vi.unstubAllGlobals()
  vi.stubEnv('NODE_ENV', 'production')
  recarregar.mockClear()
  // `window.location.reload` não é escrevível no jsdom; a propriedade inteira é
  // substituída, e restaurada no `afterEach`.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: recarregar },
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

async function montarTela(controller: object | null) {
  const sw = montarServiceWorker(controller)
  vi.stubGlobal('navigator', { ...navigator, serviceWorker: sw.api })
  const { PwaRegistration } = await import('@/components/ui/PwaRegistration')
  render(<PwaRegistration />)
  // Deixa o `.then` do `register` resolver antes de o teste disparar eventos.
  await Promise.resolve()
  return sw
}

describe('registro do service worker', () => {
  it('a PRIMEIRA visita não recarrega quando o worker assume a página', async () => {
    const sw = await montarTela(null)
    sw.disparar('controllerchange')
    expect(recarregar).not.toHaveBeenCalled()
  })

  /**
   * Com um controlador anterior, `controllerchange` significa "uma versão nova
   * substituiu a que estava rodando" — o único caso em que recarregar serve para
   * alguma coisa. Sem isto, aplicar uma atualização deixaria a pessoa numa
   * mistura de código velho na tela e código novo no worker.
   */
  it('a ATUALIZAÇÃO recarrega, porque aí existe versão anterior para substituir', async () => {
    const sw = await montarTela({ scriptURL: '/sw.js' })
    sw.disparar('controllerchange')
    expect(recarregar).toHaveBeenCalledTimes(1)
  })

  it('não recarrega duas vezes se o evento repetir', async () => {
    const sw = await montarTela({ scriptURL: '/sw.js' })
    sw.disparar('controllerchange')
    sw.disparar('controllerchange')
    expect(recarregar).toHaveBeenCalledTimes(1)
  })
})
