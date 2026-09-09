/**
 * Seleção de momentos críticos de uma partida.
 *
 * A revisão acontece em duas passadas. A varredura rasa passa por todos os
 * lances com orçamento pequeno e só aponta ONDE vale gastar análise profunda;
 * a seleção final decide o que o usuário efetivamente vê.
 *
 * O limite superior é regra de produto: uma partida típica destaca poucos
 * momentos acionáveis. Marcar trinta lances não é revisão, é ruído.
 *
 * Tudo aqui é puro e determinístico: mesma entrada, mesma saída, sem relógio e
 * sem aleatoriedade.
 */

import type {
  CriticalMoment,
  MistakeExplanation,
  MoveSeverity,
  PositionAnalysis,
} from '@/domain/types'
import { positionStatus, type PieceColor } from '@/lib/chess'
import { severityRank } from './severity'

/**
 * Limiares da seleção.
 *
 * ATENÇÃO: HEURÍSTICAS DE PRODUTO, não constantes científicas. A faixa de 3 a 8
 * momentos vem do CLAUDE.md e existe para a revisão continuar legível; deve ser
 * recalibrada quando houver dados sobre quantos momentos o usuário realmente
 * consegue estudar numa sessão.
 */
export interface CriticalConfig {
  /** Salto mínimo, em pontos percentuais, para a varredura rasa marcar candidato. */
  limiarCandidatoPp: number
  /** Teto de posições que vão para a análise profunda. */
  maxCandidatos: number
  /** Faixa alvo de momentos destacados por partida. */
  minMomentos: number
  maxMomentos: number
  /** Severidade mínima para um lance virar momento crítico. */
  severidadeMinima: MoveSeverity
  /**
   * Completar até `minMomentos` com lances logo abaixo da banda de imprecisão.
   * Desligado por padrão: uma partida limpa deve poder ter zero momentos, e
   * inventar erro para preencher cota é exatamente o que não queremos.
   */
  completarAteMinimo: boolean
  /** Perda mínima aceita ao completar até `minMomentos`. */
  limiarRelaxadoPp: number
}

export const CRITICAL_CONFIG: CriticalConfig = {
  limiarCandidatoPp: 5,
  maxCandidatos: 12,
  minMomentos: 3,
  maxMomentos: 8,
  severidadeMinima: 'imprecisao',
  completarAteMinimo: false,
  limiarRelaxadoPp: 2,
}

/** Resultado da varredura rasa de um lance. */
export interface ShallowScan {
  ply: number
  fenBefore: string
  moveUci: string
  /** Pontuação esperada do lado que joga, 0..1, antes do lance. */
  expectedScoreBefore: number
  /** Pontuação esperada do MESMO lado, 0..1, depois do lance. */
  expectedScoreAfter: number
  /** `true` quando o lance é do usuário. */
  isUserMove: boolean
}

export interface CandidatePosition extends ShallowScan {
  /** Queda de pontuação esperada, em pontos percentuais. */
  dropPp: number
}

/**
 * Escolhe as posições que merecem análise profunda.
 *
 * Só olha lances do usuário e só marca salto de avaliação — passar a engine
 * fundo em todo lance é caro e não melhora a revisão.
 */
export function selectCandidatePositions(
  scans: readonly ShallowScan[],
  config: CriticalConfig = CRITICAL_CONFIG,
): CandidatePosition[] {
  return scans
    .filter((scan) => scan.isUserMove)
    .map((scan) => ({
      ...scan,
      dropPp: Math.max(0, (scan.expectedScoreBefore - scan.expectedScoreAfter) * 100),
    }))
    .filter((candidato) => candidato.dropPp >= config.limiarCandidatoPp)
    .sort(porPerda((candidato) => candidato.dropPp))
    .slice(0, config.maxCandidatos)
}

/** Maior perda primeiro; empate desempata pelo ply menor. Sempre determinístico. */
function porPerda<T extends { ply: number }>(perda: (item: T) => number) {
  return (a: T, b: T): number => perda(b) - perda(a) || a.ply - b.ply
}

const PERDA_DA_ANALISE = porPerda<PositionAnalysis>((analise) => analise.expectedScoreLossPp)

export interface CriticalMomentsOptions {
  /** Cor do usuário na partida: só os erros dele viram momento. */
  userColor: PieceColor
  /**
   * Quando a PARTIDA foi jogada, em ISO 8601 — não quando foi analisada.
   *
   * Obrigatório: o planner usa isso para decidir se o erro é recente, e uma
   * data errada aqui vira plano do dia errado sem ninguém ligar à causa.
   */
  playedAt: string
  /** Explicações já calculadas, indexadas por ply. */
  explanations?: Readonly<Record<number, MistakeExplanation | null>>
  config?: CriticalConfig
}

/** Quem estava a jogar na posição, lido pelo adapter de xadrez. */
function ladoQueJoga(fen: string): PieceColor | null {
  try {
    return positionStatus(fen).turn
  } catch {
    return null
  }
}

/**
 * Momentos críticos da partida, do mais custoso para o menos custoso.
 *
 * Nunca devolve mais que `config.maxMomentos`. O desempate é determinístico:
 * maior perda primeiro, depois ply menor.
 */
export function selectCriticalMoments(
  analyses: readonly PositionAnalysis[],
  options: CriticalMomentsOptions,
): CriticalMoment[] {
  const config = options.config ?? CRITICAL_CONFIG
  const minimo = severityRank(config.severidadeMinima)

  const doUsuario = analyses.filter(
    (analise) => ladoQueJoga(analise.fenBefore) === options.userColor,
  )

  const selecionados = doUsuario
    .filter((analise) => severityRank(analise.severity) >= minimo)
    .sort(PERDA_DA_ANALISE)

  const escolhidos = selecionados.slice(0, config.maxMomentos)

  if (config.completarAteMinimo && escolhidos.length < config.minMomentos) {
    const jaEscolhidos = new Set(escolhidos.map((analise) => analise.ply))
    const reservas = doUsuario
      .filter((analise) => !jaEscolhidos.has(analise.ply))
      .filter((analise) => analise.expectedScoreLossPp >= config.limiarRelaxadoPp)
      .sort(PERDA_DA_ANALISE)
      .slice(0, config.minMomentos - escolhidos.length)
    escolhidos.push(...reservas)
    escolhidos.sort(PERDA_DA_ANALISE)
  }

  return escolhidos.map((analise) =>
    toCriticalMoment(analise, options.explanations?.[analise.ply] ?? null, options.playedAt),
  )
}

function toCriticalMoment(
  analise: PositionAnalysis,
  explanation: MistakeExplanation | null,
  playedAt: string,
): CriticalMoment {
  return {
    gameId: analise.gameId,
    ocorridoEm: playedAt,
    ply: analise.ply,
    fenBefore: analise.fenBefore,
    userMoveUci: analise.userMoveUci,
    bestMoveUci: analise.bestMoveUci,
    expectedScoreLossPp: analise.expectedScoreLossPp,
    severity: analise.severity,
    skillIds: analise.skillIds,
    explanation,
  }
}

/** Mesma seleção, em ordem cronológica — é assim que a revisão apresenta. */
export function ordenarPorPly(momentos: readonly CriticalMoment[]): CriticalMoment[] {
  return [...momentos].sort((a, b) => a.ply - b.ply)
}
