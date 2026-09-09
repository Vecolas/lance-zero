/**
 * Porta de persistência do perfil.
 *
 * A camada de acesso (`profile-dal.ts`) fala com esta interface, não com o
 * Supabase. Três motivos, nessa ordem de importância:
 *
 * 1. as regras de autorização podem ser testadas sem banco vivo — hoje não
 *    existe projeto Supabase provisionado, e mesmo quando existir, teste de
 *    autorização não deveria depender de rede;
 * 2. o único arquivo que conhece chave e URL é o adaptador, e ele carrega
 *    `server-only`;
 * 3. as colunas lidas ficam explícitas no adaptador (seção 24), em vez de
 *    espalhadas por Server Components.
 *
 * As assinaturas recebem `userId` porque é uma camada interna: quem chama é a
 * DAL, que já extraiu a identidade da sessão. Nenhuma função pública do
 * servidor aceita `userId` vindo do navegador (seção 27).
 */

import type { ProfileRow, PublicProfileRow, UserSettingsRow } from '@/server/tables'

export type { PublicProfileRow }

/**
 * Resultado de uma operação de banco. Erro é VALOR, não exceção, para o
 * chamador ser obrigado a decidir o que fazer — e para a mensagem crua do
 * driver nunca subir sozinha até a resposta HTTP.
 */
export type StoreOutcome<T> = { ok: true; data: T } | { ok: false; error: string }

export function storeOk<T>(data: T): StoreOutcome<T> {
  return { ok: true, data }
}

export function storeFailure<T>(error: string): StoreOutcome<T> {
  return { ok: false, error }
}

/**
 * Campos gravaveis de `profiles`. A lista é fechada: `user_id`,
 * `profile_visibility`, `id` e timestamps de criação não estão aqui, então
 * nenhum caminho de escrita comum consegue tocá-los (seção 69).
 */
export interface ProfilePatch {
  username?: string
  display_name?: string
  rating_estimate?: number | null
  rating_source?: string
}

/** Campos gravaveis de `user_settings`. Mesma lógica de lista fechada. */
export interface UserSettingsPatch {
  language?: string
  theme?: string
  board_theme?: string
  piece_theme?: string
  timezone?: string
  training_reminders?: boolean
  analytics_opt_in?: boolean
}

export interface ProfileStore {
  findProfileByUserId(userId: string): Promise<StoreOutcome<ProfileRow | null>>
  updateProfileByUserId(
    userId: string,
    patch: ProfilePatch,
  ): Promise<StoreOutcome<ProfileRow | null>>
  /** Só perfis marcados como públicos. O filtro é do SQL, não do JavaScript. */
  findPublicProfileByUsername(username: string): Promise<StoreOutcome<PublicProfileRow | null>>
  findSettingsByUserId(userId: string): Promise<StoreOutcome<UserSettingsRow | null>>
  updateSettingsByUserId(
    userId: string,
    patch: UserSettingsPatch,
  ): Promise<StoreOutcome<UserSettingsRow | null>>
}
