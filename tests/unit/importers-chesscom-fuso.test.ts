/**
 * Portão do recorte por data em `ChessComImporter.listGames({ since })`.
 *
 * A DECISÃO QUE ESTA SUÍTE PROTEGE: `ImportQuery.since` recorta por INSTANTE,
 * nunca por texto — a mesma regra que a issue #53 já fixou do lado do
 * repositório e que a issue #57 cobrou aqui.
 *
 * O defeito é da classe cara deste projeto: nada estoura. `since` chega com
 * deslocamento (`2024-05-11T09:00:00+09:00`, que é `2024-05-11T00:00:00Z`), a
 * comparação de texto olha o dígito `9` da hora local, e uma partida DENTRO da
 * janela é descartada em silêncio. Ninguém vê exceção, ninguém vê log: a
 * partida simplesmente não é importada, e o erro dela nunca vira treino.
 *
 * Como esta suíte evita ser carimbo:
 *
 * 1. **Não afirma uma lista escrita à mão.** O conjunto esperado é DERIVADO da
 *    própria saída do importador, comparando instantes. Se a fixture mudar, o
 *    esperado muda junto; o que fica cravado é a REGRA.
 * 2. **Fixture inócua reprova.** Antes de cruzar os dois lados, a suíte confere
 *    que existe pelo menos uma partida em que a comparação textual e a
 *    cronológica DISCORDAM. Sem isso, um `since` em UTC deixaria o portão verde
 *    sem medir nada.
 * 3. **Cobre as duas pontas do `since`**: o filtro das partidas do mês E o piso
 *    da paginação (`floor`), que decide se o mês anterior chega a ser pedido.
 *    Um piso calculado por texto para de paginar cedo demais e some com um mês
 *    inteiro, também em silêncio.
 */
import { describe, expect, it } from 'vitest'
import { ChessComImporter, recortarPeloInstante } from '@/lib/importers/chesscom'
import type { Game } from '@/domain/types'

/**
 * `since` como ele pode chegar de fora: ISO-8601 legítimo, com deslocamento.
 *
 * `2024-05-11T09:00:00+09:00` é exatamente `2024-05-11T00:00:00Z`. Comparado
 * como texto, o `09` da hora local o joga para DEPOIS de toda partida gravada
 * na madrugada em UTC.
 */
const SINCE_COM_OFFSET = '2024-05-11T09:00:00+09:00'

/**
 * `since` cujo MÊS em UTC é anterior ao mês do texto.
 *
 * `2024-05-01T08:00:00+09:00` é `2024-04-30T23:00:00Z`: o piso da paginação tem
 * de ser `2024-04`, senão abril nunca é pedido e uma partida da última hora do
 * mês some sem aviso.
 */
const SINCE_QUE_MUDA_DE_MES = '2024-05-01T08:00:00+09:00'

/** Relógio injetado. Define o mês da primeira página. */
const AGORA = Date.parse('2024-05-15T00:00:00.000Z')

const PGN_1 = '[Event "Live Chess"]\n[White "Ana"]\n[Black "Bia"]\n[Result "1-0"]\n\n1. e4 e5 1-0'
const PGN_2 = '[Event "Live Chess"]\n[White "Caio"]\n[Black "Ana"]\n[Result "1-0"]\n\n1. d4 d5 1-0'

/** `end_time` em segundos: 2024-05-10T00:00:00Z e 2024-05-11T00:00:00Z. */
const ARQUIVO = JSON.stringify({
  games: [
    { uuid: '111', pgn: PGN_1, end_time: 1_715_299_200, white: { username: 'Ana' } },
    { uuid: '222', pgn: PGN_2, end_time: 1_715_385_600, black: { username: 'Ana' } },
  ],
})

function fakeResponse(body: string): Response {
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    text: () => Promise.resolve(body),
  } as unknown as Response
}

function build(): ChessComImporter {
  const fetchFn = (() => Promise.resolve(fakeResponse(ARQUIVO))) as unknown as typeof fetch
  return new ChessComImporter({ fetchFn, now: () => AGORA })
}

/**
 * Converte o `since` cru para a forma que o contrato aceita.
 *
 * Isolado num lugar só para que a troca de `string` por `Date` no contrato seja
 * uma linha aqui, e o que a suíte AFIRMA não mude junto.
 */
function since(bruto: string): Date {
  return new Date(bruto)
}

describe('recorte por since no ChessComImporter', () => {
  it('a fixture discorda entre texto e instante (senão o portão não mede nada)', async () => {
    const todas = (await build().listGames('ana')).games
    const instanteDoSince = Date.parse(SINCE_COM_OFFSET)

    const discordantes = todas.filter(
      (game) => game.playedAt >= SINCE_COM_OFFSET !== Date.parse(game.playedAt) >= instanteDoSince,
    )

    expect(
      discordantes.map((game) => game.sourceGameId),
      'nenhuma partida da fixture distingue comparação textual de cronológica',
    ).not.toHaveLength(0)
  })

  it('mantém a partida que está dentro da janela pelo INSTANTE do since', async () => {
    const importer = build()
    const todas = (await importer.listGames('ana')).games
    const instanteDoSince = Date.parse(SINCE_COM_OFFSET)

    // Esperado DERIVADO da fonte, não escrito à mão: a regra é "instante >= since".
    const esperadas = todas
      .filter((game) => Date.parse(game.playedAt) >= instanteDoSince)
      .map((game) => game.sourceGameId)

    expect(esperadas.length, 'o since não recorta nada nesta fixture').toBeGreaterThan(0)
    expect(esperadas.length, 'o since recorta tudo nesta fixture').toBeLessThan(todas.length)

    const recorte = await importer.listGames('ana', { since: since(SINCE_COM_OFFSET) })

    expect(
      recorte.games.map((game) => game.sourceGameId),
      'partida dentro da janela foi perdida pelo recorte',
    ).toEqual(esperadas)
  })

  it('deixa de fora a partida cuja data não é legível, como o repositório faz', () => {
    // Este caso não vem da rede: a PubAPI sempre entrega `end_time` numérico, e
    // por isso o recorte é exercitado direto. Sem este portão, a linha que
    // descarta data ilegível seria uma linha que PARECE portão e não é —
    // nenhuma mutação nela reprovaria nada.
    const base: Game = {
      id: 'chesscom:x',
      source: 'chesscom',
      pgn: '1. e4 e5 *',
      playedAt: 'ontem',
      white: 'Ana',
      black: 'Bia',
      userColor: 'w',
      result: '*',
      importedAt: '2024-05-15T00:00:00.000Z',
    }
    const legivel: Game = { ...base, id: 'chesscom:y', playedAt: '2024-05-11T00:00:00.000Z' }

    const recorte = recortarPeloInstante([base, legivel], Date.parse(SINCE_COM_OFFSET))

    expect(recorte.map((game) => game.id)).toEqual(['chesscom:y'])
  })

  it('recusa em voz alta um since inválido em vez de importar zero partidas', async () => {
    // `new Date('26/08/2026')` é um `Date` para o compilador e NaN para o
    // relógio. Comparar contra NaN devolve `false` sempre: a importação viria
    // vazia, e "nenhuma partida encontrada" é uma mentira plausível na tela.
    await expect(build().listGames('ana', { since: new Date('26/08/2026') })).rejects.toThrow(
      /since/i,
    )
  })

  it('calcula o piso da paginação pelo mês do INSTANTE, não pelo mês do texto', async () => {
    const pagina = await build().listGames('ana', { since: since(SINCE_QUE_MUDA_DE_MES) })

    // 2024-04-30T23:00Z: abril ainda tem partidas dentro da janela, então a
    // paginação precisa continuar. Um piso lido do texto (`2024-05`) pararia.
    expect(pagina.hasMore, 'a paginação parou antes do mês que o since ainda cobre').toBe(true)
    expect(pagina.cursor).toBe('2024-04')
  })
})
