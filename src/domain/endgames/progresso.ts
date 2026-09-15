import type { EndgameStatus } from './catalogo'

export interface EndgameSkillState {
  endgameId: string
  recognition: number
  principleSelection: number
  calculation: number
  conversion: number
  defense: number
  hintDependence: number
  lastPracticedAt: string | null
}

export function estadoInicialDeFinal(endgameId: string): EndgameSkillState {
  return { endgameId, recognition: 0, principleSelection: 0, calculation: 0, conversion: 0, defense: 0, hintDependence: 0, lastPracticedAt: null }
}

export function statusDoFinal(state: EndgameSkillState): EndgameStatus {
  const values = [state.recognition, state.principleSelection, state.calculation, state.conversion, state.defense]
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  if (average >= 0.85) return 'consolidated'
  if (state.hintDependence >= 0.6 || average < 0.25) return state.lastPracticedAt === null ? 'not-started' : 'review'
  if (average < 0.55) return 'learning'
  return 'practicing'
}

export function atualizarProgresso(state: EndgameSkillState, patch: Partial<Omit<EndgameSkillState, 'endgameId'>>): EndgameSkillState {
  return { ...state, ...patch, lastPracticedAt: patch.lastPracticedAt ?? new Date().toISOString() }
}
