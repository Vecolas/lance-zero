/**
 * Importador de partidas da Lichess.
 *
 * Regras oficiais que o código respeita e que não são negociáveis:
 *
 * - uma requisição por vez (a fila interna serializa tudo, mesmo se a UI
 *   disparar dois imports ao mesmo tempo);
 * - em HTTP 429, esperar um minuto inteiro antes de retomar;
 * - nunca raspar HTML: só a API pública em `application/x-ndjson`.
 *
 * `sleep` entra por parâmetro para que o teste do 429 verifique a espera sem
 * de fato esperar sessenta segundos.
 */
import type { Game, GameImportProvider, GamePage, GameSource, ImportQuery } from '@/domain/types'
import { HttpClient, RateLimitError, type HttpClientOptions } from './http'

/**
 * Parâmetros de importação.
 *
 * `rateLimitWaitMs` vem da documentação oficial da Lichess e não deve ser
 * reduzido. Os demais são heurísticas de produto, a calibrar com uso real.
 */
export const LICHESS_CONFIG = {
  baseUrl: 'https://lichess.org',
  /** Um minuto inteiro, exigido pela Lichess após um 429. */
  rateLimitWaitMs: 60_000,
  /** Quantas vezes tentamos de novo depois de esperar. */
  maxRateLimitRetries: 2,
  /** Partidas por página. Páginas menores dão feedback mais cedo na UI. */
  pageSize: 100,
} as const

const SOURCE: GameSource = 'lichess'

export interface LichessImporterOptions {
  /** Transporte injetado. */
  fetchFn: typeof fetch
  /** Espera injetada, para o teste não bloquear de verdade. */
  sleep?: (ms: number) => Promise<void>
  /** Relógio injetado, em milissegundos. */
  now?: () => number
  baseUrl?: string
  pageSize?: number
  timeoutMs?: number
}

interface LichessUser {
  name?: string
  id?: string
}

interface LichessPlayer {
  user?: LichessUser
  aiLevel?: number
  rating?: number
}

interface LichessGameJson {
  id?: string
  createdAt?: number
  lastMoveAt?: number
  status?: string
  winner?: string
  speed?: string
  players?: { white?: LichessPlayer; black?: LichessPlayer }
  pgn?: string
  moves?: string
}

const STARTED_STATUSES = new Set(['created', 'started'])

/** Quebra NDJSON em objetos, ignorando linhas vazias e linhas truncadas. */
export function parseNdjson(body: string): LichessGameJson[] {
  const games: LichessGameJson[] = []
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (line === '') {
      continue
    }
    try {
      games.push(JSON.parse(line) as LichessGameJson)
    } catch {
      // Linha truncada ou lixo no meio do stream: ignoramos em vez de derrubar
      // a página inteira de partidas boas.
      continue
    }
  }
  return games
}

function playerName(player: LichessPlayer | undefined): string {
  if (player?.user?.name) {
    return player.user.name
  }
  if (player?.user?.id) {
    return player.user.id
  }
  if (typeof player?.aiLevel === 'number') {
    return `Stockfish nível ${player.aiLevel}`
  }
  return 'Anônimo'
}

function isIdentity(player: LichessPlayer | undefined, identityKey: string): boolean {
  const name = player?.user?.name?.toLowerCase()
  const id = player?.user?.id?.toLowerCase()
  return name === identityKey || id === identityKey
}

function resultOf(json: LichessGameJson): Game['result'] {
  if (json.winner === 'white') {
    return '1-0'
  }
  if (json.winner === 'black') {
    return '0-1'
  }
  if (json.status && STARTED_STATUSES.has(json.status)) {
    return '*'
  }
  return '1/2-1/2'
}

function buildPgn(json: LichessGameJson, game: Omit<Game, 'pgn' | 'id' | 'importedAt'>): string {
  const pgn = json.pgn?.trim()
  if (pgn) {
    return pgn
  }
  // A API pode vir sem `pgn` quando `pgnInJson` não é aceito; nesse caso
  // montamos um PGN mínimo a partir dos lances em SAN.
  const date = game.playedAt.slice(0, 10).replace(/-/g, '.')
  const headers = [
    `[Event "Lichess ${json.speed ?? 'partida'}"]`,
    `[Site "https://lichess.org/${json.id ?? ''}"]`,
    `[Date "${date}"]`,
    `[White "${game.white}"]`,
    `[Black "${game.black}"]`,
    `[Result "${game.result}"]`,
  ]
  const moves = json.moves?.trim() ?? ''
  return `${headers.join('\n')}\n\n${`${moves} ${game.result}`.trim()}`
}

/** Converte um objeto cru da API no nosso `Game`. */
export function toGame(json: LichessGameJson, identity: string, importedAtMs: number): Game | null {
  const sourceGameId = json.id?.trim()
  if (!sourceGameId) {
    return null
  }
  const identityKey = identity.trim().toLowerCase()
  const white = playerName(json.players?.white)
  const black = playerName(json.players?.black)
  const userColor: Game['userColor'] = isIdentity(json.players?.black, identityKey) ? 'b' : 'w'
  const playedAtMs = json.createdAt ?? json.lastMoveAt ?? importedAtMs
  const partial = {
    source: SOURCE,
    sourceGameId,
    playedAt: new Date(playedAtMs).toISOString(),
    white,
    black,
    userColor,
    result: resultOf(json),
  } satisfies Omit<Game, 'pgn' | 'id' | 'importedAt'>

  return {
    ...partial,
    id: `${SOURCE}:${sourceGameId}`,
    pgn: buildPgn(json, partial),
    importedAt: new Date(importedAtMs).toISOString(),
  }
}

export class LichessImporter implements GameImportProvider {
  readonly source: GameSource = SOURCE

  private readonly http: HttpClient
  private readonly sleep: (ms: number) => Promise<void>
  private readonly now: () => number
  private readonly baseUrl: string
  private readonly pageSize: number
  /** Fila de uma requisição por vez, como a Lichess pede. */
  private queue: Promise<unknown> = Promise.resolve()

  constructor(options: LichessImporterOptions) {
    const now = options.now ?? (() => Date.now())
    const httpOptions: HttpClientOptions = {
      fetchFn: options.fetchFn,
      now,
      timeoutMs: options.timeoutMs,
    }
    this.http = new HttpClient(httpOptions)
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.now = now
    this.baseUrl = (options.baseUrl ?? LICHESS_CONFIG.baseUrl).replace(/\/+$/, '')
    this.pageSize = options.pageSize ?? LICHESS_CONFIG.pageSize
  }

  async listGames(identity: string, query: ImportQuery = {}): Promise<GamePage> {
    return this.enqueue(() => this.fetchPage(identity, query))
  }

  /** Monta a URL da API. Exposto para o teste conferir os parâmetros. */
  buildUrl(identity: string, query: ImportQuery = {}): string {
    const max = Math.max(1, query.max ?? this.pageSize)
    const params = new URLSearchParams({ max: String(max) })
    const since = sinceMs(query)
    if (since !== null) {
      params.set('since', String(since))
    }
    params.set('sort', 'dateAsc')
    params.set('pgnInJson', 'true')
    params.set('clocks', 'false')
    params.set('evals', 'false')
    return `${this.baseUrl}/api/games/user/${encodeURIComponent(identity.trim())}?${params.toString()}`
  }

  /** Garante uma requisição por vez, encadeando as chamadas. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private async fetchPage(identity: string, query: ImportQuery): Promise<GamePage> {
    const max = Math.max(1, query.max ?? this.pageSize)
    const url = this.buildUrl(identity, { ...query, max })
    const body = await this.request(url)
    const importedAtMs = this.now()

    const games: Game[] = []
    for (const json of parseNdjson(body)) {
      const game = toGame(json, identity, importedAtMs)
      if (game) {
        games.push(game)
      }
    }

    const last = games[games.length - 1]
    const hasMore = games.length >= max
    // O cursor é o próximo `since`: um milissegundo depois da última partida,
    // para não trazer a mesma partida de novo.
    const cursor = hasMore && last ? String(new Date(last.playedAt).getTime() + 1) : undefined

    return { games, cursor, hasMore }
  }

  /** Faz a requisição respeitando a espera de um minuto exigida no 429. */
  private async request(url: string): Promise<string> {
    let retries = 0
    for (;;) {
      try {
        const response = await this.http.get(url, {
          headers: { Accept: 'application/x-ndjson' },
        })
        return response.body
      } catch (error) {
        if (error instanceof RateLimitError && retries < LICHESS_CONFIG.maxRateLimitRetries) {
          retries += 1
          await this.sleep(LICHESS_CONFIG.rateLimitWaitMs)
          continue
        }
        throw error
      }
    }
  }
}

/** `cursor` (ms) tem prioridade sobre `since` (ISO). */
function sinceMs(query: ImportQuery): number | null {
  if (query.cursor) {
    const cursor = Number(query.cursor)
    if (Number.isFinite(cursor)) {
      return Math.trunc(cursor)
    }
  }
  if (query.since) {
    const parsed = Date.parse(query.since)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return null
}
