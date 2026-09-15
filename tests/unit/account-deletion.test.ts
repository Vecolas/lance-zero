import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import type { AuthSession } from '@/server/profile-dal'
import { deleteAccount, type AccountDeletionAdmin } from '@/server/account-deletion'

const SESSION: AuthSession = { userId: '11111111-1111-1111-1111-111111111111', token: 'jwt' }

function adminFake(overrides: Partial<AccountDeletionAdmin> = {}) {
  const chamadas: Array<{ metodo: string; valor: unknown }> = []
  const admin: AccountDeletionAdmin = {
    async listAvatarObjects(userId, options) {
      chamadas.push({ metodo: 'list', valor: { userId, options } })
      return { data: [], error: null }
    },
    async removeAvatarObjects(paths) {
      chamadas.push({ metodo: 'remove', valor: paths })
      return { error: null }
    },
    async deleteAuthUser(userId) {
      chamadas.push({ metodo: 'delete', valor: userId })
      return { error: null }
    },
    ...overrides,
  }
  return { admin, chamadas }
}

describe('exclusão de conta', () => {
  it('nega sessão ausente antes de tocar no administrador', async () => {
    const { admin, chamadas } = adminFake()

    await expect(deleteAccount(null, 'APAGAR CONTA', admin)).resolves.toEqual({
      ok: false,
      code: 'unauthorized',
    })
    expect(chamadas).toEqual([])
  })

  it('nega sessão ausente sem sequer construir o cliente privilegiado', async () => {
    await expect(deleteAccount(null, 'APAGAR CONTA')).resolves.toEqual({
      ok: false,
      code: 'unauthorized',
    })
  })

  it('exige confirmação exata e não aceita confirmação parcial', async () => {
    const { admin, chamadas } = adminFake()

    await expect(deleteAccount(SESSION, 'apagar conta', admin)).resolves.toEqual({
      ok: false,
      code: 'confirmation-required',
    })
    expect(chamadas).toEqual([])
  })

  it('remove avatars antes do usuário Auth, usando a identidade da sessão', async () => {
    const { admin, chamadas } = adminFake({
      async listAvatarObjects(userId, options) {
        chamadas.push({ metodo: 'list', valor: { userId, options } })
        return { data: [{ name: 'avatar.webp' }, { name: 'outro.webp' }], error: null }
      },
    })

    await expect(deleteAccount(SESSION, 'APAGAR CONTA', admin)).resolves.toEqual({ ok: true })
    expect(chamadas.map(({ metodo }) => metodo)).toEqual(['list', 'remove', 'delete'])
    expect(chamadas[1]?.valor).toEqual([
      `${SESSION.userId}/avatar.webp`,
      `${SESSION.userId}/outro.webp`,
    ])
    expect(chamadas[2]?.valor).toBe(SESSION.userId)
  })

  it('falha fechado diante de path de Storage inesperado e não apaga Auth', async () => {
    const { admin, chamadas } = adminFake({
      async listAvatarObjects() {
        return { data: [{ name: '../outro-usuario.webp' }], error: null }
      },
    })

    await expect(deleteAccount(SESSION, 'APAGAR CONTA', admin)).resolves.toEqual({
      ok: false,
      code: 'storage-failed',
    })
    expect(chamadas.map(({ metodo }) => metodo)).toEqual([])
  })

  it('não apaga Auth se a limpeza do Storage falhar', async () => {
    const { admin, chamadas } = adminFake({
      async listAvatarObjects() {
        return { data: [{ name: 'avatar.webp' }], error: null }
      },
      async removeAvatarObjects() {
        return { error: new Error('storage indisponível') }
      },
    })

    await expect(deleteAccount(SESSION, 'APAGAR CONTA', admin)).resolves.toEqual({
      ok: false,
      code: 'storage-failed',
    })
    expect(chamadas.map(({ metodo }) => metodo)).not.toContain('delete')
  })

  it('relê a primeira página depois de remover um lote cheio', async () => {
    const offsets: number[] = []
    let pagina = 0
    const { admin, chamadas } = adminFake({
      async listAvatarObjects(_userId, options) {
        offsets.push(options.offset)
        pagina += 1
        if (pagina === 1) {
          return {
            data: Array.from({ length: 100 }, (_, indice) => ({ name: `a-${indice}.webp` })),
            error: null,
          }
        }
        if (pagina === 2) return { data: [{ name: 'ultimo.webp' }], error: null }
        return { data: [], error: null }
      },
    })

    await expect(deleteAccount(SESSION, 'APAGAR CONTA', admin)).resolves.toEqual({ ok: true })
    expect(offsets).toEqual([0, 0])
    expect(chamadas.map(({ metodo }) => metodo)).toEqual(['remove', 'remove', 'delete'])
  })
})
