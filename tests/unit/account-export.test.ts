import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { exportAccountData, type AccountExportReader } from '@/server/account-export'
import type { AuthSession } from '@/server/profile-dal'

const SESSION: AuthSession = { userId: '11111111-1111-1111-1111-111111111111', token: 'jwt' }

const PROFILE = {
  id: 'profile-id',
  user_id: SESSION.userId,
  username: 'alice',
  display_name: 'Alice',
  avatar_path: null,
  rating_estimate: 1200,
  rating_source: 'diagnostico',
  profile_visibility: 'private',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
}

const SETTINGS = {
  user_id: SESSION.userId,
  language: 'pt-BR',
  theme: 'dark',
  board_theme: 'paper',
  piece_theme: 'classico',
  timezone: 'America/Sao_Paulo',
  training_reminders: false,
  analytics_opt_in: false,
}

function readerFake(overrides: Partial<AccountExportReader> = {}): AccountExportReader {
  return {
    async readProfile() {
      return { data: PROFILE, error: null }
    },
    async readSettings() {
      return { data: SETTINGS, error: null }
    },
    async readSyncedState() {
      return {
        data: {
          payload: { reviewCards: [] },
          schema_version: 3,
          device_label: 'celular',
          updated_at: '2026-01-03T00:00:00.000Z',
        },
        error: null,
      }
    },
    ...overrides,
  }
}

describe('exportação autenticada da conta', () => {
  it('nega sessão ausente sem criar leitor', async () => {
    await expect(exportAccountData(null)).resolves.toEqual({ ok: false, code: 'unauthorized' })
  })

  it('exporta apenas o DTO privado e o estado sincronizado do dono', async () => {
    const resultado = await exportAccountData(SESSION, readerFake())

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    expect(resultado.data.format).toBe('lancezero-account-export')
    expect(resultado.data.profile).toMatchObject({ username: 'alice', displayName: 'Alice' })
    expect(resultado.data.profile).not.toHaveProperty('user_id')
    expect(resultado.data.profile).not.toHaveProperty('email')
    expect(resultado.data.settings?.analyticsOptIn).toBe(false)
    expect(resultado.data.syncedState).toEqual({
      payload: { reviewCards: [] },
      schemaVersion: 3,
      deviceLabel: 'celular',
      updatedAt: '2026-01-03T00:00:00.000Z',
    })
  })

  it('falha fechado se qualquer leitura protegida falhar', async () => {
    const resultado = await exportAccountData(
      SESSION,
      readerFake({
        async readSyncedState() {
          return { data: null, error: new Error('RLS') }
        },
      }),
    )

    expect(resultado).toEqual({ ok: false, code: 'read-failed' })
  })

  it('falha fechado diante de estado com formato inválido', async () => {
    const resultado = await exportAccountData(
      SESSION,
      readerFake({
        async readSyncedState() {
          return { data: { payload: [] }, error: null }
        },
      }),
    )

    expect(resultado).toEqual({ ok: false, code: 'read-failed' })
  })
})
