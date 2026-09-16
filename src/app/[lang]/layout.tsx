import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/ui/AppShell'
import { LocaleProvider } from '@/components/providers/LocaleProvider'
import { THEME_INIT_SCRIPT } from '@/lib/design/theme'
import { HTML_LANG, SUPPORTED_LOCALES, isAppLocale, type AppLocale } from '@/lib/i18n/locales'
import { criarTradutor } from '@/lib/i18n/mensagens'
import '../globals.css'

/**
 * O layout raiz vive DENTRO do segmento de idioma.
 *
 * É o que o guia do App Router manda para um app internacionalizado, e a razão é
 * `<html lang>`: ele muda com o idioma, e o atributo tem de estar certo desde o
 * HTML do servidor. Leitor de tela escolhe a voz por ele — um `lang="pt-BR"` numa
 * página em inglês faz o texto ser lido com fonemas portugueses, o que é pior que
 * não ter o atributo.
 *
 * O PORTUGUÊS NÃO APARECE NA URL. Quem põe o segmento é `proxy.ts`, por
 * REESCRITA: `/aberturas` continua `/aberturas` na barra do navegador e chega
 * aqui como `/pt-BR/aberturas`. As URLs de hoje, que estão em links e favoritos,
 * não mudam.
 */
export const dynamicParams = false

export function generateStaticParams(): { lang: AppLocale }[] {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }))
}

/**
 * Metadata por idioma.
 *
 * A promessa da marca é traduzida — ela é a primeira frase que alguém lê no
 * resultado de busca. O nome do produto não é.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isAppLocale(lang)) return {}
  const t = criarTradutor(lang)

  const titulo =
    lang === 'en'
      ? 'LanceZero — Train what loses your games.'
      : 'LanceZero — Treine o que perde suas partidas.'
  const descricao =
    lang === 'en'
      ? 'LanceZero turns your own mistakes into directed training: diagnosis, guided practice, spaced review and verification on a real board.'
      : 'LanceZero transforma os erros das suas partidas em treino dirigido: diagnóstico, prática guiada, revisão espaçada e verificação no tabuleiro real.'

  return {
    title: { default: titulo, template: '%s · LanceZero' },
    description: descricao,
    applicationName: 'LanceZero',
    // `alternates` diz ao buscador que as duas páginas são a mesma coisa em
    // idiomas diferentes — sem isso elas competem entre si no índice.
    alternates: {
      languages: {
        'pt-BR': '/',
        en: '/en',
      },
    },
    other: { 'lancezero-locale': t('language.label') },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F9FB' },
    { media: '(prefers-color-scheme: dark)', color: '#07131C' },
  ],
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  // Locale fora da allowlist é 404 e não fallback silencioso: `/de/aberturas`
  // mostrando português seria o app fingindo um idioma que não fala.
  if (!isAppLocale(lang)) notFound()

  return (
    <html lang={HTML_LANG[lang]} suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura, para a tela não piscar. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <LocaleProvider locale={lang}>
          <AppShell>{children}</AppShell>
        </LocaleProvider>
      </body>
    </html>
  )
}
