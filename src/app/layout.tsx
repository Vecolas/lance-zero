import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AppShell } from '@/components/ui/AppShell'
import { THEME_INIT_SCRIPT } from '@/lib/design/theme'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'LanceZero — Treine o que perde suas partidas.',
    template: '%s · LanceZero',
  },
  description:
    'LanceZero transforma os erros das suas partidas em treino dirigido: diagnóstico, prática guiada, revisão espaçada e verificação no tabuleiro real.',
  applicationName: 'LanceZero',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F9FB' },
    { media: '(prefers-color-scheme: dark)', color: '#07131C' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura, para a tela não piscar. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
