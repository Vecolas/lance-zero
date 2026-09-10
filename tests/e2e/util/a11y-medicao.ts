/**
 * MEDIÇÃO de acessibilidade no que o navegador de fato pinta.
 *
 * A DECISÃO QUE ESTE ARQUIVO CARREGA: medir contraste no RENDERIZADO, e não em
 * pares de token. `tests/unit/contrast.test.ts` e `tests/unit/tokens.test.ts`
 * provam que duas cores escolhidas a dedo passam em WCAG AA — e isso é outra
 * coisa. `var()` não resolve em jsdom, então até a issue #75 ninguém sabia qual
 * cor a composição real produz. A primeira execução deste arquivo achou quatro
 * defeitos que os portões de token não podiam ver, incluindo o link de pular
 * conteúdo em 2,75:1 — exatamente a razão de o CLAUDE.md mandar usar
 * `--accent-strong` no botão primário, aplicada em todo lugar menos aqui.
 *
 * ================== O QUE ESTA MEDIÇÃO **NÃO** PROVA ==================
 *
 * Varredura automatizada pega mais ou menos 30% dos problemas reais de
 * acessibilidade. Isto aqui é um pedaço DESSES 30%, não os 30%. Fica de fora,
 * sem exceção e sem promessa de estar coberto em outro lugar:
 *
 * - **Leitor de tela.** Ninguém ouviu NVDA, VoiceOver ou Orca nesta base. As
 *   decisões de tom que dependem disso — `role="status"` no erro em vez de
 *   `alert`, a lupa no lugar do X — continuam não conferidas.
 * - **Ordem de foco em fluxo completo.** Aqui não se navega por Tab do começo
 *   ao fim de nenhuma tela.
 * - **Texto dentro de imagem, canvas ou SVG.** A medição lê nós de texto do
 *   DOM. Rótulo desenhado em pixel é invisível para ela.
 * - **Texto sobre gradiente ou imagem de fundo.** Quando algum ancestral tem
 *   `background-image`, o fundo efetivo não é uma cor só e a amostra é
 *   DESCARTADA — contada e relatada como não medida, nunca como aprovada.
 * - **Estados que exigem interação.** Só é medido o que está na tela depois do
 *   carregamento: hover, foco, aberto, expandido e erro de formulário não
 *   entram, com a exceção explícita do link de pular conteúdo.
 * - **Contraste de elemento não textual** (WCAG 1.4.11): borda de campo, ícone
 *   sem texto, casa de tabuleiro. Só texto é julgado.
 * - **Sentido, rótulo e ordem.** Nenhuma regra de semântica é conferida aqui.
 *
 * Ou seja: verde neste arquivo significa "o contraste de texto medido nas rotas
 * listadas, nos dois temas, passa em AA". Não significa acessível.
 */

import { contrastRatio } from '../../../src/lib/a11y/contrast'

/**
 * Limiares do WCAG 2.1 AA, critério 1.4.3. LIMITE DE DESIGN, não heurística de
 * produto: os números vêm da norma e não se ajustam por gosto.
 */
export const LIMIARES_AA = {
  /** Texto comum. */
  normal: 4.5,
  /** Texto grande. */
  grande: 3,
  /** A partir daqui o texto é "grande" em qualquer peso (18pt = 24px). */
  grandePx: 24,
  /** Em negrito basta 14pt = 18.66px. */
  grandeNegritoPx: 18.66,
  /** O que a norma chama de negrito. */
  pesoNegrito: 700,
} as const

/** Uma amostra de texto colhida do DOM, com as cores que o navegador calculou. */
export interface AmostraDeTexto {
  /** Rota onde foi colhida. Preenchido do lado do Node. */
  rota: string
  /** Tema em que a página foi carregada. Preenchido do lado do Node. */
  tema: 'light' | 'dark'
  /** Caminho curto até o elemento, para a mensagem de falha ser acionável. */
  caminho: string
  /** Começo do texto, para identificar o elemento na tela. */
  texto: string
  /** `color` computada, no formato `rgb()`/`rgba()` do navegador. */
  cor: string
  /**
   * Camadas de `background-color` do elemento até a raiz, da mais próxima do
   * texto para a mais distante. Para na primeira camada opaca.
   */
  camadas: string[]
  /** `background-image` encontrada em algum ancestral, se houver. */
  imagemDeFundo: string | null
  fontSizePx: number
  fontWeight: number
}

/**
 * Colhe as amostras DENTRO do navegador.
 *
 * Só colhe; não julga. O julgamento fica no Node para poder reusar
 * `src/lib/a11y/contrast.ts` — a razão de contraste do projeto tem uma
 * implementação só, e não é esta.
 */
export function coletarAmostras(): Omit<AmostraDeTexto, 'rota' | 'tema'>[] {
  const amostras: Omit<AmostraDeTexto, 'rota' | 'tema'>[] = []

  const caminhoDe = (el: Element): string => {
    const partes: string[] = []
    let atual: Element | null = el
    for (let i = 0; atual && i < 4; i++) {
      const classe = String((atual as HTMLElement).className || '')
        .split(/\s+/)
        .filter(Boolean)[0]
      partes.unshift(atual.tagName.toLowerCase() + (classe ? `.${classe}` : ''))
      atual = atual.parentElement
    }
    return partes.join(' > ')
  }

  for (const el of Array.from(document.querySelectorAll('body *'))) {
    // Só elementos com texto PRÓPRIO: um contêiner herda a cor dos filhos e
    // seria contado várias vezes, cada vez com o fundo errado.
    const texto = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => (n.textContent ?? '').trim())
      .join(' ')
      .trim()
    if (!texto) continue

    const caixa = el.getBoundingClientRect()
    if (caixa.width === 0 || caixa.height === 0) continue

    const estilo = getComputedStyle(el)
    if (estilo.visibility === 'hidden' || estilo.display === 'none') continue
    if (Number(estilo.opacity) === 0) continue

    // O alfa sai da CONTAGEM de componentes, nunca do último número.
    // A primeira versão pegava o último número de `rgb(r, g, b)` como se fosse
    // alfa: `rgb(0, 0, 0)` virava "alfa 0", a camada preta era DESCARTADA e o
    // texto era medido contra o fundo da página lá atrás — um fundo mais claro,
    // ou seja, erro para o lado que APROVA. Quem pegou isso foi o caso de
    // camada semitransparente em `a11y-contraste-renderizado.spec.ts`.
    const alfaDe = (cor: string): number => {
      const corpo = /^rgba?\(([^)]+)\)$/.exec(cor) ?? /^color\(srgb\s+([^)]+)\)$/.exec(cor)
      if (!corpo) return 0
      const partes = corpo[1]
        .split(/[,\s/]+/)
        .filter(Boolean)
        .map(Number)
      return partes.length > 3 ? partes[3] : 1
    }

    const camadas: string[] = []
    let imagemDeFundo: string | null = null
    let no: Element | null = el
    while (no) {
      const seu = getComputedStyle(no)
      if (seu.backgroundImage && seu.backgroundImage !== 'none') {
        imagemDeFundo = seu.backgroundImage
      }
      const fundo = seu.backgroundColor
      const alfa = alfaDe(fundo)
      if (alfa > 0) {
        camadas.push(fundo)
        if (alfa === 1) break
      }
      no = no.parentElement
    }

    amostras.push({
      caminho: caminhoDe(el),
      texto: texto.slice(0, 48),
      cor: estilo.color,
      camadas,
      imagemDeFundo,
      fontSizePx: Number.parseFloat(estilo.fontSize),
      fontWeight: Number(estilo.fontWeight) || 400,
    })
  }

  return amostras
}

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Lê uma cor COMPUTADA. São dois formatos, não um.
 *
 * O óbvio é `rgb()`/`rgba()`, com canais de 0 a 255. O outro é
 * `color(srgb 0.968 0.976 0.984 / 0.92)`, com canais de 0 a 1: o Chromium
 * devolve esse quando a cor nasceu de `color-mix()` — que é o que
 * `SiteNav.module.css` usa no cabeçalho, ou seja, em TODA página.
 *
 * A primeira versão deste arquivo só entendia `rgb()`. LANÇAR aqui, em vez de
 * devolver `null` e seguir, é a decisão que importa: uma sonda anterior
 * ignorava o formato desconhecido em silêncio e por isso mediu a base inteira
 * sem NUNCA olhar o cabeçalho. Formato que não se entende é falha de medição,
 * não amostra aprovada.
 */
export function lerRgb(valor: string): Rgba {
  const texto = valor.trim()

  const rgb = /^rgba?\(([^)]+)\)$/.exec(texto)
  if (rgb) {
    const partes = numeros(rgb[1], valor)
    return { r: partes[0], g: partes[1], b: partes[2], a: partes.length > 3 ? partes[3] : 1 }
  }

  const srgb = /^color\(srgb\s+([^)]+)\)$/.exec(texto)
  if (srgb) {
    const partes = numeros(srgb[1], valor)
    return {
      r: partes[0] * 255,
      g: partes[1] * 255,
      b: partes[2] * 255,
      a: partes.length > 3 ? partes[3] : 1,
    }
  }

  throw new Error(`cor computada em formato inesperado: ${valor}`)
}

function numeros(corpo: string, original: string): number[] {
  const partes = corpo
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number)
  if (partes.length < 3 || partes.some((n) => Number.isNaN(n))) {
    throw new Error(`cor computada em formato inesperado: ${original}`)
  }
  return partes
}

/** `#rrggbb` a partir de canais 0..255. Arredonda porque a tela é de 8 bits. */
export function paraHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const canal = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${canal(r)}${canal(g)}${canal(b)}`
}

/** Compõe `frente` sobre `atras` pelo alfa da frente (source-over). */
export function compor(frente: Rgba, atras: { r: number; g: number; b: number }) {
  return {
    r: frente.r * frente.a + atras.r * (1 - frente.a),
    g: frente.g * frente.a + atras.g * (1 - frente.a),
    b: frente.b * frente.a + atras.b * (1 - frente.a),
  }
}

/**
 * Achata as camadas de fundo numa cor só.
 *
 * A base é branco quando nenhuma camada é opaca. É uma suposição, e ela erra
 * para o lado SEGURO: sobre branco o texto claro fica com contraste pior, então
 * o portão acusa em vez de deixar passar.
 */
export function achatarFundo(camadas: string[]): { r: number; g: number; b: number } {
  let base = { r: 255, g: 255, b: 255 }
  for (let i = camadas.length - 1; i >= 0; i--) {
    base = compor(lerRgb(camadas[i]), base)
  }
  return base
}

/** O limiar que vale para esta amostra, pelo tamanho e peso da fonte. */
export function limiarDe(amostra: Pick<AmostraDeTexto, 'fontSizePx' | 'fontWeight'>): number {
  const grande =
    amostra.fontSizePx >= LIMIARES_AA.grandePx ||
    (amostra.fontSizePx >= LIMIARES_AA.grandeNegritoPx &&
      amostra.fontWeight >= LIMIARES_AA.pesoNegrito)
  return grande ? LIMIARES_AA.grande : LIMIARES_AA.normal
}

export interface Julgamento {
  amostra: AmostraDeTexto
  /** Razão de contraste medida, ou `null` quando a amostra não é mensurável. */
  razao: number | null
  limiar: number
  fundoHex: string
  frenteHex: string
  /** Preenchido quando `razao` é `null`: por que não deu para medir. */
  naoMedida: string | null
}

export function julgar(amostra: AmostraDeTexto): Julgamento {
  const limiar = limiarDe(amostra)
  if (amostra.imagemDeFundo) {
    return {
      amostra,
      razao: null,
      limiar,
      fundoHex: '',
      frenteHex: '',
      naoMedida: `fundo com imagem/gradiente (${amostra.imagemDeFundo.slice(0, 40)})`,
    }
  }
  const fundo = achatarFundo(amostra.camadas)
  const frente = compor(lerRgb(amostra.cor), fundo)
  const fundoHex = paraHex(fundo)
  const frenteHex = paraHex(frente)
  return {
    amostra,
    razao: contrastRatio(frenteHex, fundoHex),
    limiar,
    fundoHex,
    frenteHex,
    naoMedida: null,
  }
}

export function reprova(j: Julgamento): boolean {
  return j.razao !== null && j.razao < j.limiar
}

export function descrever(j: Julgamento): string {
  const { amostra: a } = j
  const razao = j.razao === null ? 'não medida' : j.razao.toFixed(2)
  return `${a.rota} [${a.tema}] ${razao}:1 < ${j.limiar}:1 — ${a.caminho} "${a.texto}" ${a.fontSizePx}px/${a.fontWeight} ${j.frenteHex} sobre ${j.fundoHex}`
}

/**
 * Defeitos MEDIDOS que esta frente não pode consertar, porque o arquivo é de
 * outra fronteira. Ficam aqui declarados, com o número medido, para o portão
 * poder ficar verde sem MENTIR que a tela passa.
 *
 * Uma exceção não é um perdão: `verificarExcecoesObsoletas` reprova quando uma
 * delas deixa de reproduzir. Assim a lista encolhe sozinha à medida que os
 * donos consertarem, em vez de virar sedimento.
 */
export interface Excecao {
  id: string
  /** Reconhece a amostra pelo que foi medido, nunca por posição na lista. */
  reconhece: (j: Julgamento) => boolean
  /** Onde mora o conserto. */
  dono: string
  razao: string
}

export const EXCECOES_MEDIDAS: Excecao[] = [
  {
    id: 'coordenadas-do-tabuleiro',
    // O `react-chessboard` desenha as coordenadas a-h/1-8 na paleta marrom
    // padrão dele (#B58863 sobre casa clara, #F0D9B5 sobre casa escura),
    // ignorando as casas da marca. Medido: 2,81:1 e 1,29:1 — a segunda é
    // praticamente invisível.
    reconhece: (j) =>
      /^[a-h1-8]$/.test(j.amostra.texto) &&
      ['#b58863', '#f0d9b5'].includes(j.frenteHex.toLowerCase()),
    dono: 'src/components/chess/** (fora da fronteira desta frente)',
    razao: 'coordenadas do react-chessboard na paleta padrão da biblioteca sobre as casas da marca',
  },
  {
    id: 'openings-token-de-tema-claro-no-escuro',
    // `RepertorioCard.module.css` usa `--accent-text` e `--info-text` CRUS.
    // Esses tokens só existem para texto sobre fundo CLARO; no tema escuro
    // ninguém os redefine, então a cor de tema claro é pintada sobre o cartão
    // escuro. Medido: 3,21:1 e 3,34:1. O papel semântico certo já existe
    // (`--accent-readable`, `--note`) e é redefinido nos dois blocos de tema.
    reconhece: (j) =>
      j.amostra.tema === 'dark' &&
      ['#007999', '#3075b9'].includes(j.frenteHex.toLowerCase()) &&
      j.amostra.rota.startsWith('/openings'),
    dono: 'src/components/openings/** (fora da fronteira desta frente)',
    razao: 'token de TEXTO do tema claro usado cru dentro do tema escuro',
  },
  {
    id: 'accent-text-em-fundo-que-nao-e-o-bg-primary',
    // `--accent-text` (#007999) foi calibrado contra `--bg-primary` e
    // `--bg-pure` — é o que `tests/unit/tokens.test.ts` confere. Sobre
    // `--bg-secondary` (#EEF3F7) mede 4,48:1 e sobre `--accent-soft`
    // (#D9F4FA) mede 4,36:1. Reprova por pouco, e reprova.
    //
    // Não é conserto de tela: é o token que precisa escurecer, e o token está
    // escrito na identidade visual e no ADR-0007, que esta frente não edita.
    reconhece: (j) =>
      j.amostra.tema === 'light' &&
      j.frenteHex.toLowerCase() === '#007999' &&
      ['#eef3f7', '#d9f4fa'].includes(j.fundoHex.toLowerCase()),
    dono: 'src/lib/design/tokens.ts + identidade-visual/ + docs/adr/ (decisão de marca)',
    razao: 'variante de texto calibrada só contra bg-primary/bg-pure reprova nos outros fundos',
  },
]

/**
 * A lista de exceções tem de continuar descrevendo a realidade.
 *
 * Exceção que não reproduz mais é dívida quitada que ninguém apagou — e, pior,
 * é uma peneira aberta esperando uma falha nova cair dentro dela.
 */
export function verificarExcecoesObsoletas(reprovacoes: Julgamento[]): string[] {
  return EXCECOES_MEDIDAS.filter((e) => !reprovacoes.some((j) => e.reconhece(j))).map(
    (e) => `${e.id} (dono: ${e.dono})`,
  )
}

export function excecaoDe(j: Julgamento): Excecao | undefined {
  return EXCECOES_MEDIDAS.find((e) => e.reconhece(j))
}
