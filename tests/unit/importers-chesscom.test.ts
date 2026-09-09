import { describe, expect, it } from 'vitest'
import { ChessComImporter, monthKey, previousMonth } from '@/lib/importers/chesscom'

interface FakeCall {
  url: string
  headers: Record<string, string>
}

interface FakeResponseInit {
  status?: number
  body?: string
  headers?: Record<string, string>
}

function fakeResponse({ status = 200, body = '', headers = {} }: FakeResponseInit): Response {
  const lower: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    lower[key.toLowerCase()] = value
  }
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    text: () => Promise.resolve(body),
  } as unknown as Response
}

const PGN_1 = '[Event "Live Chess"]\n[White "Ana"]\n[Black "Bia"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
const PGN_2 = '[Event "Live Chess"]\n[White "Caio"]\n[Black "Ana"]\n[Result "1-0"]\n\n1. d4 d5 1-0'

const ARCHIVE = JSON.stringify({
  games: [
    {
      url: 'https://www.chess.com/game/live/111',
      uuid: 'uuid-111',
      pgn: PGN_1,
      end_time: 1_715_299_200,
      time_class: 'blitz',
      white: { username: 'Ana', result: 'win' },
      black: { username: 'Bia', result: 'checkmated' },
    },
    {
      url: 'https://www.chess.com/game/live/222',
      pgn: PGN_2,
      end_time: 1_715_385_600,
      time_class: 'rapid',
      white: { username: 'Caio', result: 'win' },
      black: { username: 'Ana', result: 'resigned' },
    },
  ],
})

// 2024-05-15T00:00:00Z
const NOW = Date.parse('2024-05-15T00:00:00.000Z')

describe('helpers de mês', () => {
  it('formata e retrocede o mês em UTC', () => {
    expect(monthKey(NOW)).toBe('2024-05')
    expect(previousMonth('2024-05')).toBe('2024-04')
    expect(previousMonth('2024-01')).toBe('2023-12')
  })
})

describe('ChessComImporter', () => {
  function build(fetchFn: typeof fetch) {
    return new ChessComImporter({ fetchFn, now: () => NOW, userAgent: 'LanceZero/teste (contato)' })
  }

  it('monta a URL do mês corrente e envia o User-Agent', async () => {
    const calls: FakeCall[] = []
    const fetchFn = ((url: string, init?: RequestInit) => {
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> })
      return Promise.resolve(fakeResponse({ body: ARCHIVE }))
    }) as unknown as typeof fetch

    const page = await build(fetchFn).listGames('Ana')

    expect(calls[0]?.url).toBe('https://api.chess.com/pub/player/ana/games/2024/05')
    expect(calls[0]?.headers['User-Agent']).toBe('LanceZero/teste (contato)')
    expect(calls[0]?.headers['If-None-Match']).toBeUndefined()
    expect(page.games).toHaveLength(2)
    expect(page.games.map((game) => game.userColor)).toEqual(['w', 'b'])
    expect(page.games.map((game) => game.result)).toEqual(['1-0', '1-0'])
    expect(page.games[0]?.sourceGameId).toBe('uuid-111')
    expect(page.games[1]?.sourceGameId).toBe('222')
    expect(page.games[0]?.playedAt).toBe('2024-05-10T00:00:00.000Z')
    expect(page.cursor).toBe('2024-04')
    expect(page.hasMore).toBe(true)
  })

  it('usa o cursor YYYY-MM para pedir o mês anterior', async () => {
    const calls: FakeCall[] = []
    const fetchFn = ((url: string) => {
      calls.push({ url, headers: {} })
      return Promise.resolve(fakeResponse({ body: ARCHIVE }))
    }) as unknown as typeof fetch

    await build(fetchFn).listGames('ana', { cursor: '2023-12' })

    expect(calls[0]?.url).toBe('https://api.chess.com/pub/player/ana/games/2023/12')
  })

  it('envia If-None-Match e reaproveita o cache no 304, sem refazer o parse', async () => {
    const calls: FakeCall[] = []
    let chamadas = 0
    const fetchFn = ((url: string, init?: RequestInit) => {
      chamadas += 1
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> })
      if (chamadas === 1) {
        return Promise.resolve(
          fakeResponse({
            body: ARCHIVE,
            headers: { ETag: '"abc123"', 'Last-Modified': 'Wed, 01 May 2024 00:00:00 GMT' },
          }),
        )
      }
      // Corpo propositalmente ilegível: se o importador tentasse reprocessar,
      // o resultado viria vazio.
      return Promise.resolve(fakeResponse({ status: 304, body: 'isto-nao-e-json' }))
    }) as unknown as typeof fetch

    const importer = build(fetchFn)
    const primeira = await importer.listGames('ana')
    const segunda = await importer.listGames('ana')

    expect(calls[1]?.headers['If-None-Match']).toBe('"abc123"')
    expect(calls[1]?.headers['If-Modified-Since']).toBe('Wed, 01 May 2024 00:00:00 GMT')
    expect(segunda.games).toHaveLength(2)
    expect(segunda.games.map((game) => game.sourceGameId)).toEqual(
      primeira.games.map((game) => game.sourceGameId),
    )
  })

  it('filtra por since e para de paginar no mês do since', async () => {
    const fetchFn = (() =>
      Promise.resolve(fakeResponse({ body: ARCHIVE }))) as unknown as typeof fetch

    const importer = build(fetchFn)
    const completo = await importer.listGames('ana', { since: '2024-05-01T00:00:00.000Z' })
    const recorte = await importer.listGames('ana', { since: '2024-05-11T00:00:00.000Z' })

    expect(completo.games).toHaveLength(2)
    expect(completo.hasMore).toBe(false)
    expect(completo.cursor).toBeUndefined()
    expect(recorte.games.map((game) => game.sourceGameId)).toEqual(['222'])
  })

  it('devolve mês vazio quando a resposta não é um arquivo válido', async () => {
    const fetchFn = (() =>
      Promise.resolve(fakeResponse({ body: 'nao-e-json' }))) as unknown as typeof fetch

    const page = await build(fetchFn).listGames('ana')

    expect(page.games).toEqual([])
  })
})
