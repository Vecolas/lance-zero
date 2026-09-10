import { describe, expect, it, vi } from 'vitest'
import { identidadeDePosicao, START_FEN } from '@/lib/chess'
import {
  EXPLORER_CONFIG,
  FILTRO_PADRAO,
  LichessExplorerProvider,
  participacaoDe,
  type MotivoDeIndisponibilidade,
} from '@/lib/openings'
import type { ExplorerFilters } from '@/domain/types'

/**
 * Testes do adapter do Opening Explorer. ZERO rede: o `fetch` é injetado e falso.
 *
 * O QUE ELES PROVAM: a NOSSA lógica — montagem da query, conversão estrita,
 * degradação graciosa com motivo, cache com TTL e teto, e fila serial.
 *
 * O QUE ELES NÃO PROVAM, e é dívida declarada em letras grandes:
 *
 * 1. que o adapter funciona contra a Lichess de verdade. Com `fetch` dublado a
 *    URL nunca é visitada — foi exatamente assim que 21 testes do adapter de
 *    tablebase ficaram verdes apontando para um host inexistente. A URL usada
 *    aqui foi conferida à mão contra o serviço real (ver o cabeçalho de
 *    `explorer.ts`), e nada neste arquivo revalida isso.
 * 2. que o FORMATO da resposta é o que `converter` espera. Na conferência de
 *    2026-09-09 o serviço respondeu **401** a requisições anônimas, então o
 *    corpo real nunca foi visto. O que estes testes garantem é que uma forma
 *    inesperada vira `resposta-invalida`, e não número inventado.
 *
 * Fechar as duas dívidas é trabalho de um teste de contrato fora do CI, como
 * `tests/contrato/tablebase-real.test.ts`.
 */

const RESPOSTA_VALIDA = {
  white: 1000,
  draws: 200,
  black: 800,
  moves: [
    { uci: 'e2e4', san: 'e4', white: 600, draws: 100, black: 400, averageRating: 1250 },
    { uci: 'd2d4', san: 'd4', white: 400, draws: 100, black: 400 },
  ],
  opening: { eco: 'B00', name: "King's Pawn Game" },
}

interface Chamada {
  url: string
  headers: Record<string, string> | undefined
}

function fetchFalso(responder: (url: string) => { status: number; body: string } | Error): {
  fn: typeof fetch
  chamadas: Chamada[]
} {
  const chamadas: Chamada[] = []
  const fn = vi.fn(async (entrada: unknown, init?: { headers?: Record<string, string> }) => {
    const url = String(entrada)
    chamadas.push({ url, headers: init?.headers })
    const resposta = responder(url)
    if (resposta instanceof Error) {
      throw resposta
    }
    return {
      status: resposta.status,
      headers: { get: () => null },
      text: async () => resposta.body,
    }
  })
  return { fn: fn as unknown as typeof fetch, chamadas }
}

function comCorpo(body: string, status = 200) {
  return fetchFalso(() => ({ status, body }))
}

function comJson(status = 200) {
  return comCorpo(JSON.stringify(RESPOSTA_VALIDA), status)
}

const MASTERS: ExplorerFilters = { base: 'masters' }

describe('conversão da resposta', () => {
  it('converte e deriva os totais em vez de confiar num campo do serviço', async () => {
    const { fn } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })

    const stats = await provider.getStats(START_FEN, FILTRO_PADRAO)

    expect(stats).not.toBeNull()
    expect(stats?.brancas).toBe(1000)
    expect(stats?.total).toBe(2000)
    expect(stats?.lances.map((l) => l.san)).toEqual(['e4', 'd4'])
    expect(stats?.lances[0].total).toBe(1100)
    expect(stats?.lances[0].ratingMedio).toBe(1250)
    expect(stats?.lances[1].ratingMedio).toBeNull()
    expect(stats?.abertura).toEqual({ eco: 'B00', nome: "King's Pawn Game", nomePt: null })
    expect(stats?.doCache).toBe(false)
    expect(stats?.fen).toBe(identidadeDePosicao(START_FEN))
  })

  it('resposta sem lances é resposta válida, não erro', async () => {
    const { fn } = comCorpo(JSON.stringify({ white: 0, draws: 0, black: 0 }))
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    const resposta = await provider.consultar(START_FEN, FILTRO_PADRAO)
    expect(resposta.indisponivel).toBeNull()
    expect(resposta.estatisticas?.total).toBe(0)
    expect(resposta.estatisticas?.lances).toEqual([])
  })

  it('um lance malformado invalida a resposta inteira, sem lista pela metade', async () => {
    const { fn } = comCorpo(
      JSON.stringify({
        white: 1,
        draws: 1,
        black: 1,
        moves: [
          { uci: 'e2e4', san: 'e4', white: 1, draws: 0, black: 0 },
          { uci: 'd2d4', san: 'd4', white: 1 },
        ],
      }),
    )
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    const resposta = await provider.consultar(START_FEN, FILTRO_PADRAO)
    expect(resposta.estatisticas).toBeNull()
    expect(resposta.indisponivel).toBe('resposta-invalida')
  })

  it('abertura malformada não derruba a resposta, só fica null', async () => {
    const { fn } = comCorpo(
      JSON.stringify({ white: 1, draws: 0, black: 0, opening: { name: 'sem eco' } }),
    )
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    const stats = await provider.getStats(START_FEN, FILTRO_PADRAO)
    expect(stats?.abertura).toBeNull()
  })
})

describe('montagem da query', () => {
  it('a base, o FEN, o recorte e o corte de partidas vão na URL', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    await provider.getStats(START_FEN, FILTRO_PADRAO)

    const url = new URL(chamadas[0].url)
    expect(`${url.protocol}//${url.host}`).toBe(EXPLORER_CONFIG.baseUrl)
    expect(url.pathname).toBe('/lichess')
    expect(url.searchParams.get('fen')).toBe(identidadeDePosicao(START_FEN))
    expect(url.searchParams.get('speeds')).toBe('blitz,rapid')
    expect(url.searchParams.get('ratings')).toBe('1000,1200,1400')
    expect(url.searchParams.get('variant')).toBe('standard')
    // Não pedimos listas de partidas: o produto não as usa e elas custam banda.
    expect(url.searchParams.get('topGames')).toBe('0')
    expect(url.searchParams.get('recentGames')).toBe('0')
  })

  it('a base masters não manda cadência nem faixa de rating', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    await provider.getStats(START_FEN, MASTERS)

    const url = new URL(chamadas[0].url)
    expect(url.pathname).toBe('/masters')
    expect(url.searchParams.get('speeds')).toBeNull()
    expect(url.searchParams.get('ratings')).toBeNull()
  })

  it('o número de lances pedido é o do filtro, não um valor cravado', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    await provider.getStats(START_FEN, { base: 'masters', maxLances: 3 })
    expect(new URL(chamadas[0].url).searchParams.get('moves')).toBe('3')

    await provider.getStats(START_FEN, MASTERS)
    expect(new URL(chamadas[1].url).searchParams.get('moves')).toBe(
      String(EXPLORER_CONFIG.maxLances),
    )
  })

  it('o token só vai no cabeçalho quando existe', async () => {
    const semToken = comJson()
    await new LichessExplorerProvider({ fetchFn: semToken.fn }).getStats(START_FEN, MASTERS)
    expect(semToken.chamadas[0].headers?.authorization).toBeUndefined()

    const comToken = comJson()
    await new LichessExplorerProvider({ fetchFn: comToken.fn, token: 'abc' }).getStats(
      START_FEN,
      MASTERS,
    )
    expect(comToken.chamadas[0].headers?.authorization).toBe('Bearer abc')
  })
})

/**
 * Critério de aceite da issue: "explorer indisponível não quebra a tela".
 */
describe('degradação graciosa, com o motivo preservado', () => {
  const casos: Array<[string, () => ReturnType<typeof fetchFalso>, MotivoDeIndisponibilidade]> = [
    ['rede caída', () => fetchFalso(() => new TypeError('Failed to fetch')), 'rede'],
    ['401', () => comCorpo('<html>401</html>', 401), 'sem-autorizacao'],
    ['403', () => comCorpo('', 403), 'sem-autorizacao'],
    ['404', () => comCorpo('', 404), 'nao-encontrado'],
    ['429', () => comCorpo('', 429), 'limite-de-taxa'],
    ['500', () => comCorpo('', 500), 'servico'],
    ['corpo que não é JSON', () => comCorpo('<html>manutenção</html>'), 'resposta-invalida'],
    ['JSON de outra forma', () => comCorpo(JSON.stringify({ brancas: 3 })), 'resposta-invalida'],
  ]

  for (const [nome, montar, esperado] of casos) {
    it(`${nome} vira ${esperado}, nunca exceção`, async () => {
      const { fn } = montar()
      const provider = new LichessExplorerProvider({ fetchFn: fn })
      const resposta = await provider.consultar(START_FEN, FILTRO_PADRAO)
      expect(resposta.indisponivel).toBe(esperado)
      expect(resposta.estatisticas).toBeNull()
      await expect(provider.getStats(START_FEN, FILTRO_PADRAO)).resolves.toBeNull()
    })
  }

  /**
   * O 401 tem motivo PRÓPRIO por causa do que foi observado no serviço real.
   * Se ele virasse "sem dados", o app diria "esta posição não tem estatística"
   * para todas as posições do mundo, para sempre, sem uma linha no console.
   */
  it('401 não é confundido com "esta posição não tem partidas"', async () => {
    const semDados = comCorpo(JSON.stringify({ white: 0, draws: 0, black: 0, moves: [] }))
    const semAutorizacao = comCorpo('', 401)

    const a = await new LichessExplorerProvider({ fetchFn: semDados.fn }).consultar(
      START_FEN,
      FILTRO_PADRAO,
    )
    const b = await new LichessExplorerProvider({ fetchFn: semAutorizacao.fn }).consultar(
      START_FEN,
      FILTRO_PADRAO,
    )

    expect(a.indisponivel).toBeNull()
    expect(a.estatisticas?.total).toBe(0)
    expect(b.indisponivel).toBe('sem-autorizacao')
    expect(b.estatisticas).toBeNull()
  })

  it('timeout vira motivo próprio, não exceção', async () => {
    const fn = vi.fn(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolver, rejeitar) => {
          init?.signal?.addEventListener('abort', () => rejeitar(new Error('aborted')))
        }),
    ) as unknown as typeof fetch
    const provider = new LichessExplorerProvider({ fetchFn: fn, timeoutMs: 5 })
    const resposta = await provider.consultar(START_FEN, FILTRO_PADRAO)
    expect(resposta.indisponivel).toBe('timeout')
  })

  it('FEN inválido LANÇA — é bug de quem chama, não serviço fora do ar', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    await expect(provider.consultar('isto não é um fen', FILTRO_PADRAO)).rejects.toThrow()
    expect(chamadas, 'não deve tocar a rede com FEN inválido').toHaveLength(0)
  })

  it('a invariante vale sempre: exatamente um dos dois campos é não-nulo', async () => {
    const cenarios = [
      () => comJson(),
      () => comCorpo('', 401),
      () => comCorpo('não é json'),
      () => fetchFalso(() => new TypeError('offline')),
    ]
    for (const montar of cenarios) {
      const { fn } = montar()
      const provider = new LichessExplorerProvider({ fetchFn: fn })
      const r = await provider.consultar(START_FEN, FILTRO_PADRAO)
      expect((r.estatisticas === null) !== (r.indisponivel === null)).toBe(true)
    }
  })
})

describe('cache', () => {
  it('a segunda consulta à mesma posição não toca a rede', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })

    const primeira = await provider.getStats(START_FEN, FILTRO_PADRAO)
    const segunda = await provider.getStats(START_FEN, FILTRO_PADRAO)

    expect(chamadas).toHaveLength(1)
    expect(primeira?.doCache).toBe(false)
    expect(segunda?.doCache).toBe(true)
  })

  /**
   * A régua morde do outro lado: se o cache respondesse qualquer coisa, este
   * caso passaria com uma requisição só e ninguém notaria.
   */
  it('filtro diferente não é servido pelo cache do anterior', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })

    await provider.getStats(START_FEN, FILTRO_PADRAO)
    await provider.getStats(START_FEN, MASTERS)

    expect(chamadas).toHaveLength(2)
  })

  it('posição diferente não é servida pelo cache do anterior', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })

    await provider.getStats(START_FEN, MASTERS)
    await provider.getStats('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', MASTERS)

    expect(chamadas).toHaveLength(2)
  })

  /**
   * A chave do cache é a IDENTIDADE, não o texto do FEN: o mesmo tabuleiro
   * escrito com contadores diferentes é uma consulta só.
   */
  it('o mesmo tabuleiro com contadores diferentes é uma requisição só', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })

    await provider.getStats(START_FEN, MASTERS)
    await provider.getStats('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 7 9', MASTERS)

    expect(chamadas).toHaveLength(1)
  })

  it('o cache expira: estatística de explorer muda com o tempo', async () => {
    let agora = 0
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({
      fetchFn: fn,
      now: () => agora,
      cacheTtlMs: 1_000,
    })

    await provider.getStats(START_FEN, MASTERS)
    agora = 500
    await provider.getStats(START_FEN, MASTERS)
    expect(chamadas).toHaveLength(1)

    agora = 1_500
    await provider.getStats(START_FEN, MASTERS)
    expect(chamadas).toHaveLength(2)
  })

  it('falha NÃO é cacheada: a posição volta a ser consultada', async () => {
    let tentativa = 0
    const { fn, chamadas } = fetchFalso(() => {
      tentativa += 1
      return tentativa === 1
        ? { status: 401, body: '' }
        : { status: 200, body: JSON.stringify(RESPOSTA_VALIDA) }
    })
    const provider = new LichessExplorerProvider({ fetchFn: fn })

    expect((await provider.consultar(START_FEN, MASTERS)).indisponivel).toBe('sem-autorizacao')
    expect((await provider.consultar(START_FEN, MASTERS)).estatisticas).not.toBeNull()
    expect(chamadas).toHaveLength(2)
  })

  it('o cache tem teto: a entrada mais antiga sai', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn, maxEntradasDeCache: 1 })

    await provider.getStats(START_FEN, MASTERS)
    await provider.getStats(START_FEN, FILTRO_PADRAO)
    await provider.getStats(START_FEN, MASTERS)

    expect(chamadas).toHaveLength(3)
  })

  it('limparCache esvazia de verdade', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })
    await provider.getStats(START_FEN, MASTERS)
    provider.limparCache()
    await provider.getStats(START_FEN, MASTERS)
    expect(chamadas).toHaveLength(2)
  })

  it('duas consultas simultâneas à mesma posição viram uma requisição', async () => {
    const { fn, chamadas } = comJson()
    const provider = new LichessExplorerProvider({ fetchFn: fn })

    const [a, b] = await Promise.all([
      provider.getStats(START_FEN, MASTERS),
      provider.getStats(START_FEN, MASTERS),
    ])

    expect(chamadas).toHaveLength(1)
    expect(a?.total).toBe(b?.total)
  })
})

/**
 * "Sem falsa precisão" aplicada no ponto exato em que ela seria violada.
 */
describe('participação de um lance', () => {
  const stats = {
    fen: identidadeDePosicao(START_FEN),
    base: 'lichess' as const,
    brancas: 40,
    empates: 10,
    pretas: 50,
    total: 100,
    lances: [],
    abertura: null,
    doCache: false,
  }
  const lance = {
    uci: 'e2e4',
    san: 'e4',
    brancas: 20,
    empates: 5,
    pretas: 25,
    total: 50,
    ratingMedio: null,
  }

  it('com amostra suficiente devolve a fração', () => {
    expect(participacaoDe(lance, stats, 50)).toBeCloseTo(0.5)
  })

  it('com amostra pequena devolve null, não um número bonito', () => {
    const poucas = { ...stats, brancas: 2, empates: 0, pretas: 1, total: 3 }
    const umLance = { ...lance, total: 2 }
    expect(participacaoDe(umLance, poucas, 50)).toBeNull()
  })

  it('total zero devolve null em vez de divisão por zero', () => {
    const vazio = { ...stats, brancas: 0, empates: 0, pretas: 0, total: 0 }
    expect(participacaoDe({ ...lance, total: 0 }, vazio, 0)).toBeNull()
  })

  it('o piso vem da configuração, não de um número cravado na chamada', () => {
    const stats51 = { ...stats, total: EXPLORER_CONFIG.minimoDeAmostra }
    const stats49 = { ...stats, total: EXPLORER_CONFIG.minimoDeAmostra - 1 }
    expect(participacaoDe(lance, stats51)).not.toBeNull()
    expect(participacaoDe(lance, stats49)).toBeNull()
  })
})
