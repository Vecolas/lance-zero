import 'server-only'

/**
 * Implementação da porta `ProfileStore` sobre o Supabase.
 *
 * Referências do plano: seção 21 (clientes), 23 (DAL), 24 (nunca `select('*')`),
 * 25 (perfil público), 88 (erro genérico para fora).
 *
 * Este é o único arquivo que escreve consulta. Três coisas valem aqui:
 *
 * - as colunas vêm de `tables.ts` e passam por `toSelectList`, que barra `*` e
 *   coluna proibida (seção 13);
 * - a linha do banco é convertida por um mapeador que confere tipo campo a
 *   campo. O cliente sem tipos gerados devolve `any`; nada de `any` atravessa
 *   daqui para dentro do domínio;
 * - erro do banco vira VALOR (`StoreOutcome`), com o texto cru preservado para
 *   o log da DAL — que nunca o repassa ao navegador.
 *
 * Sem projeto Supabase provisionado, nada aqui foi executado contra um banco
 * real. O que está testado é a camada acima; este arquivo é o adaptador fino
 * que ainda precisa de uma passada com credencial.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  storeFailure,
  storeOk,
  type ProfilePatch,
  type ProfileStore,
  type StoreOutcome,
  type UserSettingsPatch,
} from '@/server/profile-store'
import {
  PROFILE_COLUMNS,
  PUBLIC_PROFILE_COLUMNS,
  toSelectList,
  USER_SETTINGS_COLUMNS,
  type ProfileRow,
  type PublicProfileRow,
  type UserSettingsRow,
} from '@/server/tables'

const PROFILE_SELECT = toSelectList(PROFILE_COLUMNS)
const PUBLIC_PROFILE_SELECT = toSelectList(PUBLIC_PROFILE_COLUMNS)
const USER_SETTINGS_SELECT = toSelectList(USER_SETTINGS_COLUMNS)

const PROFILES_TABLE = 'profiles'
const USER_SETTINGS_TABLE = 'user_settings'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

export function mapProfileRow(value: unknown): ProfileRow | null {
  if (!isRecord(value)) return null

  return {
    id: str(value.id),
    user_id: str(value.user_id),
    username: strOrNull(value.username),
    display_name: strOrNull(value.display_name),
    avatar_path: strOrNull(value.avatar_path),
    rating_estimate: numOrNull(value.rating_estimate),
    rating_source: strOrNull(value.rating_source),
    // Valor inesperado vira `private` no DTO (fail closed), não `public`.
    profile_visibility: str(value.profile_visibility),
    created_at: str(value.created_at),
    updated_at: str(value.updated_at),
  }
}

export function mapPublicProfileRow(value: unknown): PublicProfileRow | null {
  if (!isRecord(value)) return null

  return {
    username: strOrNull(value.username),
    display_name: strOrNull(value.display_name),
    avatar_path: strOrNull(value.avatar_path),
    rating_estimate: numOrNull(value.rating_estimate),
    profile_visibility: str(value.profile_visibility),
  }
}

export function mapUserSettingsRow(value: unknown): UserSettingsRow | null {
  if (!isRecord(value)) return null

  return {
    user_id: str(value.user_id),
    language: strOrNull(value.language),
    theme: strOrNull(value.theme),
    board_theme: strOrNull(value.board_theme),
    piece_theme: strOrNull(value.piece_theme),
    timezone: strOrNull(value.timezone),
    training_reminders: boolOrNull(value.training_reminders),
    analytics_opt_in: boolOrNull(value.analytics_opt_in),
  }
}

function falha<T>(operacao: string, erro: unknown): StoreOutcome<T> {
  const detalhe =
    isRecord(erro) && typeof erro.message === 'string' ? erro.message : 'erro desconhecido'
  return storeFailure<T>(`${operacao}: ${detalhe}`)
}

/**
 * Cria o store a partir de um cliente JÁ autenticado como o usuário
 * (`createUserClient(session.token)`). Passar aqui um cliente com a secret key
 * desliga a RLS de todas as consultas abaixo — não faça isso.
 */
export function createSupabaseProfileStore(client: SupabaseClient): ProfileStore {
  return {
    async findProfileByUserId(userId: string): Promise<StoreOutcome<ProfileRow | null>> {
      try {
        const { data, error } = await client
          .from(PROFILES_TABLE)
          .select(PROFILE_SELECT)
          .eq('user_id', userId)
          .maybeSingle()

        if (error) return falha('findProfileByUserId', error)
        return storeOk(mapProfileRow(data))
      } catch (erro) {
        return falha('findProfileByUserId', erro)
      }
    },

    async updateProfileByUserId(
      userId: string,
      patch: ProfilePatch,
    ): Promise<StoreOutcome<ProfileRow | null>> {
      try {
        const { data, error } = await client
          .from(PROFILES_TABLE)
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .select(PROFILE_SELECT)
          .maybeSingle()

        if (error) return falha('updateProfileByUserId', error)
        return storeOk(mapProfileRow(data))
      } catch (erro) {
        return falha('updateProfileByUserId', erro)
      }
    },

    async findPublicProfileByUsername(
      username: string,
    ): Promise<StoreOutcome<PublicProfileRow | null>> {
      try {
        // O filtro de visibilidade é do SQL. A RLS confere de novo, e o DTO
        // confere uma terceira vez: perfil privado não pode sair daqui.
        const { data, error } = await client
          .from(PROFILES_TABLE)
          .select(PUBLIC_PROFILE_SELECT)
          .eq('username', username)
          .eq('profile_visibility', 'public')
          .maybeSingle()

        if (error) return falha('findPublicProfileByUsername', error)
        return storeOk(mapPublicProfileRow(data))
      } catch (erro) {
        return falha('findPublicProfileByUsername', erro)
      }
    },

    async findSettingsByUserId(userId: string): Promise<StoreOutcome<UserSettingsRow | null>> {
      try {
        const { data, error } = await client
          .from(USER_SETTINGS_TABLE)
          .select(USER_SETTINGS_SELECT)
          .eq('user_id', userId)
          .maybeSingle()

        if (error) return falha('findSettingsByUserId', error)
        return storeOk(mapUserSettingsRow(data))
      } catch (erro) {
        return falha('findSettingsByUserId', erro)
      }
    },

    async updateSettingsByUserId(
      userId: string,
      patch: UserSettingsPatch,
    ): Promise<StoreOutcome<UserSettingsRow | null>> {
      try {
        const { data, error } = await client
          .from(USER_SETTINGS_TABLE)
          .update({ ...patch })
          .eq('user_id', userId)
          .select(USER_SETTINGS_SELECT)
          .maybeSingle()

        if (error) return falha('updateSettingsByUserId', error)
        return storeOk(mapUserSettingsRow(data))
      } catch (erro) {
        return falha('updateSettingsByUserId', erro)
      }
    },
  }
}
