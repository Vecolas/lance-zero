/**
 * Cliente HTTP fino usado pelos importadores.
 *
 * Três decisões deliberadas:
 *
 * 1. `fetch` entra por parâmetro. Importador não fala com a rede global: quem
 *    constrói decide o transporte, e o teste roda sem rede nenhuma.
 * 2. O relógio também entra por parâmetro, porque o TTL do cache não pode
 *    depender de um `Date.now()` escondido no meio da lógica.
 * 3. Erros são tipados. A UI precisa distinguir "demorou demais" de "429 da
 *    Lichess" de "404 de usuário inexistente" para dizer algo útil.
 */

/**
 * Limiares de rede.
 *
 * São heurísticas de produto, não constantes científicas: calibrar com dados
 * reais de importação (rede móvel, contas com muitas partidas).
 */
export const HTTP_CONFIG = {
  /** Orçamento por requisição antes de abortar via AbortController. */
  timeoutMs: 15_000,
  /** Validade de uma resposta no cache em memória. */
  cacheTtlMs: 5 * 60_000,
} as const

/** Base comum para reconhecer qualquer falha originada no cliente HTTP. */
export class HttpError extends Error {
  readonly url: string

  constructor(message: string, url: string) {
    super(message)
    this.name = 'HttpError'
    this.url = url
  }
}

/** A requisição passou do orçamento de tempo e foi abortada. */
export class HttpTimeoutError extends HttpError {
  readonly timeoutMs: number

  constructor(url: string, timeoutMs: number) {
    super(`A requisição passou de ${timeoutMs} ms e foi cancelada.`, url)
    this.name = 'HttpTimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/** Resposta com status fora da faixa de sucesso. */
export class HttpStatusError extends HttpError {
  readonly status: number

  constructor(url: string, status: number, message?: string) {
    super(message ?? `O servidor respondeu ${status}.`, url)
    this.name = 'HttpStatusError'
    this.status = status
  }
}

/**
 * HTTP 429. Quem chama decide a espera: a Lichess exige um minuto inteiro, e
 * essa regra mora no importador, não aqui.
 */
export class RateLimitError extends HttpStatusError {
  /** Valor do cabeçalho `Retry-After` convertido para ms, quando existir. */
  readonly retryAfterMs: number | null

  constructor(url: string, retryAfterMs: number | null) {
    super(url, 429, 'O servidor pediu para diminuir o ritmo (429).')
    this.name = 'RateLimitError'
    this.retryAfterMs = retryAfterMs
  }
}

/** O transporte falhou antes de haver resposta (offline, DNS, TLS). */
export class HttpNetworkError extends HttpError {
  constructor(url: string, message: string) {
    super(message, url)
    this.name = 'HttpNetworkError'
  }
}

/** Subconjunto de `Headers` de que precisamos; qualquer fake implementa. */
export interface HttpHeaders {
  get(name: string): string | null
}

export interface HttpResponse {
  status: number
  body: string
  headers: HttpHeaders
  /** `true` quando a resposta veio do cache em memória, sem tocar a rede. */
  fromCache: boolean
}

export interface HttpGetOptions {
  headers?: Record<string, string>
  timeoutMs?: number
  /** Guarda a resposta no cache em memória e reaproveita dentro do TTL. */
  cache?: boolean
  cacheTtlMs?: number
  /** Aceita 304 sem lançar erro, para quem envia `If-None-Match`. */
  allowNotModified?: boolean
}

export interface HttpClientOptions {
  /** Transporte injetado. Em produção, o `fetch` global; no teste, um fake. */
  fetchFn: typeof fetch
  /** Relógio injetado, em milissegundos. */
  now?: () => number
  timeoutMs?: number
  cacheTtlMs?: number
}

interface CacheEntry {
  expiresAt: number
  status: number
  body: string
  headers: HttpHeaders
}

const EMPTY_HEADERS: HttpHeaders = { get: () => null }

/** Converte `Retry-After` (segundos ou data HTTP) em milissegundos. */
function parseRetryAfter(value: string | null, now: number): number | null {
  if (!value) {
    return null
  }
  const seconds = Number(value.trim())
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000))
  }
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return null
  }
  return Math.max(0, timestamp - now)
}

export class HttpClient {
  private readonly fetchFn: typeof fetch
  private readonly now: () => number
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly cache = new Map<string, CacheEntry>()

  constructor(options: HttpClientOptions) {
    this.fetchFn = options.fetchFn
    this.now = options.now ?? (() => Date.now())
    this.timeoutMs = options.timeoutMs ?? HTTP_CONFIG.timeoutMs
    this.cacheTtlMs = options.cacheTtlMs ?? HTTP_CONFIG.cacheTtlMs
  }

  /** Esvazia o cache em memória. Útil ao trocar de conta importada. */
  clearCache(): void {
    this.cache.clear()
  }

  async get(url: string, options: HttpGetOptions = {}): Promise<HttpResponse> {
    const cached = options.cache === true ? this.readCache(url) : null
    if (cached) {
      return cached
    }

    const timeoutMs = options.timeoutMs ?? this.timeoutMs
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    let response: Response
    try {
      response = await this.fetchFn(url, {
        method: 'GET',
        headers: options.headers,
        signal: controller.signal,
      })
    } catch (error) {
      if (timedOut) {
        throw new HttpTimeoutError(url, timeoutMs)
      }
      throw new HttpNetworkError(url, error instanceof Error ? error.message : 'Falha de rede.')
    } finally {
      clearTimeout(timer)
    }

    const headers: HttpHeaders = response.headers ?? EMPTY_HEADERS

    if (response.status === 429) {
      throw new RateLimitError(url, parseRetryAfter(headers.get('retry-after'), this.now()))
    }

    if (response.status === 304 && options.allowNotModified === true) {
      return { status: 304, body: '', headers, fromCache: false }
    }

    if (response.status < 200 || response.status >= 300) {
      throw new HttpStatusError(url, response.status)
    }

    const body = await response.text()

    if (options.cache === true) {
      this.cache.set(url, {
        expiresAt: this.now() + (options.cacheTtlMs ?? this.cacheTtlMs),
        status: response.status,
        body,
        headers,
      })
    }

    return { status: response.status, body, headers, fromCache: false }
  }

  private readCache(url: string): HttpResponse | null {
    const entry = this.cache.get(url)
    if (!entry) {
      return null
    }
    if (entry.expiresAt <= this.now()) {
      this.cache.delete(url)
      return null
    }
    return { status: entry.status, body: entry.body, headers: entry.headers, fromCache: true }
  }
}
