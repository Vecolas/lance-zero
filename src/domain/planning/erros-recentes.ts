/**
 * Análises persistidas viram sinal de erro recente para o planner.
 *
 * Este arquivo fecha o laço no lado do PLANO: a revisão de partida já grava
 * `PositionAnalysis` e cards de revisão, mas o planner continuava recebendo
 * `recentGameErrors: []`. Daqui sai a lista que faz o "Treino de hoje" refletir
 * o que a partida real mostrou.
 *
 * Puro e determinístico: nenhuma chamada a `Date.now`, `Math.random`, rede ou
 * persistência. O relógio entra por parâmetro.
 *
 * Decisões que este arquivo carrega:
 *
 * 1. **A data do erro é a da PARTIDA (`Game.playedAt`), nunca a da análise.**
 *    É por isso que a função exige o mapa de partidas em vez de se virar só com
 *    as análises: `PositionAnalysis` não guarda data nenhuma, e usar "agora"
 *    faria analisar hoje um jogo de três semanas atrás inflar a prioridade
 *    daquela habilidade. O sintoma seria o plano do dia errado, que ninguém
 *    liga à causa. É a mesma decisão que `CriticalMoment.ocorridoEm` registra
 *    do outro lado do pipeline.
 *
 * 2. **Número raso não julga lance.** O pipeline grava TODAS as análises: a
 *    varredura rasa de cada lance do usuário e o aprofundamento dos candidatos.
 *    O contrato de `AnalysisPrecision` diz que o número raso serve para ORDENAR
 *    candidatos, não para julgar um lance isolado. E há um caminho real em que
 *    uma análise `rasa` chega aqui com `skillIds` preenchidos: quando o
 *    aprofundamento falha, `pipeline.ts` mantém o número raso e mesmo assim
 *    anexa a explicação. Deixar isso virar prioridade é falsa precisão — o
 *    princípio 8 do CLAUDE.md.
 *
 * 3. **Só a precisão que julga entra, por lista de inclusão.** O teste é
 *    `=== 'aprofundada'` e não `!== 'rasa'`: se um dia existir um terceiro
 *    nível de precisão, ele nasce NEUTRO (não vira sinal) em vez de ser
 *    promovido a diagnóstico em silêncio.
 *
 * 4. **Uma entrada por habilidade de cada análise.** O planner conta
 *    OCORRÊNCIAS; agrupar aqui apagaria quantas vezes a habilidade falhou. É a
 *    mesma regra de `prioridadesDeHabilidade` em `@/domain/games/para-treino`,
 *    que faz o mesmo a partir de `CriticalMoment` (memória, dentro da tela de
 *    revisão) enquanto esta faz a partir do que já está no disco.
 *
 * 5. **Análise órfã não vira erro.** Análise cujo `gameId` não está no mapa
 *    recebido não tem data confiável, e inventar uma é justamente o defeito da
 *    decisão 1. PONTO CEGO DECLARADO: ela some da conta sem avisar. É aceitável
 *    porque quem chama monta o mapa a partir das mesmas partidas de onde leu as
 *    análises; um backup restaurado pela metade é o único caso em que isso
 *    mordia, e ali o efeito é subestimar a prioridade, não inflá-la.
 */

import { PLANNER_CONFIG, type RecentGameError } from '@/domain/planning/planner'
import type { AnalysisPrecision, Game, PositionAnalysis } from '@/domain/types'
import { instanteDe } from '@/lib/tempo'

const MS_POR_DIA = 86_400_000

/**
 * Parâmetros da leitura de erros recentes.
 *
 * ATENÇÃO: `maxPartidasVarridas` é HEURÍSTICA DE PRODUTO, não constante
 * científica. Não saiu de dados: foi escolhido para o "Treino de hoje" abrir
 * rápido num celular mediano, já que cada partida custa uma leitura no
 * IndexedDB. Recalibrar quando houver medição de tempo de abertura.
 */
export const ERROS_RECENTES_CONFIG = {
  /**
   * Janela, em dias, para um erro de partida ainda contar como recente.
   *
   * NÃO é uma segunda janela: é a MESMA do planner, derivada dele. O planner
   * refiltra por conta própria, e duas janelas com valores próprios divergiriam
   * na primeira vez que alguém girasse só uma — sem erro nenhum, só um plano
   * diferente do que a configuração diz.
   */
  janelaDias: PLANNER_CONFIG.janelaErrosRecentesDias,
  /**
   * Teto de partidas cujas análises são lidas para montar o sinal.
   *
   * Existe para a leitura por partida não virar N+1 sem limite superior.
   */
  maxPartidasVarridas: 10,
} as const

/**
 * Precisão que autoriza julgar um lance.
 *
 * LIMITE DE DESIGN, não botão de ajuste: é o contrato de `AnalysisPrecision`,
 * e afrouxá-lo significaria apresentar número raso como diagnóstico.
 */
const PRECISAO_QUE_JULGA: AnalysisPrecision = 'aprofundada'

/**
 * Início da janela de recência.
 *
 * Exportada porque quem lê do repositório precisa da MESMA borda para filtrar
 * partidas antes de trazê-las (`GameQuery.since`). Duas bordas calculadas em
 * lugares diferentes é o desenho em que a tela pede um intervalo e o domínio
 * usa outro.
 */
export function inicioDaJanela(
  agora: Date,
  janelaDias: number = ERROS_RECENTES_CONFIG.janelaDias,
): Date {
  return new Date(agora.getTime() - janelaDias * MS_POR_DIA)
}

/**
 * Indexa partidas por `id`.
 *
 * Existe para a chave do mapa ter uma fonte só: `PositionAnalysis.gameId`
 * aponta para `Game.id`, e não para `sourceGameId`.
 */
export function indexarPartidas(partidas: readonly Game[]): Map<string, Game> {
  return new Map(partidas.map((partida) => [partida.id, partida]))
}

export interface ErrosRecentesOptions {
  /** Relógio injetado. */
  agora: Date
  /** Janela em dias; por padrão, a do `ERROS_RECENTES_CONFIG`. */
  janelaDias?: number
}

/**
 * Monta os sinais de erro de partida real no formato que o planner consome.
 *
 * A ordem da saída é a da entrada: nada é reordenado, para o resultado ser
 * função só dos argumentos.
 */
export function errosRecentesDeAnalises(
  analises: readonly PositionAnalysis[],
  partidasPorId: ReadonlyMap<string, Game>,
  { agora, janelaDias = ERROS_RECENTES_CONFIG.janelaDias }: ErrosRecentesOptions,
): RecentGameError[] {
  const limite = inicioDaJanela(agora, janelaDias).getTime()
  const erros: RecentGameError[] = []

  for (const analise of analises) {
    // Lance `ok` não é erro: não há nada a treinar nele.
    if (analise.severity === 'ok') continue
    if (analise.precisao !== PRECISAO_QUE_JULGA) continue

    const partida = partidasPorId.get(analise.gameId)
    if (!partida) continue

    // Mesma função que `applyGameQuery` usa para recortar por `since`: a regra
    // de comparação tem um dono só, senão as duas pontas divergem em silêncio.
    const jogadaEm = instanteDe(partida.playedAt)
    if (jogadaEm === null || jogadaEm < limite) continue

    // Análise sem habilidade atribuída (explicação `unknown`) não contribui, e
    // não há filtro para isso porque não há regra extra: a atribuição de
    // habilidade já é a decisão de quem explicou, e o laço abaixo não roda. Um
    // `if` aqui afirmaria uma regra que nenhuma mutação consegue violar —
    // linha que parece portão e não é.
    for (const skillId of analise.skillIds) {
      // A data é a da PARTIDA. Ver decisão 1 no topo do arquivo.
      erros.push({ skillId, severity: analise.severity, ocorridoEm: partida.playedAt })
    }
  }

  return erros
}
