/**
 * Camada de acesso ao perfil, com dublê de banco.
 *
 * O que estes testes protegem (plano de segurança):
 * seção 23 (DAL), 26 (Server Action é endpoint público), 27 (nunca confiar em
 * `userId` do navegador), 28 (IDOR/BOLA), 69 (mass assignment),
 * 88 (erro genérico), 90 (log mínimo).
 *
 * Não existe projeto Supabase provisionado, e estes testes não precisam de um:
 * o que está sendo verificado é a decisão de autorização, que acontece antes
 * do banco. O dublê registra cada chamada para o teste poder afirmar tanto o
 * que foi consultado quanto — mais importante — o que NÃO foi.
 */

import { describe, expect, it } from 'vitest'

import { AppError } from '@/server/errors'
import type { SecurityLogEvent, SecurityLogger } from '@/server/logging'
import { createProfileDal, type AuthSession } from '@/server/profile-dal'
import type {
  ProfilePatch,
  ProfileStore,
  PublicProfileRow,
  StoreOutcome,
  UserSettingsPatch,
} from '@/server/profile-store'
import type { ProfileRow, UserSettingsRow } from '@/server/tables'

const ALICE: AuthSession = { userId: 'user_2alice', token: 'jwt-da-alice' }

const PERFIL_ALICE: ProfileRow = {
  id: 'perfil-alice',
  user_id: 'user_2alice',
  username: 'alice',
  display_name: 'Alice',
  avatar_path: null,
  rating_estimate: 1180,
  rating_source: 'diagnostico',
  profile_visibility: 'private',
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-01T10:00:00.000Z',
}

const PERFIL_BOB: ProfileRow = {
  ...PERFIL_ALICE,
  id: 'perfil-bob',
  user_id: 'user_2bob',
  username: 'bob',
  display_name: 'Bob',
}

const SETTINGS_ALICE: UserSettingsRow = {
  user_id: 'user_2alice',
  language: 'pt-BR',
  theme: 'escuro',
  board_theme: 'papel',
  piece_theme: 'padrao',
  timezone: 'America/Sao_Paulo',
  training_reminders: false,
  analytics_opt_in: false,
}

interface ChamadaStore {
  metodo: string
  userId?: string
  username?: string
  patch?: ProfilePatch | UserSettingsPatch
}

interface Dublê {
  store: ProfileStore
  chamadas: ChamadaStore[]
}

interface RespostasDublê {
  perfil?: StoreOutcome<ProfileRow | null>
  perfilAtualizado?: StoreOutcome<ProfileRow | null>
  perfilPublico?: StoreOutcome<PublicProfileRow | null>
  settings?: StoreOutcome<UserSettingsRow | null>
  settingsAtualizadas?: StoreOutcome<UserSettingsRow | null>
}

/** Dublê do banco: registra o que foi pedido e devolve o que o teste mandar. */
function criarDublê(respostas: RespostasDublê = {}): Dublê {
  const chamadas: ChamadaStore[] = []

  const store: ProfileStore = {
    async findProfileByUserId(userId) {
      chamadas.push({ metodo: 'findProfileByUserId', userId })
      return respostas.perfil ?? { ok: true, data: null }
    },
    async updateProfileByUserId(userId, patch) {
      chamadas.push({ metodo: 'updateProfileByUserId', userId, patch })
      return respostas.perfilAtualizado ?? { ok: true, data: null }
    },
    async findPublicProfileByUsername(username) {
      chamadas.push({ metodo: 'findPublicProfileByUsername', username })
      return respostas.perfilPublico ?? { ok: true, data: null }
    },
    async findSettingsByUserId(userId) {
      chamadas.push({ metodo: 'findSettingsByUserId', userId })
      return respostas.settings ?? { ok: true, data: null }
    },
    async updateSettingsByUserId(userId, patch) {
      chamadas.push({ metodo: 'updateSettingsByUserId', userId, patch })
      return respostas.settingsAtualizadas ?? { ok: true, data: null }
    },
  }

  return { store, chamadas }
}

function criarLogger(): { logger: SecurityLogger; eventos: SecurityLogEvent[] } {
  const eventos: SecurityLogEvent[] = []
  return { logger: { log: (evento) => eventos.push(evento) }, eventos }
}

function montarDal(respostas: RespostasDublê = {}) {
  const dublê = criarDublê(respostas)
  const { logger, eventos } = criarLogger()
  const dal = createProfileDal({
    store: dublê.store,
    logger,
    requestId: () => 'req-fixo',
    now: () => new Date('2026-09-09T12:00:00.000Z'),
  })

  return { dal, chamadas: dublê.chamadas, eventos }
}

async function capturarErro(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn()
    return null
  } catch (erro) {
    return erro
  }
}

const ENTRADA_VALIDA = { username: 'alice', displayName: 'Alice', ratingEstimate: 1200 }

describe('DAL — sem sessão nega antes de tocar o banco', () => {
  const sessoesInvalidas: (AuthSession | null | undefined)[] = [
    null,
    undefined,
    { userId: '', token: 'jwt' },
    { userId: '   ', token: 'jwt' },
    { userId: 'user_2alice', token: '' },
  ]

  it('recusa leitura do próprio perfil e não consulta o store', async () => {
    for (const sessao of sessoesInvalidas) {
      const { dal, chamadas } = montarDal({ perfil: { ok: true, data: PERFIL_ALICE } })

      const erro = await capturarErro(() => dal.getMyProfile(sessao))

      expect(erro).toBeInstanceOf(AppError)
      expect((erro as AppError).code).toBe('unauthorized')
      // A prova do fail closed: o banco nem chegou a ser chamado.
      expect(chamadas).toHaveLength(0)
    }
  })

  it('recusa atualização e não consulta o store', async () => {
    const { dal, chamadas } = montarDal({ perfilAtualizado: { ok: true, data: PERFIL_ALICE } })

    const erro = await capturarErro(() => dal.updateMyProfile(null, ENTRADA_VALIDA))

    expect((erro as AppError).code).toBe('unauthorized')
    expect(chamadas).toHaveLength(0)
  })

  it('recusa preferências e não consulta o store', async () => {
    const { dal, chamadas } = montarDal({ settings: { ok: true, data: SETTINGS_ALICE } })

    expect(((await capturarErro(() => dal.getMySettings(undefined))) as AppError).code).toBe(
      'unauthorized',
    )
    expect(
      ((await capturarErro(() => dal.updateMySettings(undefined, { theme: 'claro' }))) as AppError)
        .code,
    ).toBe('unauthorized')
    expect(chamadas).toHaveLength(0)
  })

  it('registra a negativa sem identificar o ator inexistente', async () => {
    const { dal, eventos } = montarDal()

    await capturarErro(() => dal.getMyProfile(null))

    expect(eventos).toHaveLength(1)
    expect(eventos[0].success).toBe(false)
    expect(eventos[0].actorHash).toBeNull()
  })
})

describe('DAL — a identidade sai sempre da sessão', () => {
  it('filtra pelo userId da sessão na leitura', async () => {
    const { dal, chamadas } = montarDal({ perfil: { ok: true, data: PERFIL_ALICE } })

    const perfil = await dal.getMyProfile(ALICE)

    expect(chamadas).toEqual([{ metodo: 'findProfileByUserId', userId: 'user_2alice' }])
    expect(perfil?.username).toBe('alice')
  })

  it('ignora userId enviado na entrada — rejeitando a operação inteira', async () => {
    // Seções 27/28/69: o atacante manda o `user_id` da vítima junto do payload.
    // Como o schema é `.strict()`, isso não é ignorado: derruba a operação.
    const { dal, chamadas } = montarDal({ perfilAtualizado: { ok: true, data: PERFIL_ALICE } })

    const erro = await capturarErro(() =>
      dal.updateMyProfile(ALICE, { ...ENTRADA_VALIDA, user_id: 'user_2bob' }),
    )

    expect((erro as AppError).code).toBe('invalid_input')
    expect(chamadas).toHaveLength(0)
  })

  it('usa o userId da sessão no update, e nunca o da entrada', async () => {
    const { dal, chamadas } = montarDal({ perfilAtualizado: { ok: true, data: PERFIL_ALICE } })

    await dal.updateMyProfile(ALICE, ENTRADA_VALIDA)

    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].metodo).toBe('updateProfileByUserId')
    expect(chamadas[0].userId).toBe('user_2alice')
    // O patch leva só as colunas permitidas: nada de user_id ou visibilidade.
    expect(Object.keys(chamadas[0].patch ?? {}).sort()).toEqual([
      'display_name',
      'rating_estimate',
      'username',
    ])
  })

  it('nega quando o banco devolve linha de outro dono (IDOR)', async () => {
    // Cenário de bug grave: consulta ou RLS falharam e veio a linha do Bob.
    // A DAL prefere errar negando.
    const { dal, eventos } = montarDal({ perfil: { ok: true, data: PERFIL_BOB } })

    const erro = await capturarErro(() => dal.getMyProfile(ALICE))

    expect(erro).toBeInstanceOf(AppError)
    expect((erro as AppError).code).toBe('internal')
    expect(eventos.some((evento) => evento.event === 'profile_ownership_mismatch')).toBe(true)
  })

  it('não devolve dado do Bob nem no update', async () => {
    const { dal } = montarDal({ perfilAtualizado: { ok: true, data: PERFIL_BOB } })

    const erro = await capturarErro(() => dal.updateMyProfile(ALICE, ENTRADA_VALIDA))

    expect((erro as AppError).code).toBe('internal')
    expect(JSON.stringify(erro)).not.toContain('user_2bob')
  })
})

describe('DAL — erro do banco vira mensagem genérica', () => {
  it('não vaza o texto do driver para o chamador', async () => {
    const detalheInterno =
      'permission denied for table profiles (SQL: select id, user_id from profiles where user_id = $1)'
    const { dal, eventos } = montarDal({ perfil: { ok: false, error: detalheInterno } })

    const erro = await capturarErro(() => dal.getMyProfile(ALICE))

    expect(erro).toBeInstanceOf(AppError)
    const appError = erro as AppError
    expect(appError.code).toBe('internal')
    expect(appError.message).toBe('Não foi possível concluir a operação.')
    expect(appError.message).not.toContain('SQL')
    expect(appError.message).not.toContain('profiles')

    // O payload que vai ao navegador carrega só código e correlação.
    const payload = appError.toClientPayload()
    expect(Object.keys(payload).sort()).toEqual(['code', 'message', 'requestId'])
    expect(JSON.stringify(payload)).not.toContain('permission denied')

    // O detalhe existe, mas só no log do servidor.
    const falha = eventos.find((evento) => evento.success === false)
    expect(falha?.detail).toContain('permission denied')
    expect(falha?.requestId).toBe('req-fixo')
  })

  it('trata "nenhuma linha atualizada" como não encontrado, sem explicar o motivo', async () => {
    const { dal } = montarDal({ perfilAtualizado: { ok: true, data: null } })

    const erro = await capturarErro(() => dal.updateMyProfile(ALICE, ENTRADA_VALIDA))

    expect((erro as AppError).code).toBe('not_found')
  })

  it('devolve null, e não erro, quando o perfil ainda não existe', async () => {
    const { dal } = montarDal({ perfil: { ok: true, data: null } })
    await expect(dal.getMyProfile(ALICE)).resolves.toBeNull()
  })
})

describe('DAL — log mínimo', () => {
  it('pseudonimiza o ator e não escreve o userId cru', async () => {
    const { dal, eventos } = montarDal({ perfil: { ok: true, data: PERFIL_ALICE } })

    await dal.getMyProfile(ALICE)

    expect(eventos).toHaveLength(1)
    const evento = eventos[0]
    expect(evento.event).toBe('profile_read')
    expect(evento.success).toBe(true)
    expect(evento.timestamp).toBe('2026-09-09T12:00:00.000Z')
    expect(evento.actorHash).not.toBe('user_2alice')
    expect(JSON.stringify(evento)).not.toContain('user_2alice')
    // Token de sessão jamais entra em log (seção 89).
    expect(JSON.stringify(evento)).not.toContain('jwt-da-alice')
  })
})

describe('DAL — perfil público', () => {
  const PUBLICO: PublicProfileRow = {
    username: 'alice',
    display_name: 'Alice',
    avatar_path: null,
    rating_estimate: 1180,
    profile_visibility: 'public',
  }

  it('devolve apenas os campos públicos', async () => {
    const { dal, chamadas } = montarDal({ perfilPublico: { ok: true, data: PUBLICO } })

    const perfil = await dal.getPublicProfile('alice')

    expect(chamadas).toEqual([{ metodo: 'findPublicProfileByUsername', username: 'alice' }])
    expect(perfil).toEqual({
      username: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
      ratingEstimate: 1180,
    })
  })

  it('devolve null se a linha vier marcada como privada', async () => {
    const { dal } = montarDal({
      perfilPublico: { ok: true, data: { ...PUBLICO, profile_visibility: 'private' } },
    })

    await expect(dal.getPublicProfile('alice')).resolves.toBeNull()
  })

  it('não consulta o banco com username fora do formato', async () => {
    const { dal, chamadas } = montarDal({ perfilPublico: { ok: true, data: PUBLICO } })

    await expect(dal.getPublicProfile('../../etc/passwd')).resolves.toBeNull()
    await expect(dal.getPublicProfile(42)).resolves.toBeNull()
    await expect(dal.getPublicProfile(null)).resolves.toBeNull()
    await expect(dal.getPublicProfile({ userId: 'user_2bob' })).resolves.toBeNull()

    expect(chamadas).toHaveLength(0)
  })
})

describe('DAL — preferências', () => {
  it('lê e converte as preferências do dono da sessão', async () => {
    const { dal, chamadas } = montarDal({ settings: { ok: true, data: SETTINGS_ALICE } })

    const settings = await dal.getMySettings(ALICE)

    expect(chamadas[0].userId).toBe('user_2alice')
    expect(settings).toEqual({
      language: 'pt-BR',
      theme: 'escuro',
      boardTheme: 'papel',
      pieceTheme: 'padrao',
      timezone: 'America/Sao_Paulo',
      trainingReminders: false,
      analyticsOptIn: false,
    })
  })

  it('grava apenas as colunas enviadas e permitidas', async () => {
    const { dal, chamadas } = montarDal({
      settingsAtualizadas: { ok: true, data: { ...SETTINGS_ALICE, theme: 'claro' } },
    })

    await dal.updateMySettings(ALICE, { theme: 'claro' })

    expect(chamadas[0].patch).toEqual({ theme: 'claro' })
  })

  it('nega preferências de outro dono devolvidas pelo banco', async () => {
    const { dal } = montarDal({
      settings: { ok: true, data: { ...SETTINGS_ALICE, user_id: 'user_2bob' } },
    })

    const erro = await capturarErro(() => dal.getMySettings(ALICE))
    expect((erro as AppError).code).toBe('internal')
  })
})
