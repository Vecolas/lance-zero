/**
 * Adapter de tablebase (Syzygy) sobre a API pública da Lichess.
 *
 * DECISÃO 1 — DEGRADAÇÃO GRACIOSA É O CONTRATO, não um extra. A lição de finais
 * tem de continuar utilizável com a tablebase fora do ar. Por isso toda falha do
 * mundo externo — rede caída, timeout, 404, 429, 5xx, JSON quebrado, resposta
 * com forma inesperada — vira `null`, e nunca exceção. Quem chama trata `null`
 * como "não há defesa perfeita disponível agora" e segue.
 *
 * DECISÃO 2 — `fetch` entra por parâmetro. Nada aqui fala com a rede global: o
 * teste roda sem rede nenhuma, e quem constrói escolhe o transporte.
 *
 * DECISÃO 3 — FEN inválido LANÇA. Não é falha do mundo externo, é bug de quem
 * chama; devolver `null` faria a lição perder a defesa perfeita para sempre sem
 * uma linha no console.
 *
 * DECISÃO 4 — cache por FEN normalizado, permanente na sessão. Tablebase é
 * praticamente imutável, então não há TTL; o que há é um teto de entradas para
 * a memória não crescer sem limite numa sessão longa. Respostas DEFINITIVAS
 * (resultado válido e 404) entram no cache; falhas TRANSITÓRIAS não entram —
 * cachear um timeout condenaria aquela posição a nunca mais ser consultada.
 *
 * DECISÃO 5 — uma requisição por vez, como manda a orientação oficial da
 * Lichess. A fila serial também dá deduplicação de graça: duas consultas
 * simultâneas ao mesmo FEN viram uma requisição, porque a segunda encontra o
 * cache já preenchido.
 *
 * DECISÃO 6 — o CONTRATO (`TablebaseProvider`, `TablebaseResult` e o
 * vocabulário do serviço) mora em `@/domain/types`, junto de
 * `GameImportProvider`; aqui fica só a IMPLEMENTAÇÃO. Quem procura a forma no
 * arquivo dono dos contratos encontra (issue #55, item 1).
 *
 * NUNCA raspar HTML: só a API pública em JSON.
 * Documentação: https://lichess.org/api#tag/Tablebase
 *
 * O SERVIÇO NÃO MORA EM `lichess.org`. Ele mora em `tablebase.lichess.ovh`, e
 * `https://lichess.org/api/tablebase/standard` devolve uma página 404 de HTML.
 * Isto está escrito aqui porque o erro é MUDO por construção: a degradação
 * graciosa transforma o 404 em `null`, que é o MESMO valor de "esta posição não
 * tem tablebase". Com o host errado, toda lição de final ficaria para sempre
 * sem defesa perfeita e nada apareceria em lugar nenhum.
 *
 * Nenhum teste unitário pega isso: com `fetch` dublado, a URL nunca é visitada.
 * Quem pega é `tests/contrato/tablebase-real.test.ts`, que fala com o serviço de
 * verdade e NÃO roda no CI (ver o cabeçalho de lá).
 *
 * Formas confirmadas contra o serviço real em 2026-09-09:
 * - 5 peças  → 200, `category: 'win'`, `dtz`/`dtm` numéricos, `moves[].uci`.
 * - 8 peças  → 200 com `category: 'unknown'` (NÃO é 404). O corte em
 *   `maxPecas` é economia de requisição, não requisito de correção.
 * - FEN inválido → 400. Não nos alcança: validamos o FEN antes e lançamos.
 */

import { ChessParseError, isValidFen, normalizeFen } from '@/lib/chess'
import {
  CATEGORIAS_TABLEBASE,
  type CategoriaTablebase,
  type LanceTablebase,
  type ResultadoTeorico,
  type TablebaseProvider,
  type TablebaseResult,
} from '@/domain/types'
import {
  HttpClient,
  HttpStatusError,
  type HttpClientOptions,
  type HttpGetOptions,
} from '@/lib/importers/http'

/**
 * Parâmetros do adapter.
 *
 * `timeoutMs` e `maxEntradasDeCache` são HEURÍSTICAS DE PRODUTO: o orçamento de
 * espera foi escolhido para a tela de final não travar, e nunca foi medido em
 * rede móvel real. `maxPecas` NÃO é heurística nossa — é o alcance da tablebase
 * do serviço, segundo a documentação da Lichess; se o serviço passar a cobrir
 * mais peças, este número sobe aqui e em nenhum outro lugar.
 */
export const TABLEBASE_CONFIG = {
  baseUrl: 'https://tablebase.lichess.ovh',
  caminho: '/standard',
  /** Orçamento de espera por consulta. Heurística de produto, a calibrar. */
  timeoutMs: 5_000,
  /** Alcance do serviço, em peças no tabuleiro. Acima disso nem consultamos. */
  maxPecas: 7,
  /** Teto de posições guardadas em memória. Heurística de produto. */
  maxEntradasDeCache: 500,
} as const

/**
 * Categoria → resultado teórico, do ponto de vista de quem tem a vez.
 *
 * `cursed-win` e `blessed-loss` viram EMPATE de propósito: são posições ganhas
 * (ou perdidas) na teoria que a regra dos 50 lances transforma em empate na
 * prática. Rotulá-las de vitória seria prometer ao aluno um ponto que a regra
 * do jogo não entrega.
 *
 * `unknown` mapeia para `null`. Motivo inventado é pior que `unknown` — é regra
 * deste projeto, não preferência.
 *
 * O `Record` sobre a união é o que força a exaustividade: categoria nova sem
 * decisão de mapeamento não compila.
 */
const RESULTADO_POR_CATEGORIA: Record<CategoriaTablebase, ResultadoTeorico | null> = {
  win: 'vitoria',
  'syzygy-win': 'vitoria',
  'maybe-win': 'vitoria',
  'cursed-win': 'empate',
  draw: 'empate',
  'blessed-loss': 'empate',
  'maybe-loss': 'derrota',
  'syzygy-loss': 'derrota',
  loss: 'derrota',
  unknown: null,
}

export interface LichessTablebaseOptions {
  /** Transporte injetado. Em produção o `fetch` global; no teste, um falso. */
  fetchFn: typeof fetch
  /** Relógio injetado, em milissegundos. */
  now?: () => number
  baseUrl?: string
  timeoutMs?: number
  maxPecas?: number
  maxEntradasDeCache?: number
}

/** Melhor lance segundo a tablebase, ou `null` quando não há resposta. */
export function melhorLanceDe(resultado: TablebaseResult | null): LanceTablebase | null {
  return resultado?.lances[0] ?? null
}

function ehCategoria(valor: unknown): valor is CategoriaTablebase {
  return typeof valor === 'string' && (CATEGORIAS_TABLEBASE as readonly string[]).includes(valor)
}

function numeroOuNulo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function textoOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' && valor.length > 0 ? valor : null
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

/** Conta as peças no campo de tabuleiro do FEN. */
function pecasNoTabuleiro(fen: string): number {
  const tabuleiro = fen.trim().split(/\s+/)[0] ?? ''
  return (tabuleiro.match(/[a-zA-Z]/g) ?? []).length
}

/**
 * Converte a resposta crua. Devolve `null` para qualquer forma inesperada.
 *
 * Um único lance malformado invalida a resposta INTEIRA, em vez de ser
 * descartado: descartar em silêncio produziria uma lista de "melhores lances"
 * com um buraco no meio, e a tela apresentaria o segundo melhor como se fosse o
 * melhor. Resposta pela metade é pior que resposta nenhuma.
 */
function converter(fen: string, cru: unknown): TablebaseResult | null {
  if (!ehObjeto(cru) || !ehCategoria(cru.category)) {
    return null
  }
  const lancesCrus = cru.moves
  if (lancesCrus !== undefined && !Array.isArray(lancesCrus)) {
    return null
  }

  const lances: LanceTablebase[] = []
  for (const lanceCru of lancesCrus ?? []) {
    if (!ehObjeto(lanceCru) || !ehCategoria(lanceCru.category)) {
      return null
    }
    const uci = textoOuNulo(lanceCru.uci)
    if (uci === null) {
      return null
    }
    lances.push({
      uci,
      san: textoOuNulo(lanceCru.san),
      categoria: lanceCru.category,
      resultado: RESULTADO_POR_CATEGORIA[lanceCru.category],
      dtz: numeroOuNulo(lanceCru.dtz),
      dtm: numeroOuNulo(lanceCru.dtm),
    })
  }

  return {
    fen,
    categoria: cru.category,
    resultado: RESULTADO_POR_CATEGORIA[cru.category],
    dtz: numeroOuNulo(cru.dtz),
    dtm: numeroOuNulo(cru.dtm),
    xequeMate: cru.checkmate === true,
    afogamento: cru.stalemate === true,
    lances,
    doCache: false,
  }
}

export class LichessTablebaseProvider implements TablebaseProvider {
  private readonly http: HttpClient
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly maxPecas: number
  private readonly maxEntradasDeCache: number
  /** Guarda respostas DEFINITIVAS; `null` significa "coberto e sem resposta". */
  private readonly cache = new Map<string, TablebaseResult | null>()
  /** Fila serial: uma requisição por vez, como manda a Lichess. */
  private fila: Promise<unknown> = Promise.resolve()

  constructor(options: LichessTablebaseOptions) {
    const httpOptions: HttpClientOptions = { fetchFn: options.fetchFn, now: options.now }
    this.http = new HttpClient(httpOptions)
    this.baseUrl = options.baseUrl ?? TABLEBASE_CONFIG.baseUrl
    this.timeoutMs = options.timeoutMs ?? TABLEBASE_CONFIG.timeoutMs
    this.maxPecas = options.maxPecas ?? TABLEBASE_CONFIG.maxPecas
    this.maxEntradasDeCache = options.maxEntradasDeCache ?? TABLEBASE_CONFIG.maxEntradasDeCache
  }

  /** Esvazia o cache. Existe para o teste e para trocar de sessão de estudo. */
  limparCache(): void {
    this.cache.clear()
  }

  async probe(fen: string): Promise<TablebaseResult | null> {
    if (!isValidFen(fen)) {
      throw new ChessParseError(`FEN inválido na consulta à tablebase: ${fen}`)
    }
    const chave = normalizeFen(fen)

    const doCache = this.lerCache(chave)
    if (doCache !== undefined) {
      return doCache
    }

    // Posição fora do alcance do serviço: resposta definitiva, sem rede.
    if (pecasNoTabuleiro(chave) > this.maxPecas) {
      this.guardar(chave, null)
      return null
    }

    const anterior = this.fila
    const atual = anterior.then(
      () => this.consultar(chave),
      () => this.consultar(chave),
    )
    this.fila = atual.then(
      () => undefined,
      () => undefined,
    )
    return atual
  }

  private async consultar(chave: string): Promise<TablebaseResult | null> {
    // A fila pode ter deixado outra consulta ao MESMO FEN passar antes desta.
    const doCache = this.lerCache(chave)
    if (doCache !== undefined) {
      return doCache
    }

    const url = `${this.baseUrl}${TABLEBASE_CONFIG.caminho}?fen=${encodeURIComponent(chave)}`
    const opcoes: HttpGetOptions = {
      timeoutMs: this.timeoutMs,
      headers: { accept: 'application/json' },
    }

    let corpo: string
    try {
      corpo = (await this.http.get(url, opcoes)).body
    } catch (erro) {
      // 404 é resposta definitiva do serviço: esta posição não está coberta.
      // Todo o resto (timeout, rede, 429, 5xx) é transitório e NÃO se cacheia.
      if (erro instanceof HttpStatusError && erro.status === 404) {
        this.guardar(chave, null)
      }
      return null
    }

    let cru: unknown
    try {
      cru = JSON.parse(corpo)
    } catch {
      // Corpo que não é JSON pode ser página de erro de um proxy: transitório.
      return null
    }

    const resultado = converter(chave, cru)
    if (resultado === null) {
      return null
    }
    this.guardar(chave, resultado)
    return resultado
  }

  /** `undefined` = não está no cache; `null` = está, e é "sem resposta". */
  private lerCache(chave: string): TablebaseResult | null | undefined {
    if (!this.cache.has(chave)) {
      return undefined
    }
    const guardado = this.cache.get(chave) ?? null
    return guardado === null ? null : { ...guardado, doCache: true }
  }

  private guardar(chave: string, resultado: TablebaseResult | null): void {
    if (this.cache.size >= this.maxEntradasDeCache) {
      // `Map` mantém a ordem de inserção: a primeira chave é a mais antiga.
      const maisAntiga = this.cache.keys().next()
      if (!maisAntiga.done) {
        this.cache.delete(maisAntiga.value)
      }
    }
    this.cache.set(chave, resultado)
  }
}
