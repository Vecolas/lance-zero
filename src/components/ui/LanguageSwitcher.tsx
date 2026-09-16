'use client'

/**
 * O seletor PT/EN, vizinho do botão de tema.
 *
 * ELE NÃO MANDA PARA A HOME, e é a regra mais importante deste arquivo. Trocar de
 * idioma no meio da etapa 5 da Italiana tem de continuar na etapa 5 da Italiana,
 * em inglês. A rota é traduzida SEGMENTO A SEGMENTO por `traduzirRota`, e a query
 * string viaja inteira — é ela que carrega `?etapa=` e `?modo=`, ou seja, o
 * checkpoint do aluno.
 *
 * O que muda é a apresentação. O estado pedagógico — jornada, sessão de revisão,
 * FSRS, progresso — está no IndexedDB, indexado por ids que não têm idioma. Nada
 * disso é tocado aqui, e é por isso que a troca é segura no meio de qualquer
 * coisa.
 *
 * DOIS LINKS E NÃO UM BOTÃO. Cada idioma tem endereço próprio, e link é o que se
 * pode abrir em outra aba, copiar e compartilhar. Um botão que navegasse por
 * JavaScript perderia tudo isso e ainda precisaria reimplementar o que o
 * navegador já faz.
 *
 * O COOKIE É GRAVADO NO CLIQUE, antes da navegação. Ele é o que faz a escolha
 * sobreviver ao recarregamento e o que o servidor lê para responder já no idioma
 * certo — sem ele, voltar a `/` depois de escolher inglês traria português de
 * volta, o que se lê como o app ter esquecido.
 *
 * BANDEIRA NÃO É IDIOMA. "PT" e "EN" são siglas de língua; 🇧🇷 e 🇺🇸 são países, e
 * há mais de um país em cada língua. O nome completo vai no `title` e no rótulo
 * acessível.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { useIdioma } from '@/components/providers/LocaleProvider'
import {
  COOKIE_DO_LOCALE,
  NOME_DO_LOCALE,
  SIGLA_DO_LOCALE,
  SUPPORTED_LOCALES,
  VALIDADE_DO_COOKIE_EM_SEGUNDOS,
  type AppLocale,
} from '@/lib/i18n/locales'
import { traduzirRota } from '@/lib/i18n/rotas'
import styles from './LanguageSwitcher.module.css'

/**
 * A query muda por navegação do roteador, e `popstate` cobre voltar/avançar.
 *
 * Não existe evento para `pushState`, então o `usePathname` que já re-renderiza
 * a cada navegação é o que mantém o valor fresco nos demais casos: quando o
 * caminho muda, o componente lê `location.search` de novo.
 */
function assinarNavegacao(aoMudar: () => void) {
  window.addEventListener('popstate', aoMudar)
  return () => window.removeEventListener('popstate', aoMudar)
}

function lembrar(locale: AppLocale) {
  try {
    document.cookie = `${COOKIE_DO_LOCALE}=${locale}; path=/; max-age=${VALIDADE_DO_COOKIE_EM_SEGUNDOS}; samesite=lax`
  } catch {
    // Sem cookie a escolha vale para esta navegação; a URL continua mandando.
  }
}

export function LanguageSwitcher() {
  const { locale, t } = useIdioma()
  const pathname = usePathname()

  /*
    O CAMINHO QUE O NEXT ENTREGA JÁ VEM SEM O PREFIXO no português (a reescrita
    do proxy acontece antes) e COM o prefixo no inglês. `traduzirRota` aceita os
    dois porque tira o prefixo antes de traduzir — e é bom que aceite: depender
    de qual dos dois formatos chega aqui seria depender de um detalhe do proxy.

    A QUERY NÃO VEM DE `useSearchParams`, e a razão é cara: este componente está
    no cabeçalho, logo em TODA página. `useSearchParams` obriga a página inteira
    a sair da renderização estática — o build reprovou em quinze rotas de uma vez
    — e o app perderia o pré-render de tudo por causa de um seletor de idioma.
    Pior: sem estático, o service worker não teria o que pré-carregar, e o modo
    offline iria junto.

    `useSyncExternalStore` lê `location.search` sem forçar nada. No servidor a
    resposta é vazia, e o endereço ganha a query depois da hidratação. O custo
    honesto: com o JavaScript desligado, trocar de idioma numa página com query
    perde a query. Era o mesmo custo com Suspense, que renderizaria o mesmo
    fallback sem query — só que cobrando o pré-render de todas as páginas junto.
  */
  const query = useSyncExternalStore(
    assinarNavegacao,
    () => window.location.search,
    () => '',
  )
  const atual = `${pathname}${query}`

  return (
    <div className={styles.grupo} role="group" aria-label={t('language.change')}>
      {SUPPORTED_LOCALES.map((valor) => {
        const ativo = valor === locale
        return (
          <Link
            key={valor}
            href={traduzirRota(atual, valor)}
            className={ativo ? `${styles.opcao} ${styles.ativa}` : styles.opcao}
            // `aria-current` diz ao leitor de tela qual está em vigor. Sem ele o
            // estado ativo existiria só como cor de fundo, que é a forma de
            // sinalizar que este projeto proíbe.
            aria-current={ativo ? 'true' : undefined}
            title={NOME_DO_LOCALE[valor]}
            hrefLang={valor}
            onClick={() => lembrar(valor)}
          >
            <span aria-hidden="true">{SIGLA_DO_LOCALE[valor]}</span>
            <span className={styles.nomeCompleto}>{NOME_DO_LOCALE[valor]}</span>
          </Link>
        )
      })}
    </div>
  )
}
