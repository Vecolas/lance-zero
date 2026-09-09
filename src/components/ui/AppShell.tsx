import Link from 'next/link'
import type { ReactNode } from 'react'
import { SiteBottomNav, SiteHeader } from '@/components/ui/SiteNav'
import styles from './AppShell.module.css'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span>LanceZero · Treine o que perde suas partidas.</span>
          <span>
            <Link href="/licenses">Licenças e fontes de dados</Link>
          </span>
        </div>
      </footer>
      <SiteBottomNav />
    </div>
  )
}
