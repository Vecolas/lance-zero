/**
 * Severidade de um lance.
 *
 * A pergunta que este arquivo responde é: quanto o lance jogado custou, em
 * pontuação esperada, comparado com o melhor lance? Nada aqui chama a engine —
 * as avaliações chegam prontas.
 *
 * Honestidade estatística: se em algum momento o WDL da engine for usado como
 * insumo, ele serve APENAS para comparar severidade entre lances. WDL do
 * Stockfish é calibrado por auto-jogo da engine e nunca é apresentado como
 * "sua chance humana de vitória".
 */

import type { MoveSeverity } from '@/domain/types'

/** Avaliação de uma posição, na perspectiva de quem joga nela. */
export interface EvalScore {
  /** Centipeões. `null` quando a linha é mate. */
  scoreCp: number | null
  /** Lances até o mate, positivo a favor de quem joga. `null` se não há mate. */
  mateIn: number | null
}

/**
 * Limiares e pesos da classificação de severidade.
 *
 * ATENÇÃO: são HEURÍSTICAS DE PRODUTO. As bandas em pontos percentuais vieram
 * do CLAUDE.md e foram escolhidas para parecerem razoáveis a ~1100; nenhuma
 * delas está empiricamente calibrada. Recalibrar assim que houver partidas
 * reais analisadas o bastante para olhar a distribuição.
 */
export const SEVERITY_CONFIG = {
  /**
   * Inclinação da logística que converte centipeões em pontuação esperada.
   * É a mesma constante do win% público do Lichess; tratamos como heurística,
   * não como verdade sobre partidas humanas.
   */
  logisticaK: 0.00368208,
  /** Acima disso a posição é tratada como decidida, para a curva não estourar. */
  tetoCp: 1500,
  /** Bandas de perda, em pontos percentuais de pontuação esperada. */
  bandas: {
    /** A partir daqui é imprecisão. Abaixo disso o lance é `ok`. */
    imprecisaoMinPp: 3,
    /** A partir daqui é erro. */
    erroMinPp: 8,
    /** ACIMA daqui é erro grave; exatamente 18 pp ainda é erro. */
    erroGraveAcimaPp: 18,
  },
  /**
   * Sobreposições: situações que sobem a severidade independentemente da banda.
   * Perder um mate forçado pode custar poucos pontos percentuais quando a
   * posição já estava ganha — e ainda assim é o erro mais instrutivo do jogo.
   */
  overrides: {
    /** Havia mate forçado e o lance jogado o descartou. */
    matePerdido: 'erro-grave' as MoveSeverity,
    /** O lance jogado entregou mate forçado ao adversário. */
    mateSofrido: 'erro-grave' as MoveSeverity,
    /** Centipeões de material entregue sem compensação para acionar o override. */
    materialLimpoCp: 300,
    materialLimpo: 'erro' as MoveSeverity,
  },
} as const

export type SeverityConfig = typeof SEVERITY_CONFIG

/** Contexto que pode elevar a severidade acima da banda de perda. */
export interface SeverityContext {
  /** Havia mate forçado a favor do usuário e o lance jogado o perdeu. */
  perdeuMateForcado?: boolean
  /** Depois do lance o adversário tem mate forçado. */
  entrouEmMateForcado?: boolean
  /** Material entregue sem compensação, em centipeões. */
  materialEntregueCp?: number
}

const ORDEM: readonly MoveSeverity[] = ['ok', 'imprecisao', 'erro', 'erro-grave']

/** A mais grave entre duas severidades. */
export function maxSeverity(a: MoveSeverity, b: MoveSeverity): MoveSeverity {
  return ORDEM.indexOf(a) >= ORDEM.indexOf(b) ? a : b
}

/** Ordem canônica: `ok` = 0, `erro-grave` = 3. */
export function severityRank(severity: MoveSeverity): number {
  return ORDEM.indexOf(severity)
}

function clamp(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo)
}

/**
 * Converte centipeões em pontuação esperada 0..1 por uma curva logística.
 *
 * `expectedScoreFromCp(0) === 0.5`; a curva é simétrica, então perder 100 cp de
 * uma posição igual custa mais pontuação esperada do que perder 100 cp de uma
 * posição já ganha. É esse achatamento nas pontas que queremos: é o que impede
 * de chamar de erro grave um lance que troca +900 por +700.
 */
export function expectedScoreFromCp(cp: number, config: SeverityConfig = SEVERITY_CONFIG): number {
  const limitado = clamp(cp, -config.tetoCp, config.tetoCp)
  return 1 / (1 + Math.exp(-config.logisticaK * limitado))
}

/** Pontuação esperada de uma avaliação completa, tratando mate como decidido. */
export function expectedScoreFromEval(
  score: EvalScore,
  config: SeverityConfig = SEVERITY_CONFIG,
): number {
  if (score.mateIn !== null) return score.mateIn > 0 ? 1 : 0
  if (score.scoreCp === null) return 0.5
  return expectedScoreFromCp(score.scoreCp, config)
}

/**
 * Perda do lance em pontos percentuais.
 *
 * `antes` é a avaliação da posição com o usuário a jogar; `depois` é a
 * avaliação da posição resultante, que a engine devolve na perspectiva do
 * ADVERSÁRIO. A inversão de perspectiva acontece aqui, num lugar só.
 */
export function moveLossPp(
  antes: EvalScore,
  depois: EvalScore,
  config: SeverityConfig = SEVERITY_CONFIG,
): number {
  const antesUsuario = expectedScoreFromEval(antes, config)
  const depoisUsuario = 1 - expectedScoreFromEval(depois, config)
  return Math.max(0, (antesUsuario - depoisUsuario) * 100)
}

/**
 * Classifica a perda em uma severidade.
 *
 * Bandas: abaixo de 3 pp é `ok`; de 3 a 8 pp é imprecisão; de 8 a 18 pp é
 * erro; acima de 18 pp é erro grave. Os overrides do contexto só sobem a
 * severidade, nunca descem.
 */
export function classifySeverity(
  perdaPp: number,
  contexto: SeverityContext = {},
  config: SeverityConfig = SEVERITY_CONFIG,
): MoveSeverity {
  const { bandas, overrides } = config

  let severidade: MoveSeverity = 'ok'
  if (perdaPp > bandas.erroGraveAcimaPp) severidade = 'erro-grave'
  else if (perdaPp >= bandas.erroMinPp) severidade = 'erro'
  else if (perdaPp >= bandas.imprecisaoMinPp) severidade = 'imprecisao'

  if (contexto.perdeuMateForcado) severidade = maxSeverity(severidade, overrides.matePerdido)
  if (contexto.entrouEmMateForcado) severidade = maxSeverity(severidade, overrides.mateSofrido)
  if ((contexto.materialEntregueCp ?? 0) >= overrides.materialLimpoCp) {
    severidade = maxSeverity(severidade, overrides.materialLimpo)
  }

  return severidade
}

/** Contexto de override derivado das avaliações antes e depois do lance. */
export function severityContextFromEvals(antes: EvalScore, depois: EvalScore): SeverityContext {
  // `depois` está na perspectiva do adversário: mate positivo lá é mate contra o usuário.
  const tinhaMate = antes.mateIn !== null && antes.mateIn > 0
  const mantemMate = depois.mateIn !== null && depois.mateIn < 0
  return {
    perdeuMateForcado: tinhaMate && !mantemMate,
    entrouEmMateForcado: depois.mateIn !== null && depois.mateIn > 0,
  }
}
