/**
 * Portão do recorte por data em `listGames({ since })`.
 *
 * A decisão que esta suíte protege: **a tela e o domínio precisam concordar
 * sobre quais partidas estão na janela de recência**, e concordar por INSTANTE,
 * não por texto.
 *
 * O defeito que ela reproduz (issue #53) é da classe cara deste projeto: o
 * programa continua rodando e nada fica vermelho. `DailyPlanView` pede
 * `listGames({ since })` e o repositório comparava `playedAt >= since` como
 * STRING; `errosRecentesDeAnalises` compara `Date.parse(playedAt)`. Enquanto
 * todo `playedAt` for ISO-8601 em UTC as duas comparações coincidem — mas um
 * backup restaurado (o importador de backup não valida formato de data) ou um
 * importador futuro pode gravar `2026-08-26T06:00:00-03:00`. Aí a partida é
 * CORTADA pela tela e ACEITA pelo domínio: sem exceção, sem log, sem nada na
 * interface. O erro daquela partida simplesmente não entra no plano do dia.
 *
 * Como esta suíte evita ser carimbo:
 *
 * 1. **Não afirma uma lista de ids esperada.** Afirma a REGRA: o conjunto que a
 *    tela traz é o mesmo que o domínio aceita, seja qual for a fixture. Uma
 *    lista escrita à mão nunca acusa o caso que ninguém escreveu nela.
 * 2. **O veredito do domínio é o do domínio de verdade.** Nenhum teste aqui
 *    recalcula a regra de janela: ele CHAMA `errosRecentesDeAnalises`. Se a
 *    regra do domínio mudar, este portão passa a cobrar a regra nova.
 * 3. **Fixture vazia ou inócua reprova.** Antes de cruzar os dois lados, a
 *    suíte confere que a fixture contém pelo menos uma partida em que a
 *    comparação textual e a cronológica DISCORDAM. Sem essa conferência, trocar
 *    todos os `playedAt` por UTC deixaria o portão verde sem medir nada.
 * 4. **Vale para as duas implementações**, memória e IndexedDB, porque a
 *    pré-condição de formato é do contrato de armazenamento, não de uma classe.
 */

import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  errosRecentesDeAnalises,
  indexarPartidas,
  inicioDaJanela,
} from '@/domain/planning/erros-recentes'
import type { Game, PositionAnalysis } from '@/domain/types'
import { IndexedDbTrainingRepository, deleteDatabase } from '@/lib/storage/indexeddb-repository'
import { MemoryTrainingRepository } from '@/lib/storage/memory-repository'
import type { TrainingRepository } from '@/lib/storage/repository'

/** Relógio injetado: a janela de recência é sempre relativa a este instante. */
const AGORA = new Date('2026-09-09T08:00:00.000Z')

/**
 * A MESMA borda que a tela monta antes de chamar `listGames`.
 *
 * Escrita aqui do mesmo jeito que lá, e de propósito: se o carregamento dos
 * sinais deixar de derivar o `since` de `inicioDaJanela`, é este teste que
 * deixa de descrever a tela — e a issue #53 volta por outra porta.
 *
 * Vai como `Date`, sem `toISOString()`: desde a issue #57 `GameQuery.since` é
 * `Date`, e é o TIPO que impede a comparação textual de voltar por acidente.
 */
const DESDE = inicioDaJanela(AGORA)

interface PartidaDeFixture {
  id: string
  /** Data como um importador poderia tê-la gravado, offset incluído. */
  playedAt: string
  /** Por que este caso existe. Aparece na mensagem de falha. */
  porque: string
}

/**
 * Fixture com offsets reais.
 *
 * `sao-paulo-na-borda` e `toquio-na-borda` são o coração do defeito: a primeira
 * está DENTRO da janela pelo relógio e FORA pelo texto; a segunda, o inverso.
 * As duas em UTC existem para o portão não passar a medir só o caso exótico.
 */
const FIXTURE: readonly PartidaDeFixture[] = [
  {
    id: 'sao-paulo-na-borda',
    // 2026-08-26T09:00:00Z — uma hora DEPOIS do início da janela.
    playedAt: '2026-08-26T06:00:00-03:00',
    porque: 'dentro da janela pelo instante, antes dela pelo texto',
  },
  {
    id: 'toquio-na-borda',
    // 2026-08-26T07:00:00Z — uma hora ANTES do início da janela.
    playedAt: '2026-08-26T16:00:00+09:00',
    porque: 'fora da janela pelo instante, dentro dela pelo texto',
  },
  {
    id: 'sao-paulo-ontem',
    // 2026-09-09T00:00:00Z — o exemplo literal da issue #53.
    playedAt: '2026-09-08T21:00:00-03:00',
    porque: 'recente com offset; as duas comparações deveriam aceitar',
  },
  {
    id: 'utc-dentro',
    playedAt: '2026-09-05T12:00:00.000Z',
    porque: 'caso comum de hoje: UTC dentro da janela',
  },
  {
    id: 'auckland-mesmo-dia',
    // 2026-09-05T10:00:00Z — DEPOIS de `utc-dentro` pelo texto, ANTES pelo
    // relógio. As duas estão na janela, então quem só conserta o filtro e deixa
    // a ordenação em texto ainda entrega a lista na ordem errada — e é a ordem
    // que decide quem o `limit` do "Treino de hoje" descarta.
    playedAt: '2026-09-05T23:00:00+13:00',
    porque: 'na janela, mas ordena diferente por texto e por instante',
  },
  {
    id: 'utc-fora',
    playedAt: '2026-07-01T12:00:00.000Z',
    porque: 'caso comum de hoje: UTC bem fora da janela',
  },
]

const FEN_QUALQUER = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1'

function partida({ id, playedAt }: PartidaDeFixture): Game {
  return {
    id,
    source: 'pgn',
    pgn: '1. e4 e5 *',
    playedAt,
    white: 'eu',
    black: 'adversario',
    userColor: 'w',
    result: '*',
    importedAt: '2026-09-09T07:00:00.000Z',
  }
}

/** Análise que DEVE virar sinal de erro: severidade real e precisão que julga. */
function analiseDeErro(gameId: string): PositionAnalysis {
  return {
    gameId,
    ply: 24,
    fenBefore: FEN_QUALQUER,
    userMoveUci: 'g8f6',
    bestMoveUci: 'd7d5',
    pv: ['d7d5'],
    scoreCp: -180,
    mateIn: null,
    expectedScoreLossPp: 22,
    severity: 'erro-grave',
    skillIds: ['tactics.fork'],
    explanationCode: 'garfo',
    precisao: 'aprofundada',
  }
}

/**
 * Veredito do DOMÍNIO, chamando o domínio.
 *
 * Uma partida "entra no plano" quando o erro dela vira `RecentGameError`. Não
 * há reimplementação da regra de janela aqui: é a função de produção que
 * responde.
 */
function dominioAceita(item: PartidaDeFixture): boolean {
  const jogo = partida(item)
  const erros = errosRecentesDeAnalises([analiseDeErro(jogo.id)], indexarPartidas([jogo]), {
    agora: AGORA,
  })
  return erros.length > 0
}

interface Implementacao {
  nome: string
  criar: () => TrainingRepository
  limpar: (repo: TrainingRepository) => Promise<void>
}

let contador = 0
const nomesDeBanco = new WeakMap<TrainingRepository, string>()

const implementacoes: Implementacao[] = [
  {
    nome: 'memoria',
    criar: () => new MemoryTrainingRepository(),
    limpar: async () => undefined,
  },
  {
    nome: 'indexeddb',
    criar: () => {
      contador += 1
      const databaseName = `lance-zero-fuso-${contador}`
      const repo = new IndexedDbTrainingRepository({ databaseName })
      nomesDeBanco.set(repo, databaseName)
      return repo
    },
    limpar: async (repo) => {
      await (repo as IndexedDbTrainingRepository).close()
      const databaseName = nomesDeBanco.get(repo)
      if (databaseName) await deleteDatabase(databaseName)
    },
  },
]

/**
 * A borda em TEXTO, do jeito que o defeito da issue #53 a escrevia.
 *
 * Continua existindo depois da issue #57 porque a #57 só matou METADE da
 * classe: `GameQuery.since` virou `Date`, mas o outro operando, `playedAt`,
 * segue sendo `string` vinda de fora. Nada impede alguém de escrever
 * `game.playedAt >= since.toISOString()` — e é exatamente essa a armadilha que
 * a fixture abaixo precisa continuar detectando.
 */
const DESDE_COMO_TEXTO = DESDE.toISOString()

describe('fixture do recorte por data', () => {
  it('contem partidas em que texto e instante discordam', () => {
    // Portão de zero verificações REPROVA: sem nenhuma armadilha, tudo abaixo
    // passaria a comparar UTC com UTC e não mediria mais o defeito da issue #53.
    const armadilhas = FIXTURE.filter(
      (item) => item.playedAt >= DESDE_COMO_TEXTO !== Date.parse(item.playedAt) >= DESDE.getTime(),
    )
    expect(armadilhas.map((item) => item.id).length).toBeGreaterThan(0)
    // E precisa haver armadilha dos DOIS lados: só "cortada pela tela" deixaria
    // o caso inverso (trazida à toa e descartada depois) sem portão.
    expect(armadilhas.filter((item) => dominioAceita(item)).length).toBeGreaterThan(0)
    expect(armadilhas.filter((item) => !dominioAceita(item)).length).toBeGreaterThan(0)
  })

  it('exercita partidas dentro e fora da janela', () => {
    expect(FIXTURE.filter((item) => dominioAceita(item)).length).toBeGreaterThan(0)
    expect(FIXTURE.filter((item) => !dominioAceita(item)).length).toBeGreaterThan(0)
  })
})

describe.each(implementacoes)('recorte por data do repositorio ($nome)', (impl) => {
  let repo: TrainingRepository

  beforeEach(async () => {
    repo = impl.criar()
    for (const item of FIXTURE) {
      await repo.saveGame(partida(item))
    }
  })

  afterEach(async () => {
    await impl.limpar(repo)
  })

  it('traz exatamente as partidas que o dominio aceita na janela', async () => {
    const trazidas = new Set((await repo.listGames({ since: DESDE })).map((jogo) => jogo.id))

    const cortadasPelaTela = FIXTURE.filter(
      (item) => dominioAceita(item) && !trazidas.has(item.id),
    ).map((item) => `${item.id} (${item.porque})`)
    const trazidasSemUso = FIXTURE.filter(
      (item) => !dominioAceita(item) && trazidas.has(item.id),
    ).map((item) => `${item.id} (${item.porque})`)

    expect({ cortadasPelaTela, trazidasSemUso }).toEqual({
      cortadasPelaTela: [],
      trazidasSemUso: [],
    })
  })

  it('ordena da mais recente para a mais antiga pelo instante, nao pelo texto', async () => {
    const lidas = await repo.listGames()
    const esperado = [...FIXTURE]
      .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
      .map((item) => item.id)

    expect(lidas.map((jogo) => jogo.id)).toEqual(esperado)
  })

  it('o limite corta a mais antiga da janela pelo instante', async () => {
    // O teto de leitura do "Treino de hoje" é aplicado DEPOIS da ordenação, e é
    // ele que transforma uma ordem errada em partida perdida. O limite é
    // derivado da fixture — número cravado passaria a cobrar o tamanho da
    // fixture em vez da regra.
    const naJanela = FIXTURE.filter((item) => dominioAceita(item)).sort(
      (a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt),
    )
    expect(naJanela.length).toBeGreaterThan(1)

    const lidas = await repo.listGames({ since: DESDE, limit: naJanela.length - 1 })

    expect(lidas.map((jogo) => jogo.id)).toEqual(naJanela.slice(0, -1).map((item) => item.id))
  })

  it('partida com data ilegivel nao entra na janela, como no dominio', async () => {
    // O domínio descarta `Date.parse` NaN. O repositório precisa descartar
    // igual, senão volta a divergência — agora pelo outro lado.
    await repo.saveGame(partida({ id: 'sem-data', playedAt: 'ontem', porque: 'ilegivel' }))
    const trazidas = (await repo.listGames({ since: DESDE })).map((jogo) => jogo.id)

    expect(trazidas).not.toContain('sem-data')
    expect(dominioAceita({ id: 'sem-data', playedAt: 'ontem', porque: 'ilegivel' })).toBe(false)
  })

  it('recusa em voz alta um since ilegivel em vez de devolver lista vazia', async () => {
    // Comparar contra um NaN filtraria TUDO em silêncio, que é o mesmo defeito
    // da issue #53 numa roupa nova.
    // `new Date('26/08/2026')` compila: `Date` inválido é um `Date`. O tipo
    // matou a comparação textual, não a data inválida — esta ponta continua
    // precisando de portão.
    await expect(repo.listGames({ since: new Date('26/08/2026') })).rejects.toThrow(/since/i)
  })
})
