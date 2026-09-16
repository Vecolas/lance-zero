import type { EndgameStatus } from './catalogo'
import type { EndgamePosition, EndgamePositionSet } from './catalogo'

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

export const ENDGAME_PROGRESS_VERSION = 1

export function serializarProgressoDeFinais(states: readonly EndgameSkillState[]): string {
  return JSON.stringify({ version: ENDGAME_PROGRESS_VERSION, states })
}

export function desserializarProgressoDeFinais(raw: string | null): EndgameSkillState[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { version?: number; states?: unknown }
    if (parsed.version !== ENDGAME_PROGRESS_VERSION || !Array.isArray(parsed.states)) return []
    return parsed.states.filter((state): state is EndgameSkillState => {
      if (!state || typeof state !== 'object') return false
      const item = state as Partial<EndgameSkillState>
      return (
        typeof item.endgameId === 'string' &&
        [
          item.recognition,
          item.principleSelection,
          item.calculation,
          item.conversion,
          item.defense,
          item.hintDependence,
        ].every((value) => typeof value === 'number' && value >= 0 && value <= 1)
      )
    })
  } catch {
    return []
  }
}

export function registrarResultadoDeFinais(
  state: EndgameSkillState,
  resultado: {
    recognized: boolean
    chosePrinciple: boolean
    calculated: boolean
    converted: boolean
    defended: boolean
    hints: number
    maxHints: number
  },
): EndgameSkillState {
  const sample = (old: number, good: boolean) => old * 0.7 + (good ? 1 : 0) * 0.3
  return atualizarProgresso(state, {
    recognition: sample(state.recognition, resultado.recognized),
    principleSelection: sample(state.principleSelection, resultado.chosePrinciple),
    calculation: sample(state.calculation, resultado.calculated),
    conversion: sample(state.conversion, resultado.converted),
    defense: sample(state.defense, resultado.defended),
    hintDependence: sample(state.hintDependence, resultado.maxHints > 0 && resultado.hints === 0),
  })
}

/** Seleção adaptativa determinística: primeiro a menor competência, depois a
 * dificuldade mais adequada e, por fim, o ID para não depender da ordem. */
export function selecionarPosicaoAdaptativa(
  set: EndgamePositionSet,
  state: EndgameSkillState,
): EndgamePosition | null {
  if (set.positions.length === 0) return null
  const weakest = Math.min(
    state.recognition,
    state.principleSelection,
    state.calculation,
    state.conversion,
    state.defense,
  )
  return (
    [...set.positions].sort(
      (a, b) =>
        Math.abs(a.difficulty - (weakest < 0.35 ? 1 : weakest < 0.7 ? 2 : 3)) -
          Math.abs(b.difficulty - (weakest < 0.35 ? 1 : weakest < 0.7 ? 2 : 3)) ||
        a.id.localeCompare(b.id),
    )[0] ?? null
  )
}

export function estadoInicialDeFinal(endgameId: string): EndgameSkillState {
  return {
    endgameId,
    recognition: 0,
    principleSelection: 0,
    calculation: 0,
    conversion: 0,
    defense: 0,
    hintDependence: 0,
    lastPracticedAt: null,
  }
}

export function statusDoFinal(state: EndgameSkillState): EndgameStatus {
  const values = [
    state.recognition,
    state.principleSelection,
    state.calculation,
    state.conversion,
    state.defense,
  ]
  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  if (average >= 0.85) return 'consolidated'
  if (state.hintDependence >= 0.6 || average < 0.25)
    return state.lastPracticedAt === null ? 'not-started' : 'review'
  if (average < 0.55) return 'learning'
  return 'practicing'
}

export function atualizarProgresso(
  state: EndgameSkillState,
  patch: Partial<Omit<EndgameSkillState, 'endgameId'>>,
): EndgameSkillState {
  return { ...state, ...patch, lastPracticedAt: patch.lastPracticedAt ?? new Date().toISOString() }
}
