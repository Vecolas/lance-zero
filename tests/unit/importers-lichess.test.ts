import { describe, expect, it } from 'vitest'
import { HttpClient, HttpStatusError, HttpTimeoutError, RateLimitError } from '@/lib/importers/http'
import { LICHESS_CONFIG, LichessImporter, parseNdjson } from '@/lib/importers/lichess'

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

/** Deixa a fila de microtarefas e os timers de 0 ms drenarem. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function ndjsonGame(
  id: string,
  whiteName: string,
  blackName: string,
  winner: 'white' | 'black' | null,
  createdAt: number,
): string {
  return JSON.stringify({
    id,
    createdAt,
    lastMoveAt: createdAt + 60_000,
    status: winner ? 'mate' : 'draw',
    ...(winner ? { winner } : {}),
    speed: 'blitz',
    players: {
      white: { user: { name: whiteName, id: whiteName.toLowerCase() }, rating: 1180 },
      black: { user: { name: blackName, id: blackName.toLowerCase() }, rating: 1150 },
    },
    pgn: `[Event "Rated blitz game"]\n[White "${whiteName}"]\n[Black "${blackName}"]\n\n1. e4 e5 2. Nf3 Nc6`,
  })
}

const NDJSON = [
  ndjsonGame('aaa11111', 'Ana', 'Bia', 'white', 1_700_000_000_000),
  '',
  ndjsonGame('bbb22222', 'Caio', 'ANA', 'black', 1_700_000_100_000),
  '   ',
  ndjsonGame('ccc33333', 'Ana', 'Duda', null, 1_700_000_200_000),
  '',
].join('\n')

const NOW = 1_700_100_000_000

describe('HttpClient', () => {
  it('aborta por timeout e devolve erro tipado', async () => {
    const fetchFn = ((_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('abortado')))
      })) as unknown as typeof fetch

    const client = new HttpClient({ fetchFn, now: () => NOW, timeoutMs: 5 })

    await expect(client.get('https://exemplo.test/lento')).rejects.toBeInstanceOf(HttpTimeoutError)
  })

  it('transforma status de erro em HttpStatusError com o status', async () => {
    const fetchFn = (() =>
      Promise.resolve(fakeResponse({ status: 404 }))) as unknown as typeof fetch
    const client = new HttpClient({ fetchFn, now: () => NOW })

    const erro = await client.get('https://exemplo.test/nao-existe').catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(HttpStatusError)
    expect((erro as HttpStatusError).status).toBe(404)
  })

  it('guarda a resposta em cache por URL e expira pelo TTL', async () => {
    let chamadas = 0
    const fetchFn = (() => {
      chamadas += 1
      return Promise.resolve(fakeResponse({ body: `corpo ${chamadas}` }))
    }) as unknown as typeof fetch

    let agora = NOW
    const client = new HttpClient({ fetchFn, now: () => agora, cacheTtlMs: 1_000 })
    const url = 'https://exemplo.test/dados'

    const primeira = await client.get(url, { cache: true })
    const segunda = await client.get(url, { cache: true })
    agora += 1_001
    const terceira = await client.get(url, { cache: true })

    expect(chamadas).toBe(2)
    expect(primeira.fromCache).toBe(false)
    expect(segunda.fromCache).toBe(true)
    expect(segunda.body).toBe('corpo 1')
    expect(terceira.body).toBe('corpo 2')
  })
})

describe('parseNdjson', () => {
  it('ignora linhas vazias e linhas quebradas', () => {
    const parsed = parseNdjson('\n{"id":"a"}\n\n{quebrado\n  \n{"id":"b"}\n')
    expect(parsed.map((game) => game.id)).toEqual(['a', 'b'])
  })
})

describe('LichessImporter', () => {
  it('converte um NDJSON de 3 partidas com a cor correta do usuário', async () => {
    const importer = new LichessImporter({
      fetchFn: (() => Promise.resolve(fakeResponse({ body: NDJSON }))) as unknown as typeof fetch,
      sleep: () => Promise.resolve(),
      now: () => NOW,
    })

    const page = await importer.listGames('ana')

    expect(page.games).toHaveLength(3)
    expect(page.games.map((game) => game.sourceGameId)).toEqual([
      'aaa11111',
      'bbb22222',
      'ccc33333',
    ])
    expect(page.games.map((game) => game.userColor)).toEqual(['w', 'b', 'w'])
    expect(page.games.map((game) => game.result)).toEqual(['1-0', '0-1', '1/2-1/2'])
    expect(page.games[0]?.source).toBe('lichess')
    expect(page.games[0]?.playedAt).toBe(new Date(1_700_000_000_000).toISOString())
    expect(page.games[0]?.importedAt).toBe(new Date(NOW).toISOString())
    expect(page.games[0]?.pgn).toContain('1. e4 e5')
    expect(page.hasMore).toBe(false)
  })

  it('coloca since na URL e pede NDJSON, sem raspar HTML', async () => {
    const calls: Array<{ url: string; headers: Record<string, string> }> = []
    const fetchFn = ((url: string, init?: RequestInit) => {
      calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> })
      return Promise.resolve(fakeResponse({ body: NDJSON }))
    }) as unknown as typeof fetch

    const importer = new LichessImporter({
      fetchFn,
      sleep: () => Promise.resolve(),
      now: () => NOW,
    })
    await importer.listGames('ana', { since: new Date(1_700_000_000_000), max: 50 })

    const call = calls[0]
    expect(call?.url).toContain('https://lichess.org/api/games/user/ana?')
    expect(call?.url).toContain('since=1700000000000')
    expect(call?.url).toContain('max=50')
    expect(call?.headers.Accept).toBe('application/x-ndjson')
  })

  it('usa o cursor como próximo since quando a página encheu', async () => {
    const importer = new LichessImporter({
      fetchFn: (() => Promise.resolve(fakeResponse({ body: NDJSON }))) as unknown as typeof fetch,
      sleep: () => Promise.resolve(),
      now: () => NOW,
    })

    const page = await importer.listGames('ana', { max: 3 })

    expect(page.hasMore).toBe(true)
    expect(page.cursor).toBe(String(1_700_000_200_000 + 1))
  })

  it('espera exatamente um minuto depois de um 429 e tenta de novo', async () => {
    const esperas: number[] = []
    let chamadas = 0
    const fetchFn = (() => {
      chamadas += 1
      if (chamadas === 1) {
        return Promise.resolve(fakeResponse({ status: 429, headers: { 'retry-after': '2' } }))
      }
      return Promise.resolve(fakeResponse({ body: NDJSON }))
    }) as unknown as typeof fetch

    const importer = new LichessImporter({
      fetchFn,
      sleep: (ms) => {
        esperas.push(ms)
        return Promise.resolve()
      },
      now: () => NOW,
    })

    const page = await importer.listGames('ana')

    expect(esperas).toEqual([60_000])
    expect(LICHESS_CONFIG.rateLimitWaitMs).toBe(60_000)
    expect(chamadas).toBe(2)
    expect(page.games).toHaveLength(3)
  })

  it('desiste depois de esgotar as tentativas do 429', async () => {
    const esperas: number[] = []
    const fetchFn = (() =>
      Promise.resolve(fakeResponse({ status: 429 }))) as unknown as typeof fetch

    const importer = new LichessImporter({
      fetchFn,
      sleep: (ms) => {
        esperas.push(ms)
        return Promise.resolve()
      },
      now: () => NOW,
    })

    await expect(importer.listGames('ana')).rejects.toBeInstanceOf(RateLimitError)
    expect(esperas).toEqual([60_000, 60_000])
  })

  it('serializa as requisições: a segunda só começa depois da primeira terminar', async () => {
    const urls: string[] = []
    const liberar: Array<() => void> = []
    const fetchFn = ((url: string) => {
      urls.push(url)
      return new Promise<Response>((resolve) => {
        liberar.push(() => resolve(fakeResponse({ body: NDJSON })))
      })
    }) as unknown as typeof fetch

    const importer = new LichessImporter({
      fetchFn,
      sleep: () => Promise.resolve(),
      now: () => NOW,
    })

    const primeira = importer.listGames('ana')
    const segunda = importer.listGames('bia')
    await flush()

    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('/user/ana?')

    liberar[0]?.()
    await primeira
    await flush()

    expect(urls).toHaveLength(2)
    expect(urls[1]).toContain('/user/bia?')

    liberar[1]?.()
    await expect(segunda).resolves.toMatchObject({ hasMore: false })
  })
})
