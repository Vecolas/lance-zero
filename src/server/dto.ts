/**
 * DTOs: a única forma de um dado do banco chegar ao navegador.
 *
 * Referências do plano: seção 24 (DTOs), 25 (perfil público),
 * 13 (dados proibidos), 127 (ocultar não é autorizar).
 *
 * A seção 127 é o motivo de este arquivo existir. Esconder o e-mail no JSX
 * (`{isOwner ? <Email/> : null}`) não protege nada: se o campo foi serializado
 * para o cliente, ele está no HTML e no payload, ao alcance de qualquer um que
 * abra o DevTools. O corte tem que acontecer ANTES, aqui.
 *
 * Por isso toda função abaixo CONSTRÓI um objeto novo, campo a campo. Nenhuma
 * usa spread da linha do banco: com spread, uma coluna nova e sensível passa a
 * vazar no dia em que for criada, sem ninguém alterar uma linha deste arquivo.
 */

import {
  isProfileVisibility,
  type ProfileRow,
  type ProfileVisibility,
  type PublicProfileRow,
  type UserSettingsRow,
} from '@/server/tables'

/** Perfil do próprio dono. Note a ausência de `id` e `user_id`. */
export interface ProfileDto {
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  ratingEstimate: number | null
  ratingSource: string | null
  profileVisibility: ProfileVisibility
  createdAt: string
  updatedAt: string
}

/**
 * Perfil visto por terceiros (seção 25). É um subconjunto estrito do DTO
 * privado: nenhum campo aqui deixa de existir lá. `tests/unit/security-dto`
 * verifica essa relação, para o público nunca ganhar um campo por acidente.
 */
export interface PublicProfileDto {
  username: string
  displayName: string | null
  avatarUrl: string | null
  ratingEstimate: number | null
}

export interface UserSettingsDto {
  language: string | null
  theme: string | null
  boardTheme: string | null
  pieceTheme: string | null
  timezone: string | null
  trainingReminders: boolean
  analyticsOptIn: boolean
}

/**
 * Visibilidade desconhecida vira `private`. Fail closed: coluna com valor
 * inesperado (migração no meio do caminho, dado antigo) não pode ser lida como
 * "público" — o default seguro é o mais restritivo.
 */
export function toProfileVisibility(value: unknown): ProfileVisibility {
  return isProfileVisibility(value) ? value : 'private'
}

/** Perfil próprio. Campos montados um a um; `user_id` e `id` ficam de fora. */
export function toProfileDto(row: ProfileRow): ProfileDto {
  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_path,
    ratingEstimate: row.rating_estimate,
    ratingSource: row.rating_source,
    profileVisibility: toProfileVisibility(row.profile_visibility),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Perfil público.
 *
 * Devolve `null` quando o perfil não é público ou não tem username: sem
 * username não existe URL pública (seção 126), e perfil privado simplesmente
 * não existe para terceiros. A checagem repete o filtro que a consulta e a RLS
 * já fazem — de propósito. Defesa em profundidade é redundância barata.
 */
export function toPublicProfileDto(row: PublicProfileRow): PublicProfileDto | null {
  if (toProfileVisibility(row.profile_visibility) !== 'public') return null
  if (row.username === null || row.username.length === 0) return null

  return {
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_path,
    ratingEstimate: row.rating_estimate,
  }
}

/** Preferências. `user_id` não sai daqui: o dono já sabe quem é. */
export function toUserSettingsDto(row: UserSettingsRow): UserSettingsDto {
  return {
    language: row.language,
    theme: row.theme,
    boardTheme: row.board_theme,
    pieceTheme: row.piece_theme,
    timezone: row.timezone,
    // Preferências opcionais: `null` no banco é tratado como desligado
    // (seção 78, privacy by default). Opt-in ausente nunca vira opt-in.
    trainingReminders: row.training_reminders === true,
    analyticsOptIn: row.analytics_opt_in === true,
  }
}
