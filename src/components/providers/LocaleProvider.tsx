'use client'

/**
 * O idioma ativo, disponível para os componentes de cliente.
 *
 * POR QUE UM PROVIDER, se o servidor já sabe o locale: metade das telas do
 * LanceZero é `'use client'` — elas leem IndexedDB, jogam no tabuleiro, montam
 * jornadas. Passar o locale por prop até lá seria prop drilling por seis níveis,
 * e o primeiro componente que alguém esquecesse de ligar ficaria em português
 * dentro de uma tela em inglês. O contexto torna esse esquecimento impossível.
 *
 * O LOCALE VEM DO SERVIDOR, sempre. Ele é decidido no layout, que o lê da URL —
 * então o HTML já sai no idioma certo e não existe o pisca-pisca de renderizar em
 * português e trocar depois. Ler `window.location` aqui reintroduziria exatamente
 * esse defeito.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { criarTradutor, type Tradutor } from '@/lib/i18n/mensagens'
import { DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/locales'

interface ContextoDeIdioma {
  locale: AppLocale
  t: Tradutor
}

const Contexto = createContext<ContextoDeIdioma | null>(null)

export function LocaleProvider({ locale, children }: { locale: AppLocale; children: ReactNode }) {
  const valor = useMemo<ContextoDeIdioma>(() => ({ locale, t: criarTradutor(locale) }), [locale])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

/**
 * O idioma e o tradutor.
 *
 * FORA DO PROVIDER devolve o padrão em vez de lançar. A razão é de teste: dezenas
 * de testes de componente montam uma tela isolada, e obrigá-los todos a embrulhar
 * num provider os faria medir o encanamento em vez do comportamento. O custo
 * aceito é que um componente esquecido fora da árvore aparece em português — e é
 * por isso que existe o portão que varre as telas atrás de texto solto.
 */
export function useIdioma(): ContextoDeIdioma {
  const valor = useContext(Contexto)
  return valor ?? PADRAO
}

const PADRAO: ContextoDeIdioma = { locale: DEFAULT_LOCALE, t: criarTradutor(DEFAULT_LOCALE) }

/** Atalho para quem só precisa traduzir. */
export function useTraduzir(): Tradutor {
  return useIdioma().t
}
