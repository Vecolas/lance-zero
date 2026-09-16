/**
 * Os idiomas do LanceZero.
 *
 * `pt-BR` CONTINUA SENDO O PADRÃO, e a decisão é de produto: o app nasceu em
 * português, o conteúdo pedagógico foi escrito em português, e as URLs atuais são
 * portuguesas. Trocar o padrão para inglês quebraria links existentes e trocaria
 * o idioma de quem já usa o app — um custo alto para ganhar nada.
 *
 * `pt-BR` E NÃO `pt`. A diferença importa para formatação: `Intl` com `pt`
 * escolhe convenções que não são as do Brasil em alguns casos, e o produto é
 * PT-BR-first por definição. Um dia haverá `pt-PT`, e aí a distinção já estará
 * feita.
 *
 * LOCALE NÃO É ENTRADA CONFIÁVEL. Ele chega por URL, por cookie e por cabeçalho
 * do navegador — três fontes que o app não controla. Toda leitura passa por
 * `normalizarLocale`, que só devolve valores desta lista. Sem isso, um locale
 * inventado viraria caminho de import dinâmico, que é como se transforma uma
 * preferência de idioma numa leitura de arquivo arbitrária.
 */

export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'pt-BR'

/**
 * O idioma que aparece na URL.
 *
 * O padrão NÃO tem prefixo: `/aberturas` continua sendo `/aberturas`, e o inglês
 * mora em `/en/...`. Preservar as URLs existentes é requisito — elas estão em
 * links, favoritos e no índice de busca.
 */
export const PREFIXO_DO_LOCALE: Record<AppLocale, string> = {
  'pt-BR': '',
  en: '/en',
}

/** O nome do idioma NO PRÓPRIO idioma: é assim que um seletor se lê. */
export const NOME_DO_LOCALE: Record<AppLocale, string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
}

/** A sigla curta do seletor. Duas letras, porque o controle é apertado. */
export const SIGLA_DO_LOCALE: Record<AppLocale, string> = {
  'pt-BR': 'PT',
  en: 'EN',
}

/** O valor de `<html lang>`. */
export const HTML_LANG: Record<AppLocale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en',
}

export function isAppLocale(valor: unknown): valor is AppLocale {
  return typeof valor === 'string' && SUPPORTED_LOCALES.includes(valor as AppLocale)
}

/**
 * Qualquer coisa vira um locale suportado, ou o padrão.
 *
 * Aceita variantes regionais (`en-US`, `en-GB` → `en`; `pt`, `pt-PT` → `pt-BR`)
 * porque é isso que o cabeçalho do navegador manda. Não aceita nada além:
 * `../../etc/passwd` vira `pt-BR`, e é esse o ponto.
 */
export function normalizarLocale(valor: unknown): AppLocale {
  if (typeof valor !== 'string') return DEFAULT_LOCALE
  if (isAppLocale(valor)) return valor

  const base = valor.toLowerCase().split('-')[0]
  if (base === 'en') return 'en'
  if (base === 'pt') return 'pt-BR'
  return DEFAULT_LOCALE
}

/**
 * O locale escrito no começo de um caminho, se houver.
 *
 * `/en/aberturas` → `en`. `/aberturas` → `null`, que é diferente de "pt-BR": o
 * caminho sem prefixo NÃO declara idioma, e quem decide aí é a preferência
 * gravada. Devolver `pt-BR` aqui apagaria essa diferença e faria a URL sem
 * prefixo sobrepor a escolha do aluno.
 */
export function localeDoCaminho(caminho: string): AppLocale | null {
  for (const locale of SUPPORTED_LOCALES) {
    const prefixo = PREFIXO_DO_LOCALE[locale]
    if (prefixo === '') continue
    if (caminho === prefixo || caminho.startsWith(`${prefixo}/`)) return locale
  }
  return null
}

/** O caminho sem o prefixo de idioma. `/en/aberturas` → `/aberturas`. */
export function caminhoSemLocale(caminho: string): string {
  const locale = localeDoCaminho(caminho)
  if (locale === null) return caminho
  const resto = caminho.slice(PREFIXO_DO_LOCALE[locale].length)
  return resto === '' ? '/' : resto
}

/** O caminho COM o prefixo do idioma pedido. */
export function caminhoComLocale(caminho: string, locale: AppLocale): string {
  const limpo = caminhoSemLocale(caminho)
  const prefixo = PREFIXO_DO_LOCALE[locale]
  if (prefixo === '') return limpo
  return limpo === '/' ? prefixo : `${prefixo}${limpo}`
}

/** O nome do cookie que guarda a preferência. Um só, e é este. */
export const COOKIE_DO_LOCALE = 'lancezero-locale'

/** Um ano: a preferência de idioma não é uma decisão que se revisita todo mês. */
export const VALIDADE_DO_COOKIE_EM_SEGUNDOS = 60 * 60 * 24 * 365
