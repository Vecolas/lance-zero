import type { CriticalMoment, MoveSeverity } from '@/domain/types'

/**
 * Cruza o que o jogador marcou no passe humano com o que a engine encontrou.
 *
 * É aqui que a revisão deixa de ser "a engine te diz o que fazer" e vira
 * ensino: o valor não está na lista de erros, está em descobrir **onde a sua
 * leitura da partida bateu e onde não bateu**. Perceber que você sentiu que
 * algo mudou no lance 23 e a engine concordou vale mais do que receber trinta
 * avaliações prontas.
 *
 * Puro: sem engine, sem rede, sem relógio.
 */

export interface ReviewComparison {
  /** Você marcou e a engine confirmou. O olho está calibrado aqui. */
  confirmados: CriticalMoment[]
  /** A engine achou e você não marcou. É onde mora o treino. */
  despercebidos: CriticalMoment[]
  /**
   * Você marcou e a engine não viu problema.
   *
   * Não é erro seu: pode ser um momento de tensão que a engine resolve e um
   * humano não. Por isso o rótulo é neutro.
   */
  semConfirmacao: number[]
  /** Quantos dos momentos críticos você tinha percebido, de 0 a 1. */
  taxaDePercepcao: number
}

/** Distância em plies para considerar que a marcação e o achado são o mesmo momento. */
export const TOLERANCIA_DE_PLY = 1

function perto(a: number, b: number, tolerancia: number): boolean {
  return Math.abs(a - b) <= tolerancia
}

export function compareHumanAndEngine(
  markedPlies: readonly number[],
  momentos: readonly CriticalMoment[],
  tolerancia: number = TOLERANCIA_DE_PLY,
): ReviewComparison {
  const confirmados: CriticalMoment[] = []
  const despercebidos: CriticalMoment[] = []

  for (const momento of momentos) {
    const viu = markedPlies.some((ply) => perto(ply, momento.ply, tolerancia))
    if (viu) confirmados.push(momento)
    else despercebidos.push(momento)
  }

  const semConfirmacao = markedPlies
    .filter((ply) => !momentos.some((m) => perto(ply, m.ply, tolerancia)))
    .sort((a, b) => a - b)

  return {
    confirmados,
    despercebidos,
    semConfirmacao,
    taxaDePercepcao: momentos.length === 0 ? 1 : confirmados.length / momentos.length,
  }
}

const ORDEM: Record<MoveSeverity, number> = {
  'erro-grave': 0,
  erro: 1,
  imprecisao: 2,
  ok: 3,
}

/** Do mais grave para o menos grave; empate desempatado pelo ply. */
export function porGravidade(a: CriticalMoment, b: CriticalMoment): number {
  return ORDEM[a.severity] - ORDEM[b.severity] || a.ply - b.ply
}

export const SEVERITY_LABEL: Record<MoveSeverity, string> = {
  ok: 'Aceitável',
  imprecisao: 'Imprecisão',
  erro: 'Erro',
  'erro-grave': 'Erro grave',
}

/**
 * Frase honesta sobre a leitura do jogador.
 *
 * Sem elogio vazio e sem punição: o tom do PEDAGOGY.md é explicar sem humilhar.
 */
export function describeComparison(comparacao: ReviewComparison): string {
  const { confirmados, despercebidos } = comparacao
  const total = confirmados.length + despercebidos.length

  if (total === 0) {
    return 'A engine não encontrou nenhum momento grave nesta partida.'
  }
  if (despercebidos.length === 0) {
    return `Você marcou todos os ${total} momentos que a engine considerou críticos.`
  }
  if (confirmados.length === 0) {
    return `A engine encontrou ${total} ${total === 1 ? 'momento crítico' : 'momentos críticos'} que você não tinha marcado. É exatamente aí que está o treino.`
  }
  return `Você percebeu ${confirmados.length} de ${total} momentos críticos. Os outros ${despercebidos.length} passaram batido — e é neles que vale trabalhar.`
}
