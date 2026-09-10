/**
 * A primeira semana de treino, montada logo depois do diagnóstico.
 *
 * DECISÃO CENTRAL: **não existe um segundo planner aqui.** Cada dia sai de
 * `buildDailyPlan`, o mesmo que monta o "Treino de hoje" todo dia depois. Um
 * planner só para a primeira semana teria de repetir a ordem de prioridade, as
 * fatias por área e a repartição de minutos — e as duas cópias divergiriam
 * exatamente onde ninguém olha: o aluno veria uma semana montada com uma regra
 * e, no oitavo dia, outra.
 *
 * O que este módulo acrescenta é só o EIXO DO TEMPO: sete datas, uma seed
 * estável por dia, e a mesma estimativa inicial em todos. Nada mais.
 *
 * PONTO CEGO DECLARADO: os sete dias são gerados com o MESMO estado de
 * maestria, o do fim do diagnóstico. Eles não sabem o que o aluno vai acertar
 * na terça. A semana é um COMPROMISSO, não uma previsão — e o dia de amanhã é
 * recalculado de verdade quando amanhã chegar, com o que aconteceu hoje. Quem
 * ler `PrimeiraSemana` como profecia vai se decepcionar; por isso está escrito.
 *
 * Relógio por parâmetro, sempre: `inicio` entra, `Date.now` não é chamado.
 */

import { buildDailyPlan, type PlannerContext } from '@/domain/planning/planner'
import type { DailyPlan, SkillMastery, UserProfile } from '@/domain/types'

/**
 * Números da primeira semana.
 *
 * `dias` é HEURÍSTICA DE PRODUTO: sete é o horizonte que a issue #11 promete
 * ("uma primeira semana"), não um achado sobre aprendizagem.
 */
export const PRIMEIRA_SEMANA_CONFIG = {
  dias: 7,
} as const

export type PrimeiraSemanaConfig = Record<keyof typeof PRIMEIRA_SEMANA_CONFIG, number>

const MS_POR_DIA = 86_400_000

export interface DiaDaPrimeiraSemana {
  /** Data no formato `AAAA-MM-DD`, em UTC. */
  data: string
  plano: DailyPlan
}

export interface PrimeiraSemana {
  dias: readonly DiaDaPrimeiraSemana[]
  /** Soma dos minutos planejados na semana. Derivado, nunca gravado. */
  totalMinutes: number
}

export interface EntradaDaPrimeiraSemana {
  profile: UserProfile
  mastery: readonly SkillMastery[]
  /** Primeiro dia da semana. O relógio entra por aqui e só por aqui. */
  inicio: Date
}

/**
 * Sete planos diários a partir de `inicio`.
 *
 * A seed de cada dia é `id do perfil + data`: dois alunos diferentes não
 * recebem a mesma semana, e a mesma pessoa recebe a mesma semana toda vez que a
 * tela recarregar. Nada de `Math.random`.
 */
export function montarPrimeiraSemana(
  entrada: EntradaDaPrimeiraSemana,
  config: PrimeiraSemanaConfig = PRIMEIRA_SEMANA_CONFIG,
): PrimeiraSemana {
  const dias: DiaDaPrimeiraSemana[] = []
  const partida = Date.UTC(
    entrada.inicio.getUTCFullYear(),
    entrada.inicio.getUTCMonth(),
    entrada.inicio.getUTCDate(),
  )

  for (let i = 0; i < config.dias; i += 1) {
    const now = new Date(partida + i * MS_POR_DIA)
    const data = now.toISOString().slice(0, 10)
    const contexto: PlannerContext = {
      profile: entrada.profile,
      mastery: [...entrada.mastery],
      // Quem acabou de chegar não tem revisão vencida, erro de partida nem
      // repertório. Passar listas vazias é a verdade, não um atalho.
      dueCards: [],
      recentGameErrors: [],
      now,
    }
    dias.push({ data, plano: buildDailyPlan(contexto, `${entrada.profile.id}|${data}`) })
  }

  return {
    dias,
    totalMinutes: dias.reduce((soma, dia) => soma + dia.plano.totalMinutes, 0),
  }
}
