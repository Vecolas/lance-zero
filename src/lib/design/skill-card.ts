/**
 * Leitura de um indicador de habilidade — seção 33 do guia.
 *
 * DECISÃO DE PRODUTO QUE ESTE ARQUIVO CARREGA: com amostra pequena o card NÃO
 * mostra percentual. Um "31%" calculado sobre duas tentativas é um número
 * verdadeiro sobre uma amostra que não sustenta nada, e o CLAUDE.md proíbe
 * falsa precisão. Abaixo do mínimo o card diz quantas tentativas faltam e a
 * barra fica declaradamente indeterminada — o que é honesto e também é
 * acionável, porque diz o que fazer para o número aparecer.
 *
 * As faixas são heurísticas de produto, não constantes: vieram do que parece
 * razoável para ~1100 e precisam ser recalibradas quando houver telemetria.
 */

export const SKILL_CARD_CONFIG = {
  /**
   * Heurística de produto: abaixo disto a amostra não sustenta um percentual.
   */
  minimoDeTentativas: 5,
  /** Heurística de produto: onde começa "firme". */
  faixaFirme: 0.75,
  /** Heurística de produto: onde começa "em treino". */
  faixaEmTreino: 0.45,
} as const

export type SkillStatus = 'firme' | 'em-treino' | 'prioridade' | 'sem-amostra'

export interface SkillStatusDescriptor {
  readonly status: SkillStatus
  readonly label: string
  readonly colorVar: string
  readonly icon: { readonly viewBox: string; readonly path: string }
}

export const skillStatusCatalog: Record<SkillStatus, SkillStatusDescriptor> = {
  firme: {
    status: 'firme',
    label: 'Firme',
    colorVar: 'var(--positive)',
    icon: { viewBox: '0 0 16 16', path: 'M14.2 8A6.2 6.2 0 1 1 1.8 8a6.2 6.2 0 0 1 12.4 0Z' },
  },
  'em-treino': {
    status: 'em-treino',
    label: 'Em treino',
    colorVar: 'var(--accent-readable)',
    icon: { viewBox: '0 0 16 16', path: 'M8 1.6 14.4 8 8 14.4 1.6 8Z' },
  },
  prioridade: {
    status: 'prioridade',
    label: 'Prioridade',
    colorVar: 'var(--warning)',
    icon: { viewBox: '0 0 16 16', path: 'M8 1.4 15.1 14.2H0.9Z' },
  },
  'sem-amostra': {
    status: 'sem-amostra',
    label: 'Sem amostra',
    colorVar: 'var(--text-muted)',
    icon: {
      viewBox: '0 0 16 16',
      path: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3Z',
    },
  },
}

export interface SkillReadingInput {
  /** Domínio 0..1 vindo do modelo de habilidade. */
  mastery: number
  /** Tentativas registradas. É o que decide se há número para mostrar. */
  attempts: number
}

export interface SkillReading {
  status: SkillStatus
  /** Inteiro 0..100, ou `null` quando a amostra não sustenta um número. */
  percentual: number | null
  /** Quanto da barra preencher, 0..1. `null` quando indeterminada. */
  fracao: number | null
  /** Frase que substitui o número, ou o explica. Nunca vazia. */
  nota: string
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor))
}

export function readSkill(input: SkillReadingInput, config = SKILL_CARD_CONFIG): SkillReading {
  if (input.attempts < config.minimoDeTentativas) {
    const faltam = config.minimoDeTentativas - Math.max(0, input.attempts)
    return {
      status: 'sem-amostra',
      percentual: null,
      fracao: null,
      nota:
        input.attempts <= 0
          ? `Sem tentativas ainda. ${config.minimoDeTentativas} para começar a medir.`
          : `${input.attempts} de ${config.minimoDeTentativas} tentativas. Faltam ${faltam} para o número significar alguma coisa.`,
    }
  }

  const mastery = limitar(input.mastery, 0, 1)
  const status: SkillStatus =
    mastery >= config.faixaFirme
      ? 'firme'
      : mastery >= config.faixaEmTreino
        ? 'em-treino'
        : 'prioridade'

  return {
    status,
    // Inteiro de propósito: casa decimal aqui seria precisão que o modelo de
    // habilidade não tem.
    percentual: Math.round(mastery * 100),
    fracao: mastery,
    nota: `${input.attempts} ${input.attempts === 1 ? 'tentativa' : 'tentativas'} registradas.`,
  }
}
