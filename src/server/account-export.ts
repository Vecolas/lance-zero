import 'server-only'

import {
  toProfileDto,
  toUserSettingsDto,
  type ProfileDto,
  type UserSettingsDto,
} from '@/server/dto'
import type { AuthSession } from '@/server/profile-dal'
import { createSupabaseProfileStore } from '@/server/profile-store-supabase'
import { createUserClient } from '@/server/supabase'
import type { ProfileRow, UserSettingsRow } from '@/server/tables'

export interface SyncedStateExport {
  payload: Record<string, unknown>
  schemaVersion: number
  deviceLabel: string | null
  updatedAt: string
}

export interface AccountExport {
  format: 'lancezero-account-export'
  version: 1
  exportedAt: string
  profile: ProfileDto | null
  settings: UserSettingsDto | null
  syncedState: SyncedStateExport | null
}

export type AccountExportResult =
  { ok: true; data: AccountExport } | { ok: false; code: 'unauthorized' | 'read-failed' }

export interface AccountExportReader {
  readProfile(userId: string): Promise<{ data: ProfileRow | null; error: unknown }>
  readSettings(userId: string): Promise<{ data: UserSettingsRow | null; error: unknown }>
  readSyncedState(userId: string): Promise<{ data: unknown; error: unknown }>
}

function sessionValida(session: AuthSession | null | undefined): session is AuthSession {
  return Boolean(
    session &&
    typeof session.userId === 'string' &&
    session.userId.trim() !== '' &&
    typeof session.token === 'string' &&
    session.token.trim() !== '',
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mapSyncedState(value: unknown): SyncedStateExport | null {
  if (!isRecord(value)) return null
  if (!isRecord(value.payload)) return null
  if (typeof value.schema_version !== 'number' || !Number.isInteger(value.schema_version))
    return null
  if (typeof value.updated_at !== 'string' || value.updated_at.length === 0) return null

  return {
    payload: value.payload,
    schemaVersion: value.schema_version,
    deviceLabel: typeof value.device_label === 'string' ? value.device_label : null,
    updatedAt: value.updated_at,
  }
}

export async function exportAccountData(
  session: AuthSession | null | undefined,
  reader?: AccountExportReader,
): Promise<AccountExportResult> {
  if (!sessionValida(session)) return { ok: false, code: 'unauthorized' }

  const operador = reader ?? createSupabaseAccountExportReader(session.token)
  let perfil: Awaited<ReturnType<AccountExportReader['readProfile']>>
  let settings: Awaited<ReturnType<AccountExportReader['readSettings']>>
  let state: Awaited<ReturnType<AccountExportReader['readSyncedState']>>
  try {
    ;[perfil, settings, state] = await Promise.all([
      operador.readProfile(session.userId),
      operador.readSettings(session.userId),
      operador.readSyncedState(session.userId),
    ])
  } catch {
    return { ok: false, code: 'read-failed' }
  }

  if (perfil.error || settings.error || state.error) return { ok: false, code: 'read-failed' }
  if (state.data !== null && mapSyncedState(state.data) === null) {
    return { ok: false, code: 'read-failed' }
  }

  return {
    ok: true,
    data: {
      format: 'lancezero-account-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: perfil.data ? toProfileDto(perfil.data) : null,
      settings: settings.data ? toUserSettingsDto(settings.data) : null,
      syncedState: mapSyncedState(state.data),
    },
  }
}

function createSupabaseAccountExportReader(token: string): AccountExportReader {
  const client = createUserClient(token)
  const profileStore = createSupabaseProfileStore(client)

  return {
    async readProfile(userId) {
      const resultado = await profileStore.findProfileByUserId(userId)
      return resultado.ok
        ? { data: resultado.data, error: null }
        : { data: null, error: resultado.error }
    },

    async readSettings(userId) {
      const resultado = await profileStore.findSettingsByUserId(userId)
      return resultado.ok
        ? { data: resultado.data, error: null }
        : { data: null, error: resultado.error }
    },

    async readSyncedState(userId) {
      try {
        const { data, error } = await client
          .from('user_state')
          .select('payload, schema_version, device_label, updated_at')
          .eq('user_id', userId)
          .maybeSingle()
        return { data, error }
      } catch (error) {
        return { data: null, error }
      }
    },
  }
}
