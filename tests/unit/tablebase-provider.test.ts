/**
 * Testes do adapter de tablebase. ZERO rede: o `fetch` é injetado e falso.
 *
 * O que estes testes provam: a NOSSA lógica — conversão, degradação graciosa,
 * cache, fila serial e o guarda de alcance do serviço.
 *
 * O que eles NÃO provam, e é dívida declarada: que o adapter funciona contra a
 * Lichess de verdade. Dublê fiel ao protocolo já escondeu integração quebrada
 * antes; enquanto não houver um teste contra o serviço real, isto continua sem
 * prova.
 */

import { describe, expect, it, vi } from 'vitest'
import { CATEGORIAS_TABLEBASE } from '@/domain/types'
import { LichessTablebaseProvider, TABLEBASE_CONFIG, melhorLanceDe } from '@/lib/tablebase'

const FEN_COBERTO = '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1'
const FEN_OUTRO = '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1'
const FEN_CHEIO = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const RESPOSTA_VALIDA = {
  category: 'win',
  dtz: 12,
  dtm: 21,
  checkmate: false,
  stalemate: false,
  moves: [
    { uci: 'e6d6', san: 'Kd6', category: 'loss', dtz: -11, dtm: -20 },
    { uci: 'e5e6', san: 'e6', category: 'draw', dtz: 0, dtm: null },
  ],
}

interface Chamada {
  url: string
}

function fetchFalso(responder: (url: string) => { status: number; body: string } | Error): {
  fn: typeof fetch
  chamadas: Chamada[]
} {
  const chamadas: Chamada[] = []
  const fn = vi.fn(async (entrada: unknown) => {
    const url = String(entrada)
    chamadas.push({ url })
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

describe('LichessTablebaseProvider — resposta válida', () => {
  it('converte a resposta e mantém a ordem dos lances', async () => {
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    const resultado = await provider.probe(FEN_COBERTO)

    expect(resultado).not.toBeNull()
    expect(resultado?.categoria).toBe('win')
    expect(resultado?.resultado).toBe('vitoria')
    expect(resultado?.dtz).toBe(12)
    expect(resultado?.dtm).toBe(21)
    expect(resultado?.lances.map((lance) => lance.uci)).toEqual(['e6d6', 'e5e6'])
    expect(melhorLanceDe(resultado)?.uci).toBe('e6d6')
    expect(resultado?.doCache).toBe(false)
    expect(chamadas).toHaveLength(1)
    // Afirma a REGRA (o FEN vai codificado na query, no endereço configurado),
    // não o endereço literal. A versão anterior cravava o caminho à mão e, por
    // isso, ficou VERDE afirmando uma URL que não existe — quem pega host errado
    // é `tests/contrato/tablebase-real.test.ts`, que fala com o serviço real.
    expect(chamadas[0].url).toContain(`${TABLEBASE_CONFIG.baseUrl}${TABLEBASE_CONFIG.caminho}?fen=`)
    expect(chamadas[0].url).toContain(encodeURIComponent(FEN_COBERTO))
  })

  it('não inventa resultado para a categoria unknown', async () => {
    const { fn } = comCorpo(JSON.stringify({ category: 'unknown', moves: [] }))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    const resultado = await provider.probe(FEN_COBERTO)

    expect(resultado?.categoria).toBe('unknown')
    expect(resultado?.resultado).toBeNull()
  })

  it('trata vitória amaldiçoada pela regra dos 50 lances como empate', async () => {
    const { fn } = comCorpo(JSON.stringify({ category: 'cursed-win', moves: [] }))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    expect((await provider.probe(FEN_COBERTO))?.resultado).toBe('empate')
  })

  it('toda categoria declarada tem um mapeamento decidido', async () => {
    let verificadas = 0
    for (const categoria of CATEGORIAS_TABLEBASE) {
      const { fn } = comCorpo(JSON.stringify({ category: categoria, moves: [] }))
      const provider = new LichessTablebaseProvider({ fetchFn: fn })
      const resultado = await provider.probe(FEN_COBERTO)
      expect(resultado, categoria).not.toBeNull()
      expect(resultado?.categoria, categoria).toBe(categoria)
      verificadas += 1
    }
    expect(verificadas, 'nenhuma categoria foi exercitada').toBe(CATEGORIAS_TABLEBASE.length)
  })
})

describe('LichessTablebaseProvider — degradação graciosa', () => {
  it('404 vira null, não exceção', async () => {
    const { fn } = comCorpo('', 404)
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('erro de rede vira null, não exceção', async () => {
    const { fn } = fetchFalso(() => new TypeError('Failed to fetch'))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('timeout vira null, não exceção', async () => {
    const fn = vi.fn(
      (_url: unknown, init?: { signal?: AbortSignal }) =>
        new Promise((_resolver, rejeitar) => {
          init?.signal?.addEventListener('abort', () => rejeitar(new Error('aborted')))
        }),
    ) as unknown as typeof fetch
    const provider = new LichessTablebaseProvider({ fetchFn: fn, timeoutMs: 5 })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('429 vira null, não exceção', async () => {
    const { fn } = comCorpo('', 429)
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('JSON inválido vira null', async () => {
    const { fn } = comCorpo('<html>manutenção</html>')
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('JSON válido com forma inesperada vira null', async () => {
    const { fn } = comCorpo(JSON.stringify({ categoria: 'ganhou' }))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('categoria fora do vocabulário conhecido vira null', async () => {
    const { fn } = comCorpo(JSON.stringify({ category: 'quase-ganho', moves: [] }))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('um lance malformado invalida a resposta inteira, sem lista pela metade', async () => {
    const { fn } = comCorpo(
      JSON.stringify({
        category: 'win',
        moves: [{ uci: 'e6d6', category: 'loss' }, { category: 'draw' }],
      }),
    )
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe(FEN_COBERTO)).resolves.toBeNull()
  })

  it('FEN inválido LANÇA — é bug de quem chama, não serviço fora do ar', async () => {
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })
    await expect(provider.probe('isto não é um fen')).rejects.toThrow()
    expect(chamadas, 'não deve tocar a rede com FEN inválido').toHaveLength(0)
  })
})

describe('LichessTablebaseProvider — cache e requisições', () => {
  it('a segunda consulta ao mesmo FEN não toca a rede', async () => {
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    const primeira = await provider.probe(FEN_COBERTO)
    const segunda = await provider.probe(FEN_COBERTO)

    expect(chamadas).toHaveLength(1)
    expect(primeira?.doCache).toBe(false)
    expect(segunda?.doCache).toBe(true)
    expect(segunda?.categoria).toBe(primeira?.categoria)
  })

  it('FEN diferente não é servido pelo cache do anterior', async () => {
    // A régua morde do outro lado: se o cache respondesse qualquer FEN, este
    // caso passaria com uma requisição só e ninguém notaria.
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    await provider.probe(FEN_COBERTO)
    await provider.probe(FEN_OUTRO)

    expect(chamadas).toHaveLength(2)
  })

  it('404 também é cacheado: a posição não coberta não é reperguntada', async () => {
    const { fn, chamadas } = comCorpo('', 404)
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    await provider.probe(FEN_COBERTO)
    await provider.probe(FEN_COBERTO)

    expect(chamadas).toHaveLength(1)
  })

  it('falha transitória NÃO é cacheada: a posição volta a ser consultada', async () => {
    let tentativa = 0
    const { fn, chamadas } = fetchFalso(() => {
      tentativa += 1
      return tentativa === 1
        ? new TypeError('Failed to fetch')
        : { status: 200, body: JSON.stringify(RESPOSTA_VALIDA) }
    })
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    expect(await provider.probe(FEN_COBERTO)).toBeNull()
    expect((await provider.probe(FEN_COBERTO))?.categoria).toBe('win')
    expect(chamadas).toHaveLength(2)
  })

  it('duas consultas simultâneas ao mesmo FEN viram uma requisição', async () => {
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    const [a, b] = await Promise.all([provider.probe(FEN_COBERTO), provider.probe(FEN_COBERTO)])

    expect(chamadas).toHaveLength(1)
    expect(a?.categoria).toBe('win')
    expect(b?.categoria).toBe('win')
  })

  it('limparCache faz a próxima consulta voltar à rede', async () => {
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    await provider.probe(FEN_COBERTO)
    provider.limparCache()
    await provider.probe(FEN_COBERTO)

    expect(chamadas).toHaveLength(2)
  })

  it('posição acima do alcance do serviço não gera requisição', async () => {
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn })

    expect(await provider.probe(FEN_CHEIO)).toBeNull()
    expect(chamadas).toHaveLength(0)
    expect(TABLEBASE_CONFIG.maxPecas).toBeGreaterThan(0)
  })

  it('o teto de cache não deixa a memória crescer sem limite', async () => {
    const { fn, chamadas } = comCorpo(JSON.stringify(RESPOSTA_VALIDA))
    const provider = new LichessTablebaseProvider({ fetchFn: fn, maxEntradasDeCache: 1 })

    await provider.probe(FEN_COBERTO)
    await provider.probe(FEN_OUTRO)
    // A primeira posição foi despejada: volta a custar uma requisição.
    await provider.probe(FEN_COBERTO)

    expect(chamadas).toHaveLength(3)
  })
})
