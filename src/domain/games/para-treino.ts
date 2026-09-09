/**
 * Erro de partida vira treino.
 *
 * Este arquivo fecha o laço do produto no lado da PARTIDA: os momentos
 * críticos já são calculados (`./critical`) e explicados (`./explain`), mas até
 * aqui morriam na tela da revisão. Daqui saem as três coisas que o resto do
 * sistema consome: um card de revisão, a lista do que merece virar card, e os
 * sinais que sobem a prioridade das habilidades no planner.
 *
 * Decisões que este arquivo carrega:
 *
 * 1. **O id do card é derivado de `gameId` + `ply`, nunca sorteado.** Reanalisar
 *    a mesma partida tem de ATUALIZAR o card, não empilhar uma cópia. Sem isso
 *    cada reanálise enche a fila de revisão com o mesmo erro e o aluno paga em
 *    tempo de sessão. `encodeURIComponent` no `gameId` mantém o par injetivo:
 *    ele escapa o separador, então nenhum outro par produz o mesmo id.
 *
 * 2. **A posição do card é a de ANTES do lance e a solução é o melhor lance.**
 *    O card existe para o aluno REENCONTRAR o lance certo. Guardar a posição
 *    depois do erro treinaria a repetir o erro.
 *
 * 3. **`unknown` não vira card.** Mandar treinar um padrão que nem sabemos
 *    nomear é pior que não mandar nada, e é a mesma regra do PEDAGOGY que já
 *    governa `explain.ts`. A regra é ABSOLUTA (não é botão de ajuste), então
 *    ela mora num predicado só e o conversor recusa em voz alta quem a viola.
 *
 * 4. **O prompt não entrega a solução.** Ele usa o `habitoQuePreveniria` da
 *    explicação, que descreve o hábito de pensamento sem nomear o lance nem o
 *    motivo. `oQueAconteceu` cita o melhor lance em SAN e por isso NÃO entra
 *    aqui. A perda em pontos percentuais também fica de fora: o aluno pensa
 *    antes de ver número de engine.
 *
 * 5. **Relógio por parâmetro.** Nenhuma chamada a `Date.now` ou `Math.random`.
 *    Mesma entrada e mesmo relógio produzem exatamente o mesmo card.
 */

import type { RecentGameError } from '@/domain/planning/planner'
import type { CriticalMoment, MoveSeverity, ReviewCard } from '@/domain/types'
import { createReviewCard } from '@/lib/fsrs/cards'
import { UNKNOWN_CODE } from './explain'
import { severityRank } from './severity'

// ------------------------------------------------------------------- config

/**
 * Parâmetros da conversão de erro em treino.
 *
 * ATENÇÃO: são HEURÍSTICAS DE PRODUTO, não constantes científicas. Nenhum
 * destes números saiu de dados; foram escolhidos para uma sessão de ~1100
 * continuar cabendo no orçamento do plano do dia e devem ser recalibrados
 * quando houver telemetria de quantos cards de erro o usuário realmente
 * consegue revisar sem abandonar a sessão.
 */
export interface ParaTreinoConfig {
  /**
   * Severidade mínima para um momento virar card.
   *
   * Imprecisão fica de fora de propósito: um lance 3 pp pior não sustenta uma
   * revisão espaçada inteira, e transformá-lo em card gasta a fila com ruído.
   */
  severidadeMinima: MoveSeverity
  /**
   * Teto de cards por partida.
   *
   * Trinta erros de uma partida viram trinta cards e afogam o aluno; o plano do
   * dia estoura e a revisão deixa de ser escolha e vira fila.
   */
  maxCardsPorPartida: number
  /** Teto do lote inteiro, quando várias partidas são processadas juntas. */
  maxCardsPorLote: number
}

export const PARA_TREINO_CONFIG: ParaTreinoConfig = {
  severidadeMinima: 'erro',
  maxCardsPorPartida: 3,
  maxCardsPorLote: 6,
}

// ----------------------------------------------------------------- elegibilidade

/**
 * O momento tem um padrão que sabemos nomear?
 *
 * Fonte única da regra: o conversor recusa e o seletor filtra pelo MESMO
 * predicado, para as duas metades nunca divergirem.
 */
export function temPadraoNomeado(momento: CriticalMoment): boolean {
  return momento.explanation !== null && momento.explanation.code !== UNKNOWN_CODE
}

// ------------------------------------------------------------------ identidade

/** Prefixo do id, para o card de erro ser reconhecível na fila sem consultar `kind`. */
export const PREFIXO_ID_ERRO = 'erro-de-partida'

/**
 * Id determinístico do card nascido de um lance de partida.
 *
 * O `ply` é sempre o ÚLTIMO segmento, e é isso — não o escape — que torna o par
 * (partida, ply) recuperável mesmo quando o `gameId` contém `:`.
 *
 * `encodeURIComponent` está aqui por outro motivo: este id vira chave de
 * armazenamento e trecho de URL, e `gameId` chega de PGN importado, onde espaço,
 * barra e acento são normais.
 */
export function idDoCardDeErro(gameId: string, ply: number): string {
  return `${PREFIXO_ID_ERRO}:${encodeURIComponent(gameId)}:${ply}`
}

// --------------------------------------------------------------------- prompt

/**
 * Pergunta do card. Nunca cita o melhor lance: o card é recuperação, não leitura.
 */
const PROMPT_BASE = 'Nesta posição da sua partida havia um lance melhor. Encontre-o.'

/**
 * Monta o texto do card.
 *
 * Tom do PEDAGOGY: analítico, calmo, direto, sem humilhar. O acréscimo é o
 * hábito de pensamento da explicação — é dica de categoria (nível 1 da escala
 * de dicas), não o lance.
 */
export function promptDoMomento(momento: CriticalMoment): string {
  const habito = momento.explanation?.habitoQuePreveniria.trim() ?? ''
  return habito === '' ? PROMPT_BASE : `${PROMPT_BASE} ${habito}`
}

// -------------------------------------------------------------------- conversão

export interface MomentoParaCardOptions {
  /** Relógio injetado: nasce vencido para o primeiro contato ser na mesma sessão. */
  agora: Date
  /** Texto próprio, quando quem chama tem contexto melhor que o padrão. */
  prompt?: string
}

/**
 * Converte um momento crítico em card de revisão.
 *
 * Recusa em voz alta o que não pode virar card. Card silenciosamente vazio —
 * sem solução ou sem padrão nomeado — só apareceria como defeito semanas depois,
 * dentro da fila de revisão do aluno.
 */
export function momentoParaReviewCard(
  momento: CriticalMoment,
  options: MomentoParaCardOptions,
): ReviewCard {
  if (!temPadraoNomeado(momento)) {
    throw new Error(
      `Momento ${momento.gameId}#${momento.ply} não tem padrão nomeado: ` +
        'um erro sem motivo identificado não vira treino.',
    )
  }
  if (momento.bestMoveUci.trim() === '') {
    throw new Error(`Momento ${momento.gameId}#${momento.ply} não tem melhor lance para treinar.`)
  }

  const prompt = options.prompt === undefined ? promptDoMomento(momento) : options.prompt.trim()
  if (prompt === '') {
    throw new Error(`Momento ${momento.gameId}#${momento.ply} ficaria com um prompt vazio.`)
  }

  return createReviewCard(
    {
      id: idDoCardDeErro(momento.gameId, momento.ply),
      kind: 'erro-de-partida',
      skillIds: momento.skillIds,
      fen: momento.fenBefore,
      solutionUci: [momento.bestMoveUci],
      prompt,
      sourceGameId: momento.gameId,
      sourcePly: momento.ply,
    },
    options.agora,
  )
}

/**
 * Funde o card recém-convertido com o que já está na fila, se houver.
 *
 * O id determinístico faz a reanálise ATUALIZAR o card em vez de duplicar — mas
 * salvar o card recém-criado por cima apagaria o progresso do FSRS em SILÊNCIO:
 * `createReviewCard` nasce novo e vencido, então o aluno voltaria à estaca zero
 * naquele erro sem nada aparecer na tela ou no console.
 *
 * Aqui o conteúdo (posição, solução, texto, habilidades) vem do card novo — a
 * reanálise pode ter melhorado a explicação ou o melhor lance — e o ESTADO de
 * agendamento vem do card antigo.
 *
 * Quem persiste tem de passar por aqui. Este módulo não conhece repositório.
 */
export function preservarProgresso(
  novo: ReviewCard,
  existente: ReviewCard | null | undefined,
): ReviewCard {
  if (!existente || existente.id !== novo.id) return novo
  return {
    ...novo,
    createdAt: existente.createdAt,
    dueAt: existente.dueAt,
    scheduler: existente.scheduler,
  }
}

// --------------------------------------------------------------------- seleção

/** Comparação sem `localeCompare`: a ordem não pode depender do locale da máquina. */
function compararTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Mais grave primeiro; empate cai na perda, depois no ply, depois na partida.
 *
 * A cadeia de desempate é total de propósito: sem o último critério, dois
 * momentos idênticos em severidade, perda e ply ficariam na ordem de chegada e
 * o resultado mudaria conforme a ordem da entrada.
 */
function compararGravidade(a: CriticalMoment, b: CriticalMoment): number {
  return (
    severityRank(b.severity) - severityRank(a.severity) ||
    b.expectedScoreLossPp - a.expectedScoreLossPp ||
    a.ply - b.ply ||
    compararTexto(a.gameId, b.gameId)
  )
}

/**
 * Escolhe os momentos que merecem virar card.
 *
 * Nem todo momento vira treino: filtra por padrão nomeado e por severidade, e
 * respeita os dois tetos (por partida e por lote). Puro e determinístico —
 * a mesma entrada em qualquer ordem produz a mesma saída.
 */
export function selecionarParaTreino(
  momentos: readonly CriticalMoment[],
  config: ParaTreinoConfig = PARA_TREINO_CONFIG,
): CriticalMoment[] {
  const minimo = severityRank(config.severidadeMinima)

  const elegiveis = momentos
    .filter((momento) => temPadraoNomeado(momento) && severityRank(momento.severity) >= minimo)
    .sort(compararGravidade)

  const escolhidos: CriticalMoment[] = []
  const usadosPorPartida = new Map<string, number>()

  for (const momento of elegiveis) {
    if (escolhidos.length >= config.maxCardsPorLote) break
    const usados = usadosPorPartida.get(momento.gameId) ?? 0
    if (usados >= config.maxCardsPorPartida) continue
    usadosPorPartida.set(momento.gameId, usados + 1)
    escolhidos.push(momento)
  }

  return escolhidos
}

// ------------------------------------------------------------------ prioridade

export interface PrioridadesOptions {
  /** Relógio injetado. Usado como data do erro quando `ocorridoEm` não vem. */
  agora: Date
  /**
   * Quando o erro aconteceu de fato.
   *
   * `CriticalMoment` não carrega a data da partida, e a janela de "erro
   * recente" do planner é medida em dias. Analisar hoje uma partida de três
   * semanas atrás e registrar como se fosse de hoje inflaria a prioridade
   * daquela habilidade — por isso quem conhece a `Game.playedAt` passa por aqui.
   */
  ocorridoEm?: Date
}

/**
 * Sinais de erro em partida real, no formato que o planner consome.
 *
 * Uma entrada por habilidade de cada momento: o planner conta OCORRÊNCIAS, então
 * agrupar aqui apagaria a informação de quantas vezes a habilidade falhou.
 *
 * Momento sem padrão nomeado chega aqui com `skillIds` vazio (é o que
 * `explain.ts` produz para `unknown`) e naturalmente não contribui — não há
 * filtro extra porque não há regra extra: a atribuição de habilidade já é a
 * decisão de quem explicou.
 */
export function prioridadesDeHabilidade(
  momentos: readonly CriticalMoment[],
  options: PrioridadesOptions,
): RecentGameError[] {
  const quando = (options.ocorridoEm ?? options.agora).toISOString()

  const erros: RecentGameError[] = []
  for (const momento of momentos) {
    for (const skillId of momento.skillIds) {
      erros.push({ skillId, severity: momento.severity, ocorridoEm: quando })
    }
  }
  return erros
}
