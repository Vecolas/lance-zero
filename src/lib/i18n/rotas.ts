/**
 * A tradução de ROTA entre idiomas.
 *
 * A REGRA QUE ESTE ARQUIVO CUMPRE: trocar de idioma não pode jogar o aluno para
 * a home. Se ele está na etapa 5 da Italiana e clica em EN, ele continua na etapa
 * 5 da Italiana — em inglês. O que muda é a apresentação, nunca o estado
 * pedagógico.
 *
 * COMO ISSO É FEITO SEM UMA TABELA DE TODAS AS URLs: o caminho é decomposto em
 * SEGMENTOS, e só os segmentos que são nome de seção têm tradução. Tudo o mais —
 * slug de abertura, id de lição, id de etapa — é IDENTIFICADOR, e identificador
 * não se traduz. `/aberturas/italiana` e `/en/openings/italiana` apontam para o
 * mesmo curso porque `italiana` é o id dele nos dois idiomas.
 *
 * POR QUE O SLUG NÃO É TRADUZIDO, e é uma decisão declarada: traduzir slug
 * dinâmico exigiria um mapa por conteúdo, mantido à mão, em dois idiomas — e o
 * dia em que ele divergisse do catálogo produziria um link que abre a abertura
 * errada. O plano prevê essa escolha (§32): manter o slug canônico primeiro,
 * localizar depois, sem bloquear a internacionalização inteira por causa disso.
 *
 * A QUERY STRING VIAJA INTEIRA. Ela carrega `?etapa=` e `?modo=`, que são o
 * checkpoint do aluno. Perdê-la na troca de idioma seria a mesma falha de mandar
 * para a home, só que mais difícil de notar.
 */

import { DEFAULT_LOCALE, caminhoSemLocale, type AppLocale } from './locales'

/**
 * Os nomes de seção, por idioma.
 *
 * A CHAVE É CANÔNICA e independe dos dois: `openings` é o nome interno da seção,
 * e as duas colunas são apresentação. Sem uma chave própria, traduzir de PT para
 * EN exigiria procurar em qual coluna o segmento estava — e um segmento que
 * existisse nas duas (`roadmap`) viraria ambiguidade.
 */
export const SEGMENTOS_DE_ROTA = {
  today: { 'pt-BR': 'dashboard', en: 'today' },
  training: { 'pt-BR': 'train', en: 'training' },
  review: { 'pt-BR': 'revisao', en: 'review' },
  practice: { 'pt-BR': 'pratica', en: 'practice' },
  journey: { 'pt-BR': 'jornada', en: 'journey' },

  /*
    ABERTURAS E FINAIS NÃO SÃO TRADUZIDOS, e a razão é concreta: as duas grafias
    JÁ EXISTEM neste app, como rotas DIFERENTES.

    `/aberturas` é a jornada de estudo; `/openings` é a bancada de repertório.
    `/finais` é a jornada; `/endgames` é a biblioteca antiga. Quatro telas, quatro
    endereços.

    Traduzir o segmento fazia `/openings` ser reescrito para `/aberturas` e
    `/endgames/mate-de-dama` para `/finais/mate-de-dama` — que não existe. Duas
    telas do produto sumiram, e a varredura de contraste parou de medir uma
    terceira porque nunca chegava a ela. O sequestro foi silencioso: o app
    respondia 404 numa e a tela errada na outra.

    O plano prevê esta saída (§27): no primeiro ciclo, `/en/aberturas` é
    aceitável. Traduzir estes dois segmentos exige antes resolver a duplicação
    `/aberturas` × `/openings`, que é outro trabalho — e fazê-lo por dentro da
    internacionalização seria escondê-lo aqui.
  */
  games: { 'pt-BR': 'games', en: 'games' },
  puzzles: { 'pt-BR': 'puzzles', en: 'puzzles' },
  calculate: { 'pt-BR': 'calculate', en: 'calculate' },
  onboarding: { 'pt-BR': 'onboarding', en: 'onboarding' },
  settings: { 'pt-BR': 'settings', en: 'settings' },
  account: { 'pt-BR': 'account', en: 'account' },
  licenses: { 'pt-BR': 'licenses', en: 'licenses' },
  roadmap: { 'pt-BR': 'roadmap', en: 'roadmap' },
  lessons: { 'pt-BR': 'lessons', en: 'lessons' },
} as const satisfies Record<string, Record<AppLocale, string>>

export type SegmentoDeRota = keyof typeof SEGMENTOS_DE_ROTA

/** Índice reverso: qual chave canônica um segmento escrito representa. */
const CHAVE_POR_SEGMENTO: ReadonlyMap<string, SegmentoDeRota> = new Map(
  Object.entries(SEGMENTOS_DE_ROTA).flatMap(([chave, porLocale]) =>
    Object.values(porLocale).map((escrito) => [escrito, chave as SegmentoDeRota] as const),
  ),
)

/**
 * Traduz UM segmento. O que não é nome de seção volta intacto.
 *
 * É aqui que mora a separação entre apresentação e identificador: `aberturas`
 * vira `openings`, e `italiana` continua `italiana` porque não está na tabela.
 * Traduzir por acidente um id seria transformar o seletor de idioma numa máquina
 * de quebrar links.
 */
export function traduzirSegmento(segmento: string, para: AppLocale): string {
  const chave = CHAVE_POR_SEGMENTO.get(segmento)
  return chave ? SEGMENTOS_DE_ROTA[chave][para] : segmento
}

/**
 * O MESMO lugar, no outro idioma.
 *
 * Recebe o caminho com ou sem prefixo, devolve o caminho já prefixado para o
 * idioma pedido. A query e o fragmento viajam junto: eles carregam o checkpoint.
 */
export function traduzirRota(caminhoCompleto: string, para: AppLocale): string {
  const [semFragmento, fragmento] = separar(caminhoCompleto, '#')
  const [caminho, query] = separar(semFragmento, '?')

  const traduzido = caminhoSemLocale(caminho)
    .split('/')
    .map((segmento) => (segmento === '' ? segmento : traduzirSegmento(segmento, para)))
    .join('/')

  const base = traduzido === '' ? '/' : traduzido
  const prefixo = para === DEFAULT_LOCALE ? '' : `/${para}`
  const comPrefixo = base === '/' && prefixo !== '' ? prefixo : `${prefixo}${base}`

  return `${comPrefixo}${query ? `?${query}` : ''}${fragmento ? `#${fragmento}` : ''}`
}

function separar(texto: string, marca: string): [string, string | null] {
  const corte = texto.indexOf(marca)
  if (corte < 0) return [texto, null]
  return [texto.slice(0, corte), texto.slice(corte + 1)]
}

/**
 * O caminho INTERNO que o Next deve renderizar.
 *
 * O app vive em `src/app/[lang]/...` com os nomes de pasta em português — que são
 * os nomes de hoje, preservados para não renomear vinte e seis rotas. Um pedido
 * em inglês (`/en/openings/italiana`) é reescrito para a árvore real
 * (`/en/aberturas/italiana`), e um pedido sem prefixo ganha o locale padrão.
 *
 * É REESCRITA, NÃO REDIRECIONAMENTO: a URL que o aluno vê continua sendo a dele.
 */
export function caminhoInterno(caminho: string, locale: AppLocale): string {
  const emPortugues = caminhoSemLocale(caminho)
    .split('/')
    .map((segmento) => (segmento === '' ? segmento : traduzirSegmento(segmento, DEFAULT_LOCALE)))
    .join('/')

  const base = emPortugues === '' ? '/' : emPortugues
  return base === '/' ? `/${locale}` : `/${locale}${base}`
}
