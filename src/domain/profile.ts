import type { UserProfile } from './types'

/**
 * Perfil padrão de quem chega sem conta e sem diagnóstico.
 *
 * O rating inicial é o do público-alvo do currículo (~1100). O diagnóstico da
 * Fase 10 substitui esse chute; até lá, ele existe só para o planner ter de
 * onde partir.
 */
export const DEFAULT_ESTIMATED_RATING = 1100

export const BUDGET_OPTIONS = [20, 40, 60] as const

export type BudgetMinutes = (typeof BUDGET_OPTIONS)[number]

export function createDefaultProfile(id: string, now: Date): UserProfile {
  return {
    id,
    createdAt: now.toISOString(),
    estimatedRating: DEFAULT_ESTIMATED_RATING,
    dailyBudgetMinutes: 40,
    preferences: {
      boardTheme: 'claro',
      reducedMotion: false,
    },
  }
}

export function isBudgetMinutes(value: number): value is BudgetMinutes {
  return (BUDGET_OPTIONS as readonly number[]).includes(value)
}
