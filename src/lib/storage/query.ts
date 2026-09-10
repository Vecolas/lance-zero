/**
 * Regras de leitura compartilhadas pelas implementações de repositório.
 *
 * Memória e IndexedDB precisam responder igual ao mesmo teste de contrato, e
 * a única forma barata de garantir isso é as duas chamarem as mesmas funções
 * puras de filtro e ordenação.
 *
 * ## `GameQuery.since` e `Game.playedAt`: a pré-condição, agora explícita
 *
 * A pré-condição tácita de todo este arquivo era "toda data gravada é ISO-8601
 * em UTC", o que torna a comparação de TEXTO equivalente à comparação
 * CRONOLÓGICA. Para as datas que o próprio app gera (`dueAt`, `createdAt`,
 * `attemptedAt`) isso continua valendo: quem as escreve é `toISOString()`.
 *
 * `playedAt` é diferente, e é a exceção que a issue #53 cobrou: ele vem de
 * FORA — de importadores e de arquivos de backup restaurados, que hoje não
 * validam formato de data. Um `2026-08-26T06:00:00-03:00` é ISO-8601 perfeito
 * e ordena errado como texto. O sintoma seria mudo: `DailyPlanView` recorta com
 * `listGames({ since })` e o domínio (`errosRecentesDeAnalises`) recorta por
 * `Date.parse`, então a partida seria CORTADA pela tela e ACEITA pelo domínio
 * — sem exceção, sem log, sem nada na interface. O erro daquela partida
 * simplesmente não entraria no plano do dia.
 *
 * Decisões que este arquivo carrega por causa disso:
 *
 * 1. **`since` e a ordenação de partidas comparam INSTANTE**, com `Date.parse`,
 *    a mesma comparação do domínio. A pré-condição sobre `playedAt` passa a ser
 *    apenas "é uma data que `Date.parse` lê", sem exigir fuso nenhum. Desde a
 *    issue #57 o próprio TIPO fecha a porta: `GameQuery.since` é `Date`, então
 *    `playedAt >= since` nem compila e a comparação textual deixou de ser um
 *    acidente possível. O instante é lido na entrada e a referência ao `Date`
 *    é descartada — nada aqui guarda o objeto mutável do chamador.
 * 2. **Nada é normalizado na escrita.** Reescrever `playedAt` ao gravar deixaria
 *    o dado já persistido no formato antigo e criaria duas eras de dado no mesmo
 *    banco. A borda que decide é a LEITURA, uma só.
 * 3. **`playedAt` ilegível não entra na janela** — igual ao domínio, que
 *    descarta `Date.parse` NaN. PONTO CEGO DECLARADO: a partida some do recorte
 *    sem avisar. É o comportamento menos ruim porque o efeito é subestimar o
 *    sinal, nunca inventá-lo, e porque as duas pontas somem juntas.
 * 4. **`since` ilegível é erro em voz alta.** Um `Date` inválido (`new
 *    Date('26/08/2026')`) tem `getTime()` NaN; comparar contra NaN filtraria
 *    TUDO e devolveria lista vazia em silêncio — o mesmo defeito da issue #53
 *    numa roupa nova. Quem monta o `since` é código nosso; um `since` quebrado
 *    é defeito de programação, e defeito de programação tem de doer.
 */
import type {
  Game,
  GameQuery,
  PositionAnalysis,
  PuzzleAttempt,
  RepertorioDoAluno,
  ReviewCard,
} from '@/domain/types'
import { StorageError } from './repository'
import { instanteDe } from '@/lib/tempo'

/** Clona valores JSON puros para que o repositório nunca devolva referência viva. */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function compareDesc(a: string, b: string): number {
  if (a === b) {
    return 0
  }
  return a < b ? 1 : -1
}

/** Chave de deduplicação de importação. `null` quando a partida não tem origem externa. */
export function gameDedupeKey(game: Pick<Game, 'source' | 'sourceGameId'>): string | null {
  if (game.sourceGameId === undefined || game.sourceGameId === '') {
    return null
  }
  return `${game.source}:${game.sourceGameId}`
}

/**
 * Ordem cronológica decrescente de partidas, com desempate estável pelo id.
 *
 * Partida com data ilegível vai para o fim: assim ela nunca desloca uma partida
 * real do topo de uma consulta com `limit`.
 */
function compareGamesDesc(a: Game, b: Game): number {
  const instanteA = instanteDe(a.playedAt)
  const instanteB = instanteDe(b.playedAt)
  if (instanteA !== instanteB) {
    if (instanteA === null) return 1
    if (instanteB === null) return -1
    return instanteB - instanteA
  }
  return compareDesc(a.id, b.id)
}

/**
 * Filtra, ordena da mais recente para a mais antiga e aplica o limite.
 *
 * `since` é INCLUSIVO e comparado por instante — ver o cabeçalho do módulo.
 *
 * @throws {StorageError} código `formato-invalido`, quando `since` não é uma
 * data legível.
 */
export function applyGameQuery(games: Game[], query?: GameQuery): Game[] {
  let result = games
  if (query?.source) {
    result = result.filter((game) => game.source === query.source)
  }
  if (query?.since !== undefined) {
    const desde = query.since.getTime()
    if (Number.isNaN(desde)) {
      throw new StorageError(
        'formato-invalido',
        `GameQuery.since precisa ser uma data legível; recebi "${String(query.since)}".`,
      )
    }
    result = result.filter((game) => {
      const jogadaEm = instanteDe(game.playedAt)
      return jogadaEm !== null && jogadaEm >= desde
    })
  }
  result = [...result].sort(compareGamesDesc)
  if (query?.limit !== undefined) {
    result = result.slice(0, Math.max(0, query.limit))
  }
  return result
}

/** Tentativas da mais recente para a mais antiga. */
export function sortPuzzleAttempts(attempts: PuzzleAttempt[], limit?: number): PuzzleAttempt[] {
  const sorted = [...attempts].sort(
    (a, b) => compareDesc(a.attemptedAt, b.attemptedAt) || compareDesc(a.id, b.id),
  )
  return limit === undefined ? sorted : sorted.slice(0, Math.max(0, limit))
}

/** Análises de uma partida em ordem de lance. */
export function sortPositionAnalyses(items: PositionAnalysis[]): PositionAnalysis[] {
  return [...items].sort((a, b) => a.ply - b.ply)
}

/** Chave composta de uma análise de posição. */
export function positionAnalysisKey(item: Pick<PositionAnalysis, 'gameId' | 'ply'>): string {
  return `${item.gameId}#${item.ply}`
}

function compareReviewCards(a: ReviewCard, b: ReviewCard): number {
  if (a.dueAt !== b.dueAt) {
    return a.dueAt < b.dueAt ? -1 : 1
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** Cards vencidos até `now`, do mais atrasado para o menos atrasado. */
export function selectDueCards(cards: ReviewCard[], now: Date): ReviewCard[] {
  const limit = now.toISOString()
  return cards.filter((card) => card.dueAt <= limit).sort(compareReviewCards)
}

/** Todos os cards, ordenados por vencimento. */
export function sortReviewCards(cards: ReviewCard[]): ReviewCard[] {
  return [...cards].sort(compareReviewCards)
}

/**
 * Repertórios do aluno em ordem estável, pelo id da definição.
 *
 * A ordem é do ID e não da data de gravação DE PROPÓSITO: as duas
 * implementações do repositório precisam devolver a mesma lista para o mesmo
 * conteúdo, e `atualizadoEm` empata sempre que o aluno grava dois repertórios no
 * mesmo instante. Empate sem critério devolve ordem de inserção — que difere
 * entre memória e IndexedDB, e o teste de contrato acusaria isso um dia sim,
 * outro não.
 */
export function sortRepertorios(itens: RepertorioDoAluno[]): RepertorioDoAluno[] {
  return [...itens].sort((a, b) =>
    a.definicao.id < b.definicao.id ? -1 : a.definicao.id > b.definicao.id ? 1 : 0,
  )
}
