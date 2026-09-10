/**
 * CONTRATO COM O SERVIÇO REAL DE TABLEBASE DA LICHESS.
 *
 * POR QUE ESTE ARQUIVO EXISTE: os testes unitários do adapter dublam o `fetch`.
 * Um dublê fiel ao protocolo aprova um adapter que aponta para uma URL que não
 * existe — foi exatamente o que aconteceu aqui: o adapter nasceu apontando para
 * `https://lichess.org/api/tablebase/standard`, que devolve uma página 404 de
 * HTML, e os 21 testes ficaram verdes.
 *
 * O erro seria MUDO em produção. A degradação graciosa transforma qualquer
 * falha em `null`, e `null` é também o valor legítimo de "esta posição não tem
 * tablebase". Nenhuma tela mostraria nada de errado: as lições de final apenas
 * nunca teriam defesa perfeita, para sempre.
 *
 * NÃO RODA NO CI, de propósito, e por dois motivos:
 * 1. depende de rede e de um serviço de terceiro — portão que pisca vermelho
 *    sem culpa do código treina todo mundo a ignorar vermelho;
 * 2. a orientação oficial da Lichess é uma requisição por vez, e o CI roda a
 *    cada push.
 *
 * `vitest.config.ts` só inclui `tests/unit/**`, então este arquivo fica fora de
 * `pnpm test` por construção. Rode à mão com `pnpm test:contrato` sempre que
 * mexer no adapter, na URL ou no formato da resposta.
 *
 * O QUE ELE NÃO PROVA: que o adapter trata bem as falhas. Isso é dos testes
 * unitários, que conseguem produzir timeout e 5xx sob demanda — aqui só dá para
 * observar o caminho feliz do serviço.
 */

import { describe, expect, it } from 'vitest'
import { CATEGORIAS_TABLEBASE } from '@/domain/types'
import { LichessTablebaseProvider, TABLEBASE_CONFIG } from '@/lib/tablebase/provider'

/** Rei e peão contra rei: 3 peças, dentro do alcance, vitória conhecida. */
const FEN_REI_E_PEAO = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'

/** Rei contra rei: empate por material insuficiente, ainda dentro do alcance. */
const FEN_SO_REIS = '4k3/8/8/8/8/8/8/4K3 w - - 0 1'

const TEMPO = 30_000

/**
 * O transporte é injetado de propósito no adapter: nada de `fetch` global
 * escondido. Aqui passamos o de verdade — é o ponto do arquivo. O invólucro
 * existe porque `fetch` solto perde o `this` do global em alguns runtimes.
 */
const transporteReal: typeof fetch = (...args) => globalThis.fetch(...args)

describe('contrato com a tablebase real da Lichess', () => {
  it(
    'o adapter, como está configurado, alcança o serviço e devolve resultado',
    async () => {
      const provider = new LichessTablebaseProvider({ fetchFn: transporteReal })
      const resultado = await provider.probe(FEN_REI_E_PEAO)

      // A asserção que pega a URL errada: com host errado isto é `null`,
      // silenciosamente, que é o mesmo valor de "posição sem tablebase".
      expect(resultado).not.toBeNull()
      expect(CATEGORIAS_TABLEBASE).toContain(resultado?.categoria)
      expect(resultado?.resultado).toBe('vitoria')

      // A resposta tem de trazer lances utilizáveis: é deles que sai a defesa
      // perfeita da lição. Lista vazia aqui seria o serviço mudando de forma.
      expect(resultado?.lances.length).toBeGreaterThan(0)
      expect(resultado?.lances[0]?.uci).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/)
    },
    TEMPO,
  )

  it(
    'posição de empate conhecido não é rotulada como vitória',
    async () => {
      // CONTROLE: sem isto, um adapter que devolvesse 'vitoria' para tudo
      // passaria no teste acima.
      const provider = new LichessTablebaseProvider({ fetchFn: transporteReal })
      const resultado = await provider.probe(FEN_SO_REIS)

      expect(resultado).not.toBeNull()
      expect(resultado?.resultado).toBe('empate')
    },
    TEMPO,
  )

  it(
    'a URL configurada responde JSON, e não uma página de erro em HTML',
    async () => {
      // O sintoma exato do defeito que este arquivo existe para pegar: a URL
      // antiga respondia 200 com HTML de "Page not found".
      const url = `${TABLEBASE_CONFIG.baseUrl}${TABLEBASE_CONFIG.caminho}?fen=${encodeURIComponent(FEN_REI_E_PEAO)}`
      const resposta = await fetch(url)

      expect(resposta.status).toBe(200)
      expect(resposta.headers.get('content-type') ?? '').toContain('application/json')

      const corpo = (await resposta.json()) as { category?: unknown; moves?: unknown }
      expect(CATEGORIAS_TABLEBASE).toContain(corpo.category)
      expect(Array.isArray(corpo.moves)).toBe(true)
    },
    TEMPO,
  )
})
