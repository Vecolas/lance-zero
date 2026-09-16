'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { RepositoryProvider } from '@/components/providers/RepositoryProvider'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { SiteBottomNav, SiteHeader } from '@/components/ui/SiteNav'
import { PwaRegistration } from '@/components/ui/PwaRegistration'
import { ThemeSync } from '@/components/ui/ThemeSync'
import { AppStatus } from '@/components/ui/AppStatus'
import { PageContainer } from '@/components/ui/primitives'
import { traduzirRota } from '@/lib/i18n/rotas'
import { HOME_ROUTE } from '@/lib/navigation'
import styles from './AppShell.module.css'

/**
 * A casca do app, agora traduzida.
 *
 * ELA VIROU COMPONENTE DE CLIENTE, e vale dizer por quê: o idioma chega pelo
 * contexto, e contexto só existe no cliente. A alternativa — receber o tradutor
 * por prop do layout — pararia aqui, porque `SiteHeader` e `SiteBottomNav` já
 * eram de cliente e precisariam do mesmo tratamento, um nível abaixo.
 *
 * O CUSTO É PEQUENO porque a casca não busca dados: ela monta a estrutura e
 * delega. `children` continua sendo renderizado no servidor — passar um nó já
 * pronto para um componente de cliente não o transforma em cliente.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { locale, t } = useIdioma()
  const pathname = usePathname()

  /*
    O HOJE é a tela inicial do aluno, e o caminho dela muda com o idioma —
    `/dashboard` e `/en/today`. Comparar com a rota traduzida é o que faz a
    checagem valer nos dois, em vez de só no português.
  */
  const noHoje = pathname === traduzirRota(HOME_ROUTE, locale)

  return (
    <div className={styles.shell}>
      <PwaRegistration />
      <ThemeSync />
      <AppStatus />
      <a className="skip-link" href="#conteudo">
        {t('navigation.skipToContent')}
      </a>
      <SiteHeader />
      <main id="conteudo" className={styles.main}>
        <PageContainer>
          <RepositoryProvider>{children}</RepositoryProvider>
        </PageContainer>
      </main>
      {/*
        O RODAPÉ SÓ APARECE NO HOJE, e ficou discreto.

        Ele repetia a promessa da marca e o link de licenças em TODA tela, com o
        peso de uma seção. Num app de treino isso é ruído constante: quem está
        resolvendo um puzzle ou no meio de uma jornada não precisa ler a tagline
        de novo, e a faixa competia com o conteúdo justamente onde a atenção
        importa.

        AS LICENÇAS NÃO SOMEM — elas são obrigação de licença (Stockfish é
        GPL-3.0, e o `docs/LICENSES.md` exige a atribuição visível). O que muda é
        onde: o Hoje é a casa do aluno, a tela por onde ele entra, e o link fica
        lá, em tamanho de nota de rodapé de verdade.
      */}
      {noHoje ? (
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <span>LanceZero · {t('navigation.tagline')}</span>
            <Link href={traduzirRota('/licenses', locale)}>{t('navigation.licenses')}</Link>
          </div>
        </footer>
      ) : null}
      <SiteBottomNav />
    </div>
  )
}
