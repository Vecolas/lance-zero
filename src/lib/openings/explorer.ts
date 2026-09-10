/**
 * Adapter do Opening Explorer da Lichess.
 *
 * A URL, CONFERIDA CONTRA O SERVIÇO REAL — e este parágrafo existe porque o
 * erro já foi cometido neste repositório. O adapter de tablebase nasceu
 * apontando para `lichess.org/api/tablebase/...`, que devolve HTML de 404, e
 * vinte e um testes ficaram verdes porque o `fetch` era dublado e a URL nunca
 * era visitada.
 *
 * O explorer NÃO mora em `lichess.org`. Mora em `explorer.lichess.ovh`.
 * Verificado em 2026-09-09, com controle:
 *
 * - `GET https://explorer.lichess.ovh/` → `301` com
 *   `Location: https://lichess.org/analysis#explorer`. É a assinatura do
 *   serviço certo: nenhum host genérico redireciona para a página do explorer.
 * - `GET https://explorer.lichess.ovh/lichess?...` → responde com
 *   `Access-Control-Allow-Methods: GET,OPTIONS` próprios do serviço.
 * - controle negativo: um host inventado sob `lichess.ovh` não resolve (curl
 *   devolve `000`), então "respondeu alguma coisa" não é acidente do ambiente.
 *
 * O QUE **NÃO** FOI POSSÍVEL CONFIRMAR, e é a maior dívida deste arquivo: no
 * mesmo teste, `/lichess`, `/masters` e `/player` responderam **401
 * Unauthorized** a requisições anônimas, com
 * `Access-Control-Allow-Headers: …,Authorization`. Ou o endpoint passou a exigir
 * token OAuth, ou a faixa de IP usada no teste está barrada. Daqui não dá para
 * distinguir os dois casos.
 *
 * A consequência de projeto é direta e está implementada: `401`/`403` viram um
 * motivo PRÓPRIO (`sem-autorizacao`), separado de "sem dados". Se virassem
 * `null` mudo, o app inteiro exibiria "esta posição não tem estatística" para
 * todas as posições do mundo, para sempre, sem uma linha no console — a mesma
 * falha muda do tablebase, de novo. Com o motivo separado, a tela pode dizer a
 * verdade: "o explorador não respondeu agora".
 *
 * O FORMATO DA RESPOSTA veio da documentação da API, e NÃO de uma resposta real
 * (o 401 impediu). É ponto cego declarado: `converter` recusa qualquer forma
 * inesperada e devolve `resposta-invalida`, então uma divergência de formato
 * aparece como indisponibilidade, não como número inventado. Confirmar o
 * formato contra o serviço real, com token, é trabalho de um teste de contrato
 * fora do CI — como `tests/contrato/tablebase-real.test.ts` faz.
 *
 * DECISÃO — DEGRADAÇÃO GRACIOSA É O CONTRATO. Critério de aceite da issue #10:
 * "explorer indisponível não quebra a tela". Toda falha do mundo externo vira
 * resposta sem estatística, nunca exceção. FEN inválido é a única exceção e
 * LANÇA, porque é bug de quem chama.
 *
 * DECISÃO — CACHE PRÓPRIO, E NÃO O DO `HttpClient`. O cache do `HttpClient`
 * guarda corpo cru por URL e não tem teto de entradas; numa sessão de estudo
 * longa isso cresce sem limite. Aqui o cache guarda o resultado JÁ CONVERTIDO,
 * tem TTL e tem teto. TTL existe (ao contrário do tablebase, que é permanente)
 * porque estatística de explorer muda: partidas novas entram todo dia.
 *
 * DECISÃO — UMA REQUISIÇÃO POR VEZ, como manda a orientação oficial da Lichess.
 * A fila serial dá deduplicação de graça: duas consultas simultâneas à mesma
 * posição viram uma requisição, porque a segunda encontra o cache preenchido.
 *
 * NUNCA raspar HTML: só a API pública em JSON.
 * Documentação: https://lichess.org/api#tag/Opening-Explorer
 */

import { ChessParseError, isValidFen } from '@/lib/chess'
import {
  HttpClient,
  HttpStatusError,
  HttpTimeoutError,
  RateLimitError,
  type HttpClientOptions,
  type HttpGetOptions,
} from '@/lib/importers/http'
import type {
  Abertura,
  ExplorerFilters,
  ExplorerMove,
  ExplorerStats,
  OpeningExplorerProvider,
} from '@/domain/types'
import { identidadeDePosicao } from './identidade'

/**
 * Números ajustáveis do explorer.
 *
 * `timeoutMs`, `cacheTtlMs`, `maxEntradasDeCache` e `maxLances` são HEURÍSTICAS
 * DE PRODUTO: escolhidas para a tela de abertura não travar e para a resposta
 * caber na memória, nunca medidas em rede móvel real.
 *
 * `minimoDeAmostra` é a que carrega decisão de produto de verdade — ver
 * `participacaoDe`.
 */
export const EXPLORER_CONFIG = {
  baseUrl: 'https://explorer.lichess.ovh',
  /** Orçamento de espera por consulta. */
  timeoutMs: 6_000,
  /** Validade de uma estatística em memória. */
  cacheTtlMs: 30 * 60_000,
  /** Teto de posições guardadas em memória. */
  maxEntradasDeCache: 300,
  /** Quantos lances pedir por posição. */
  maxLances: 12,
  /**
   * Abaixo deste total de partidas, nenhuma porcentagem é apresentada.
   *
   * NÃO é ajuste de performance: é a regra "sem falsa precisão" do `CLAUDE.md`.
   * "67% das partidas jogam este lance" sobre três partidas é ruído com cara de
   * estatística, e um aluno de 1100 não tem como saber a diferença.
   */
  minimoDeAmostra: 50,
} as const

/**
 * Filtro padrão para o público-alvo (~800–1600, com curva em 1100).
 *
 * HEURÍSTICA DE PRODUTO: blitz e rápidas são as cadências que este público
 * joga, e as faixas de 1000 a 1400 são as pessoas contra quem ele joga de fato.
 * Olhar a estatística de mestres para decidir a abertura de um jogador de 1100 é
 * estudar o adversário errado.
 */
export const FILTRO_PADRAO: ExplorerFilters = {
  base: 'lichess',
  velocidades: ['blitz', 'rapid'],
  ratings: [1000, 1200, 1400],
  maxLances: EXPLORER_CONFIG.maxLances,
}

/**
 * Por que não houve estatística.
 *
 * Cada valor pede uma frase diferente na tela, e é por isso que não é um
 * booleano: "demorou demais" convida a tentar de novo, "o explorador não
 * autorizou a consulta" não.
 */
export type MotivoDeIndisponibilidade =
  | 'timeout'
  | 'rede'
  | 'limite-de-taxa'
  | 'sem-autorizacao'
  | 'nao-encontrado'
  | 'servico'
  | 'resposta-invalida'

/**
 * Resposta rica do adapter.
 *
 * INVARIANTE: exatamente um dos dois campos é não-nulo. Ter estatística e
 * motivo ao mesmo tempo, ou nenhum dos dois, seria estado que a tela não sabe
 * desenhar.
 */
export interface RespostaDoExplorer {
  estatisticas: ExplorerStats | null
  indisponivel: MotivoDeIndisponibilidade | null
}

export interface LichessExplorerOptions {
  /** Transporte injetado. Em produção o `fetch` global; no teste, um falso. */
  fetchFn: typeof fetch
  /** Relógio injetado, em milissegundos. Sem ele o TTL não é testável. */
  now?: () => number
  baseUrl?: string
  timeoutMs?: number
  cacheTtlMs?: number
  maxEntradasDeCache?: number
  /**
   * Token OAuth da Lichess, quando houver.
   *
   * Existe por causa do 401 documentado no topo do arquivo. É OPCIONAL de
   * propósito: o núcleo do produto tem de funcionar sem conta e sem chave, como
   * manda o `CLAUDE.md`. Sem token, o adapter consulta anonimamente e degrada.
   */
  token?: string
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function inteiroOuNulo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function textoOuNulo(valor: unknown): string | null {
  return typeof valor === 'string' && valor.length > 0 ? valor : null
}

/**
 * Converte a resposta crua. `null` para qualquer forma inesperada.
 *
 * Um único lance malformado invalida a resposta INTEIRA, em vez de ser
 * descartado — mesma regra do adapter de tablebase, e pelo mesmo motivo: uma
 * lista com buraco no meio seria apresentada como se estivesse completa, e o
 * segundo lance mais jogado apareceria como o mais jogado.
 */
function converter(
  identidade: string,
  base: ExplorerFilters['base'],
  cru: unknown,
): ExplorerStats | null {
  if (!ehObjeto(cru)) {
    return null
  }
  const brancas = inteiroOuNulo(cru.white)
  const empates = inteiroOuNulo(cru.draws)
  const pretas = inteiroOuNulo(cru.black)
  if (brancas === null || empates === null || pretas === null) {
    return null
  }

  const lancesCrus = cru.moves
  if (lancesCrus !== undefined && !Array.isArray(lancesCrus)) {
    return null
  }

  const lances: ExplorerMove[] = []
  for (const lanceCru of lancesCrus ?? []) {
    if (!ehObjeto(lanceCru)) {
      return null
    }
    const uci = textoOuNulo(lanceCru.uci)
    const san = textoOuNulo(lanceCru.san)
    const lb = inteiroOuNulo(lanceCru.white)
    const le = inteiroOuNulo(lanceCru.draws)
    const lp = inteiroOuNulo(lanceCru.black)
    if (uci === null || san === null || lb === null || le === null || lp === null) {
      return null
    }
    lances.push({
      uci,
      san,
      brancas: lb,
      empates: le,
      pretas: lp,
      total: lb + le + lp,
      ratingMedio: inteiroOuNulo(lanceCru.averageRating),
    })
  }

  let abertura: Abertura | null = null
  if (ehObjeto(cru.opening)) {
    const eco = textoOuNulo(cru.opening.eco)
    const nome = textoOuNulo(cru.opening.name)
    if (eco !== null && nome !== null) {
      // `nomePt` é sempre `null` aqui: o serviço não conhece nome em português.
      // Quem exibe deve perguntar antes ao índice local, que conhece.
      abertura = { eco, nome, nomePt: null }
    }
  }

  return {
    fen: identidade,
    base,
    brancas,
    empates,
    pretas,
    total: brancas + empates + pretas,
    lances,
    abertura,
    doCache: false,
  }
}

/** Traduz a falha do transporte no motivo que a tela sabe explicar. */
function motivoDe(erro: unknown): MotivoDeIndisponibilidade {
  if (erro instanceof HttpTimeoutError) return 'timeout'
  if (erro instanceof RateLimitError) return 'limite-de-taxa'
  if (erro instanceof HttpStatusError) {
    if (erro.status === 401 || erro.status === 403) return 'sem-autorizacao'
    if (erro.status === 404) return 'nao-encontrado'
    return 'servico'
  }
  return 'rede'
}

/**
 * Fração das partidas que jogaram este lance, ou `null` com amostra pequena.
 *
 * `null` não é "zero" e não é "erro": é "não dá para afirmar". Quem chama tem
 * de escrever alguma coisa honesta na tela em vez de um número — é a regra
 * "sem falsa precisão" aplicada no ponto exato em que ela seria violada.
 */
export function participacaoDe(
  lance: ExplorerMove,
  estatisticas: ExplorerStats,
  minimoDeAmostra: number = EXPLORER_CONFIG.minimoDeAmostra,
): number | null {
  if (estatisticas.total < minimoDeAmostra || estatisticas.total === 0) {
    return null
  }
  return lance.total / estatisticas.total
}

interface EntradaDeCache {
  expiraEm: number
  resposta: RespostaDoExplorer
}

export class LichessExplorerProvider implements OpeningExplorerProvider {
  private readonly http: HttpClient
  private readonly agora: () => number
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly maxEntradasDeCache: number
  private readonly token: string | undefined
  private readonly cache = new Map<string, EntradaDeCache>()
  /** Fila serial: uma requisição por vez, como manda a Lichess. */
  private fila: Promise<unknown> = Promise.resolve()

  constructor(options: LichessExplorerOptions) {
    const httpOptions: HttpClientOptions = { fetchFn: options.fetchFn, now: options.now }
    this.http = new HttpClient(httpOptions)
    this.agora = options.now ?? (() => Date.now())
    this.baseUrl = options.baseUrl ?? EXPLORER_CONFIG.baseUrl
    this.timeoutMs = options.timeoutMs ?? EXPLORER_CONFIG.timeoutMs
    this.cacheTtlMs = options.cacheTtlMs ?? EXPLORER_CONFIG.cacheTtlMs
    this.maxEntradasDeCache = options.maxEntradasDeCache ?? EXPLORER_CONFIG.maxEntradasDeCache
    this.token = options.token
  }

  /** Esvazia o cache. Existe para o teste e para trocar de sessão de estudo. */
  limparCache(): void {
    this.cache.clear()
  }

  /**
   * Contrato do `OpeningExplorerProvider`.
   *
   * É DERIVADO de `consultar`, e não uma segunda implementação: o motivo da
   * indisponibilidade some, o resto é o mesmo caminho. Duas implementações da
   * mesma consulta divergiriam no dia em que uma ganhasse um caso novo.
   */
  async getStats(fen: string, filters: ExplorerFilters): Promise<ExplorerStats | null> {
    return (await this.consultar(fen, filters)).estatisticas
  }

  /** Consulta com o motivo da falha preservado. */
  async consultar(fen: string, filtros: ExplorerFilters): Promise<RespostaDoExplorer> {
    if (!isValidFen(fen)) {
      throw new ChessParseError(`FEN inválido na consulta ao explorer: ${fen}`)
    }
    const identidade = identidadeDePosicao(fen)
    const url = this.montarUrl(identidade, filtros)

    const doCache = this.lerCache(url)
    if (doCache) {
      return doCache
    }

    const anterior = this.fila
    const atual = anterior.then(
      () => this.consultarAgora(url, identidade, filtros.base),
      () => this.consultarAgora(url, identidade, filtros.base),
    )
    this.fila = atual.then(
      () => undefined,
      () => undefined,
    )
    return atual
  }

  /**
   * Monta a URL. É a fonte única do formato da query.
   *
   * `topGames` e `recentGames` vão a zero de propósito: o produto não usa a
   * lista de partidas, e pedi-la só gastaria banda de quem está no celular.
   *
   * Cadência e faixa de rating só existem na base `lichess`; o tipo já impede
   * mandá-las para `masters`, e aqui isso vira código sem `if` de conferência.
   */
  private montarUrl(identidade: string, filtros: ExplorerFilters): string {
    const params = new URLSearchParams()
    params.set('fen', identidade)
    params.set('moves', String(filtros.maxLances ?? EXPLORER_CONFIG.maxLances))
    params.set('topGames', '0')

    if (filtros.base === 'lichess') {
      params.set('variant', 'standard')
      params.set('recentGames', '0')
      if (filtros.velocidades.length > 0) {
        params.set('speeds', filtros.velocidades.join(','))
      }
      if (filtros.ratings.length > 0) {
        params.set('ratings', filtros.ratings.join(','))
      }
    }

    return `${this.baseUrl}/${filtros.base}?${params.toString()}`
  }

  private async consultarAgora(
    url: string,
    identidade: string,
    base: ExplorerFilters['base'],
  ): Promise<RespostaDoExplorer> {
    // A fila pode ter deixado outra consulta à MESMA url passar antes desta.
    const doCache = this.lerCache(url)
    if (doCache) {
      return doCache
    }

    const headers: Record<string, string> = { accept: 'application/json' }
    if (this.token !== undefined && this.token.length > 0) {
      headers.authorization = `Bearer ${this.token}`
    }
    const opcoes: HttpGetOptions = { timeoutMs: this.timeoutMs, headers }

    let corpo: string
    try {
      corpo = (await this.http.get(url, opcoes)).body
    } catch (erro) {
      // Nada aqui entra no cache. Cachear um timeout condenaria a posição a
      // ficar sem estatística pelo resto do TTL; cachear um 401 esconderia a
      // recuperação no minuto em que o token chegasse.
      return { estatisticas: null, indisponivel: motivoDe(erro) }
    }

    let cru: unknown
    try {
      cru = JSON.parse(corpo)
    } catch {
      return { estatisticas: null, indisponivel: 'resposta-invalida' }
    }

    const estatisticas = converter(identidade, base, cru)
    if (estatisticas === null) {
      return { estatisticas: null, indisponivel: 'resposta-invalida' }
    }

    const resposta: RespostaDoExplorer = { estatisticas, indisponivel: null }
    this.guardar(url, resposta)
    return resposta
  }

  private lerCache(url: string): RespostaDoExplorer | null {
    const entrada = this.cache.get(url)
    if (!entrada) {
      return null
    }
    if (entrada.expiraEm <= this.agora()) {
      this.cache.delete(url)
      return null
    }
    const guardada = entrada.resposta.estatisticas
    return {
      estatisticas: guardada === null ? null : { ...guardada, doCache: true },
      indisponivel: entrada.resposta.indisponivel,
    }
  }

  private guardar(url: string, resposta: RespostaDoExplorer): void {
    if (this.cache.size >= this.maxEntradasDeCache) {
      // `Map` mantém a ordem de inserção: a primeira chave é a mais antiga.
      const maisAntiga = this.cache.keys().next()
      if (!maisAntiga.done) {
        this.cache.delete(maisAntiga.value)
      }
    }
    this.cache.set(url, { expiraEm: this.agora() + this.cacheTtlMs, resposta })
  }
}
