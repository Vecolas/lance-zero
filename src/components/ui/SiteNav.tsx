'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { mainNav, mobilePrimaryNav, type NavItem } from '@/lib/navigation'
import styles from './SiteNav.module.css'

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function navLink(item: NavItem, pathname: string, base: string, active: string) {
  const current = isActive(pathname, item.href)
  return (
    <Link
      key={item.href}
      href={item.href}
      className={current ? `${base} ${active}` : base}
      aria-current={current ? 'page' : undefined}
    >
      {item.label}
    </Link>
  )
}

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
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
        <nav className={styles.desktopNav} aria-label="Navegação principal">
          {mainNav.map((item) => navLink(item, pathname, styles.link, styles.linkActive))}
        </nav>
        <div className={styles.tools}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export function SiteBottomNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.bottomNav} aria-label="Navegação principal (mobile)">
      {mobilePrimaryNav.map((item) =>
        navLink(item, pathname, styles.bottomLink, styles.bottomLinkActive),
      )}
      <Link
        href="/lessons"
        className={
          isActive(pathname, '/lessons')
            ? `${styles.bottomLink} ${styles.bottomLinkActive}`
            : styles.bottomLink
        }
      >
        Mais
      </Link>
    </nav>
  )
}
