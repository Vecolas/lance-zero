/**
 * Importador de partidas do Chess.com.
 *
 * Só a PubAPI oficial de leitura, nunca HTML. A API é organizada por arquivo
 * mensal, então cada página nossa é um mês, do mais recente para o mais antigo,
 * e o cursor é `YYYY-MM`.
 *
 * Arquivos de meses fechados nunca mudam, então respeitar ETag/Last-Modified
 * economiza banda de verdade: guardamos o ETag por URL, mandamos
 * `If-None-Match` e, no 304, devolvemos as partidas já convertidas sem
 * reprocessar nada.
 */
import type { Game, GameImportProvider, GamePage, GameSource, ImportQuery } from '@/domain/types'
import { HttpClient, type HttpClientOptions } from './http'
import { hashString } from './hash'

/**
 * Parâmetros da PubAPI.
 *
 * Heurísticas de produto, a calibrar com uso real — exceto o User-Agent, que a
 * documentação do Chess.com pede que identifique a aplicação e o contato.
 */
export const CHESSCOM_CONFIG = {
  baseUrl: 'https://api.chess.com/pub',
  /**
   * Identificação exigida pela PubAPI. Em navegador o `fetch` ignora este
   * cabeçalho por segurança; ele vale para scripts e para servidores nossos.
   */
  userAgent: 'LanceZero/0.1 (app de treino de xadrez; contato: suporte@lancezero.app)',
  /** Chess.com não tem arquivos antes disso; serve de piso da paginação. */
  earliestMonth: '2007-05',
} as const

const SOURCE: GameSource = 'chesscom'

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
])

export interface ChessComImporterOptions {
  /** Transporte injetado. */
  fetchFn: typeof fetch
  /** Relógio injetado, em milissegundos. */
  now?: () => number
  baseUrl?: string
  userAgent?: string
  timeoutMs?: number
  earliestMonth?: string
}

interface ChessComPlayerJson {
  username?: string
  rating?: number
  result?: string
  uuid?: string
}

interface ChessComGameJson {
  url?: string
  uuid?: string
  pgn?: string
  end_time?: number
  time_class?: string
  white?: ChessComPlayerJson
  black?: ChessComPlayerJson
}

interface ChessComArchiveJson {
  games?: ChessComGameJson[]
}

interface ArchiveCacheEntry {
  etag: string | null
  lastModified: string | null
  games: Game[]
}

/** `YYYY-MM` do instante informado, em UTC. */
export function monthKey(timestampMs: number): string {
  const date = new Date(timestampMs)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Mês anterior a `YYYY-MM`. */
export function previousMonth(key: string): string {
  const [rawYear, rawMonth] = key.split('-')
  const year = Number(rawYear)
  const month = Number(rawMonth)
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return key
  }
  if (month <= 1) {
    return `${year - 1}-12`
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`
}

function resultOf(json: ChessComGameJson): Game['result'] {
  const white = json.white?.result
  const black = json.black?.result
  if (white === 'win') {
    return '1-0'
  }
  if (black === 'win') {
    return '0-1'
  }
  if ((white && DRAW_RESULTS.has(white)) || (black && DRAW_RESULTS.has(black))) {
    return '1/2-1/2'
  }
  return '*'
}

function sourceGameId(json: ChessComGameJson): string {
  const uuid = json.uuid?.trim()
  if (uuid) {
    return uuid
  }
  const tail = json.url?.trim().split('/').filter(Boolean).pop()
  if (tail) {
    return tail
  }
  return hashString(json.pgn ?? '')
}

/** Converte uma partida crua da PubAPI no nosso `Game`. */
export function toGame(
  json: ChessComGameJson,
  identity: string,
  importedAtMs: number,
): Game | null {
  const pgn = json.pgn?.trim()
  if (!pgn) {
    return null
  }
  const identityKey = identity.trim().toLowerCase()
  const white = json.white?.username ?? 'Anônimo'
  const black = json.black?.username ?? 'Anônimo'
  const userColor: Game['userColor'] = black.toLowerCase() === identityKey ? 'b' : 'w'
  const playedAtMs = typeof json.end_time === 'number' ? json.end_time * 1000 : importedAtMs
  const id = sourceGameId(json)

  return {
    id: `${SOURCE}:${id}`,
    source: SOURCE,
    sourceGameId: id,
    pgn,
    playedAt: new Date(playedAtMs).toISOString(),
    white,
    black,
    userColor,
    result: resultOf(json),
    importedAt: new Date(importedAtMs).toISOString(),
  }
}

export class ChessComImporter implements GameImportProvider {
  readonly source: GameSource = SOURCE

  private readonly http: HttpClient
  private readonly now: () => number
  private readonly baseUrl: string
  private readonly userAgent: string
  private readonly earliestMonth: string
  /** ETag, Last-Modified e partidas já convertidas, por URL de arquivo mensal. */
  private readonly archives = new Map<string, ArchiveCacheEntry>()

  constructor(options: ChessComImporterOptions) {
    const now = options.now ?? (() => Date.now())
    const httpOptions: HttpClientOptions = {
      fetchFn: options.fetchFn,
      now,
      timeoutMs: options.timeoutMs,
    }
    this.http = new HttpClient(httpOptions)
    this.now = now
    this.baseUrl = (options.baseUrl ?? CHESSCOM_CONFIG.baseUrl).replace(/\/+$/, '')
    this.userAgent = options.userAgent ?? CHESSCOM_CONFIG.userAgent
    this.earliestMonth = options.earliestMonth ?? CHESSCOM_CONFIG.earliestMonth
  }

  /** URL do arquivo mensal. Exposto para o teste conferir o mês. */
  buildUrl(identity: string, month: string): string {
    const [year, monthNumber] = month.split('-')
    const user = encodeURIComponent(identity.trim().toLowerCase())
    return `${this.baseUrl}/player/${user}/games/${year}/${monthNumber}`
  }

  async listGames(identity: string, query: ImportQuery = {}): Promise<GamePage> {
    const month = query.cursor ?? monthKey(this.now())
    const url = this.buildUrl(identity, month)
    const cached = this.archives.get(url)

    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      Accept: 'application/json',
    }
    if (cached?.etag) {
      headers['If-None-Match'] = cached.etag
    }
    if (cached?.lastModified) {
      headers['If-Modified-Since'] = cached.lastModified
    }

    const response = await this.http.get(url, { headers, allowNotModified: true })
    const importedAtMs = this.now()

    let monthGames: Game[]
    if (response.status === 304 && cached) {
      monthGames = cached.games
    } else {
      monthGames = this.parseArchive(response.body, identity, importedAtMs)
      this.archives.set(url, {
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        games: monthGames,
      })
    }

    const floor = query.since ? monthKey(Date.parse(query.since)) : this.earliestMonth
    let games = monthGames
    if (query.since) {
      const since = query.since
      games = games.filter((game) => game.playedAt >= since)
    }
    if (query.max !== undefined) {
      games = games.slice(0, Math.max(0, query.max))
    }

    const nextMonth = previousMonth(month)
    const hasMore = nextMonth >= floor && nextMonth !== month

    return { games, cursor: hasMore ? nextMonth : undefined, hasMore }
  }

  private parseArchive(body: string, identity: string, importedAtMs: number): Game[] {
    if (body.trim() === '') {
      return []
    }
    let archive: ChessComArchiveJson
    try {
      archive = JSON.parse(body) as ChessComArchiveJson
    } catch {
      // Mês sem arquivo ou resposta inesperada: melhor um mês vazio do que
      // derrubar a importação inteira.
      return []
    }
    const games: Game[] = []
    for (const json of archive.games ?? []) {
      const game = toGame(json, identity, importedAtMs)
      if (game) {
        games.push(game)
      }
    }
    return games
  }
}
