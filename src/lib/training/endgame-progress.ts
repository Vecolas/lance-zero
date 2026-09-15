import { desserializarProgressoDeFinais, serializarProgressoDeFinais, type EndgameSkillState } from '@/domain/endgames'

export const ENDGAME_PROGRESS_STORAGE_KEY = 'lancezero:endgame-progress:v1'

export function carregarProgressoDeFinais(storage: Pick<Storage, 'getItem'> = window.localStorage): EndgameSkillState[] {
  try { return desserializarProgressoDeFinais(storage.getItem(ENDGAME_PROGRESS_STORAGE_KEY)) } catch { return [] }
}

export function salvarProgressoDeFinais(states: readonly EndgameSkillState[], storage: Pick<Storage, 'setItem'> = window.localStorage): void {
  storage.setItem(ENDGAME_PROGRESS_STORAGE_KEY, serializarProgressoDeFinais(states))
}

