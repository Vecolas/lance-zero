/**
 * As mensagens de interface, e a função que as lê.
 *
 * NÃO ENTROU BIBLIOTECA, e a decisão é declarada. `next-intl` e equivalentes
 * resolvem roteamento, negociação, formatação e ICU — e o projeto já tem o
 * roteamento (`rotas.ts`), a negociação (`proxy.ts`) e a formatação (`Intl`
 * nativo, que a biblioteca também usa por baixo). O que sobraria seria
 * interpolação e plural, que são as sessenta linhas abaixo.
 *
 * O CLAUDE.md pede que dependência nova seja justificada por necessidade
 * demonstrada, e a necessidade aqui não se demonstra: o custo de uma dependência
 * de roteamento é ela decidir por você como as URLs se comportam, e este produto
 * tem um requisito específico — o português continua SEM prefixo. Se um dia o
 * catálogo de idiomas crescer a ponto de precisar de negociação por região,
 * carregamento parcial e ferramentas de tradução, a troca é local: `traduzir`
 * vira a chamada da biblioteca e nada mais muda.
 *
 * O CARREGAMENTO É EXPLÍCITO, um `import` por idioma, e não um caminho montado a
 * partir do valor recebido. Locale chega por URL e por cookie; montar
 * `import('../../messages/' + locale)` transformaria uma preferência de idioma
 * numa leitura de arquivo escolhida por quem manda a requisição.
 */

import ptBR from '../../../messages/pt-BR.json'
import en from '../../../messages/en.json'
import { DEFAULT_LOCALE, type AppLocale } from './locales'

/** O formato das mensagens vem do PORTUGUÊS: ele é a fonte, o inglês acompanha. */
export type Mensagens = typeof ptBR

const DICIONARIOS: Record<AppLocale, Mensagens> = {
  'pt-BR': ptBR,
  en: en as Mensagens,
}

export function dicionario(locale: AppLocale): Mensagens {
  return DICIONARIOS[locale] ?? DICIONARIOS[DEFAULT_LOCALE]
}

/**
 * Caminhos válidos dentro das mensagens, como `roadmap.filters.all`.
 *
 * O tipo é o que transforma erro de digitação em erro de compilação. Sem ele, um
 * `t('roadmap.filtres.all')` passaria pelo build e apareceria na tela como a
 * própria chave — que é o defeito que o §159 do plano proíbe.
 */
type Folhas<T> = T extends string
  ? ''
  : {
      [K in keyof T & string]: Folhas<T[K]> extends '' ? K : `${K}.${Folhas<T[K]>}`
    }[keyof T & string]

export type ChaveDeMensagem = Folhas<Mensagens>

function buscar(mensagens: Mensagens, chave: string): string | undefined {
  let atual: unknown = mensagens
  for (const parte of chave.split('.')) {
    if (typeof atual !== 'object' || atual === null) return undefined
    atual = (atual as Record<string, unknown>)[parte]
  }
  return typeof atual === 'string' ? atual : undefined
}

export type Valores = Record<string, string | number>

/**
 * Interpola `{nome}` e resolve `{count, plural, one {...} other {...}}`.
 *
 * O PLURAL NÃO É CONCATENAÇÃO, e é por isso que existe aqui. `count + ' revisões'`
 * erra em português no singular e erra de outro jeito em inglês; e nas línguas
 * que virão depois erra de mais jeitos ainda. A forma ICU põe a decisão no texto,
 * onde quem traduz consegue vê-la.
 *
 * `#` vira o número, como no ICU.
 */
function interpolar(texto: string, valores: Valores, locale: AppLocale): string {
  const comPlural = texto.replace(
    /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\s*\}/g,
    (_todo, nome: string, um: string, outros: string) => {
      const quantidade = Number(valores[nome] ?? 0)
      const regra = new Intl.PluralRules(locale).select(quantidade)
      const escolhido = regra === 'one' ? um : outros
      return escolhido.replace(/#/g, new Intl.NumberFormat(locale).format(quantidade))
    },
  )

  return comPlural.replace(/\{(\w+)\}/g, (todo, nome: string) => {
    const valor = valores[nome]
    return valor === undefined ? todo : String(valor)
  })
}

/**
 * O que fazer com uma chave que não existe.
 *
 * EM DESENVOLVIMENTO, LANÇA: chave errada é defeito de código, e defeito de
 * código tem de aparecer enquanto quem o criou ainda está olhando.
 *
 * EM PRODUÇÃO, cai para o português e registra. Mostrar `roadmap.filters.all`
 * para o aluno seria expor o encanamento; derrubar a tela por causa de um rótulo
 * seria pior ainda. O fallback é o padrão porque ele é o idioma completo.
 */
function ausente(chave: string, locale: AppLocale): string {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(`Mensagem ausente: "${chave}" em ${locale}`)
  }
  console.error(`[i18n] mensagem ausente: ${chave} (${locale})`)
  return buscar(DICIONARIOS[DEFAULT_LOCALE], chave) ?? ''
}

/** Cria o tradutor de um idioma. É o que as telas recebem. */
export function criarTradutor(locale: AppLocale) {
  const mensagens = dicionario(locale)
  return function traduzir(chave: ChaveDeMensagem, valores: Valores = {}): string {
    const texto = buscar(mensagens, chave)
    if (texto === undefined) return ausente(chave, locale)
    return interpolar(texto, valores, locale)
  }
}

export type Tradutor = ReturnType<typeof criarTradutor>
