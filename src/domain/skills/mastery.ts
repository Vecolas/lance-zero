/**
 * Modelo de domínio de maestria por habilidade.
 *
 * Puro: recebe o estado atual e um evento, devolve um estado novo. Nenhuma
 * dependência de React, DOM ou persistência.
 */

import type { SkillId, SkillMastery } from '@/domain/types'

/** Origem do evento que atualiza a maestria. */
export type MasteryEventKind = 'puzzle' | 'revisao' | 'partida'

export interface MasteryEvent {
  tipo: MasteryEventKind
  acertou: boolean
  usouDica: boolean
  primeiraTentativa: boolean
  thinkTimeMs: number
  /** ISO 8601. Quando ausente, `lastSeenAt` não é alterado. */
  ocorridoEm?: string
}

/**
 * Pesos do modelo de maestria.
 *
 * ATENÇÃO: todos os números abaixo são HEURÍSTICAS DE PRODUTO, escolhidas para
 * o comportamento inicial parecer razoável a ~1100. Nenhum deles é derivado de
 * dados nem tem validação empírica. Devem ser recalibrados assim que houver
 * telemetria real de tentativas e partidas.
 */
export const MASTERY_CONFIG = {
  /** Peso da amostra nova na média móvel de acerto recente. */
  alphaRecente: 0.3,
  /** Peso da amostra nova na média móvel de retenção (eventos de revisão). */
  alphaRetencao: 0.35,
  /** Quanto uma dica reduz o crédito da amostra daquele acerto. */
  penalidadeDicaNaAmostra: 0.4,
  /** Quanto acertar fora da primeira tentativa reduz o crédito da amostra. */
  penalidadeSegundaTentativa: 0.25,
  /** Redução máxima da maestria quando o usuário depende sempre de dica. */
  penalidadeDicaAcumulada: 0.25,
  /** Composição da maestria: acerto recente. */
  pesoRecente: 0.55,
  /** Composição da maestria: retenção em revisões espaçadas. */
  pesoRetencao: 0.2,
  /** Composição da maestria: desempenho em partida real. */
  pesoPartida: 0.25,
  /** Tentativas necessárias para a confiança chegar a 0,5. */
  meiaVidaConfiancaTentativas: 8,
  /** Ocorrências em partida real para o termo de confiança chegar a 0,5. */
  meiaVidaConfiancaPartidas: 3,
  /** Composição da confiança: volume de tentativas. */
  pesoConfiancaTentativas: 0.8,
  /** Composição da confiança: evidência vinda de partidas reais. */
  pesoConfiancaPartidas: 0.2,
  /** Passo do estimador incremental de mediana de tempo de reflexão, em ms. */
  passoMedianaMs: 400,
} as const

export type MasteryConfig = typeof MASTERY_CONFIG

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/** Estado inicial: nenhuma evidência, maestria e confiança zeradas. */
export function createMastery(skillId: SkillId): SkillMastery {
  return {
    skillId,
    exposures: 0,
    attempts: 0,
    firstTryCorrect: 0,
    recentAccuracy: 0,
    retentionAccuracy: 0,
    hintedAttempts: 0,
    medianThinkTimeMs: 0,
    realGameOccurrences: 0,
    realGameErrors: 0,
    mastery: 0,
    confidence: 0,
    lastSeenAt: null,
  }
}

/**
 * Crédito da tentativa, de 0 a 1.
 *
 * Errar vale 0. Acertar de primeira e sem dica vale 1. Dica e tentativas
 * extras descontam do crédito — o usuário resolveu, mas com apoio.
 */
function creditoDaAmostra(evento: MasteryEvent, config: MasteryConfig): number {
  if (!evento.acertou) return 0
  let credito = 1
  if (!evento.primeiraTentativa) credito *= 1 - config.penalidadeSegundaTentativa
  if (evento.usouDica) credito *= 1 - config.penalidadeDicaNaAmostra
  return clamp01(credito)
}

/**
 * Estimador incremental de mediana (Frugal-1U): sem histórico armazenado, o
 * valor caminha em passos fixos na direção da amostra. É aproximado por
 * construção — serve para tendência, não para estatística fina.
 */
function proximaMediana(atual: number, amostraMs: number, config: MasteryConfig): number {
  if (atual <= 0) return Math.max(0, amostraMs)
  if (amostraMs > atual) return atual + config.passoMedianaMs
  if (amostraMs < atual) return Math.max(0, atual - config.passoMedianaMs)
  return atual
}

/**
 * Combina os sinais em uma maestria 0..1.
 *
 * Sem dado de retenção (nenhuma revisão registrada) ou sem dado de partida
 * real, o componente correspondente cai de volta para o acerto recente em vez
 * de punir o usuário por algo que ele ainda não teve chance de fazer.
 */
function calcularMastery(estado: SkillMastery, config: MasteryConfig): number {
  const recente = clamp01(estado.recentAccuracy)
  const retencao = estado.retentionAccuracy > 0 ? clamp01(estado.retentionAccuracy) : recente
  const partida =
    estado.realGameOccurrences > 0
      ? clamp01(1 - estado.realGameErrors / estado.realGameOccurrences)
      : recente

  const base =
    config.pesoRecente * recente + config.pesoRetencao * retencao + config.pesoPartida * partida

  const taxaDeDica = estado.attempts > 0 ? estado.hintedAttempts / estado.attempts : 0
  const penalidade = 1 - config.penalidadeDicaAcumulada * clamp01(taxaDeDica)

  // O tempo de reflexão é registrado, mas deliberadamente não entra na
  // maestria: não temos calibração para dizer que rápido é melhor.
  return clamp01(base * penalidade)
}

/** Confiança cresce com o volume de evidência, nunca com o resultado dela. */
function calcularConfianca(estado: SkillMastery, config: MasteryConfig): number {
  const porTentativas = estado.attempts / (estado.attempts + config.meiaVidaConfiancaTentativas)
  const porPartidas =
    estado.realGameOccurrences / (estado.realGameOccurrences + config.meiaVidaConfiancaPartidas)

  return clamp01(
    config.pesoConfiancaTentativas * porTentativas + config.pesoConfiancaPartidas * porPartidas,
  )
}

/**
 * Aplica um evento de treino ou de partida sobre a maestria atual.
 * Não muta `current`.
 */
export function updateMastery(
  current: SkillMastery,
  evento: MasteryEvent,
  config: MasteryConfig = MASTERY_CONFIG,
): SkillMastery {
  const credito = creditoDaAmostra(evento, config)
  const attempts = current.attempts + 1

  const recentAccuracy = clamp01(
    current.recentAccuracy + config.alphaRecente * (credito - current.recentAccuracy),
  )

  const retentionAccuracy =
    evento.tipo === 'revisao'
      ? clamp01(
          current.retentionAccuracy + config.alphaRetencao * (credito - current.retentionAccuracy),
        )
      : current.retentionAccuracy

  const ehPartida = evento.tipo === 'partida'

  const proximo: SkillMastery = {
    ...current,
    exposures: current.exposures + 1,
    attempts,
    firstTryCorrect:
      current.firstTryCorrect +
      (evento.acertou && evento.primeiraTentativa && !evento.usouDica ? 1 : 0),
    recentAccuracy,
    retentionAccuracy,
    hintedAttempts: current.hintedAttempts + (evento.usouDica ? 1 : 0),
    medianThinkTimeMs:
      attempts === 1
        ? Math.max(0, evento.thinkTimeMs)
        : proximaMediana(current.medianThinkTimeMs, evento.thinkTimeMs, config),
    realGameOccurrences: current.realGameOccurrences + (ehPartida ? 1 : 0),
    realGameErrors: current.realGameErrors + (ehPartida && !evento.acertou ? 1 : 0),
    mastery: current.mastery,
    confidence: current.confidence,
    lastSeenAt: evento.ocorridoEm ?? current.lastSeenAt,
  }

  proximo.mastery = calcularMastery(proximo, config)
  proximo.confidence = calcularConfianca(proximo, config)

  return proximo
}
