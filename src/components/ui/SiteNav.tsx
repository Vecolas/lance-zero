'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useIdioma } from '@/components/providers/LocaleProvider'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import type { AppLocale } from '@/lib/i18n/locales'
import type { Tradutor } from '@/lib/i18n/mensagens'
import { traduzirRota } from '@/lib/i18n/rotas'
import { mainNav, mobilePrimaryNav, secondaryNav, type NavItem } from '@/lib/navigation'
import styles from './SiteNav.module.css'

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navLink(
  item: NavItem,
  pathname: string,
  base: string,
  active: string,
  t: Tradutor,
  locale: AppLocale,
) {
  const href = traduzirRota(item.href, locale)
  const current = isActive(pathname, item.href) || isActive(pathname, href)
  return (
    <Link
      key={item.href}
      href={href}
      className={current ? `${base} ${active}` : base}
      aria-current={current ? 'page' : undefined}
    >
      {t(item.labelKey)}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const { locale, t } = useIdioma()

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href={traduzirRota('/', locale)} className={styles.brand}>
          {/*
            A marca é a arte do guia (`identidade-visual/icon.png`), e não mais
            um SVG aproximado dela.

            `<img>` e não `next/image`: o arquivo já é servido no tamanho de
            exibição (128px para 28px de caixa, folga suficiente para telas
            densas) e nunca muda de dimensão, então srcset, negociação de
            formato e carregamento tardio não têm o que otimizar aqui. Em troca,
            `next/image` custa ~1,4 s só para ser importado — num componente que
            está em TODA página.

            `alt=""` porque o nome da marca vem escrito ao lado: repetir aqui
            faria o leitor de tela anunciar "LanceZero LanceZero".
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.brandMark}
            src="/marca/lancezero-icon.png"
            alt=""
            width={28}
            height={28}
            decoding="async"
          />
          <span className={styles.brandName}>
            <span className={styles.brandLance}>Lance</span>
            <span className={styles.brandZero}>Zero</span>
          </span>
        </Link>
        <nav className={styles.desktopNav} aria-label={t('navigation.mainNav')}>
          {mainNav.map((item) =>
            navLink(item, pathname, styles.link, styles.linkActive, t, locale),
          )}
        </nav>
        {/*
          IDIOMA E TEMA SÃO VIZINHOS, e isso é requisito de produto, não estética.
          São os dois controles de APRESENTAÇÃO do app; separá-los faria o aluno
          procurar o idioma no lugar onde ele já encontrou o tema e não achar.

          O grupo tem rótulo próprio para que, num leitor de tela, os dois
          cheguem anunciados como o que são — e não como dois controles soltos no
          meio da navegação.
        */}
        <div className={styles.tools} role="group" aria-label={t('appearance.groupLabel')}>
          {navLink(secondaryNav[0], pathname, styles.link, styles.linkActive, t, locale)}
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export function SiteBottomNav() {
  const pathname = usePathname()
  const { locale, t } = useIdioma()
  const biblioteca = traduzirRota('/lessons', locale)

  return (
    <nav className={styles.bottomNav} aria-label={`${t('navigation.mainNav')} (mobile)`}>
      {mobilePrimaryNav.map((item) =>
        navLink(item, pathname, styles.bottomLink, styles.bottomLinkActive, t, locale),
      )}
      <Link
        href={biblioteca}
        className={
          isActive(pathname, '/lessons') || isActive(pathname, biblioteca)
            ? `${styles.bottomLink} ${styles.bottomLinkActive}`
            : styles.bottomLink
        }
      >
        {t('navigation.library')}
      </Link>
    </nav>
  )
}
