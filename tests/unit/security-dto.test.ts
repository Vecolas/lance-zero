/**
 * DTOs, validação de entrada e leitura de ambiente.
 *
 * O que estes testes protegem (plano de segurança):
 * seção 13 (dados proibidos), 24 (DTO), 25 (perfil público),
 * 41 (`NEXT_PUBLIC_`), 69 (mass assignment), 70 (Zod), 127 (ocultar não é
 * autorizar).
 *
 * O caso mais importante é o do "campo extra vindo do banco": um dia alguém
 * adiciona uma coluna sensível em `profiles`, e o teste tem que continuar
 * provando que ela não sai pelo DTO sem alguém decidir isso explicitamente.
 */

import { describe, expect, it } from 'vitest'

import { toProfileDto, toPublicProfileDto, toUserSettingsDto } from '@/server/dto'
import {
  assertNoPublicSecrets,
  EnvConfigError,
  readPublicEnv,
  readSecretEnv,
  type EnvSource,
} from '@/server/env'
import {
  FORBIDDEN_FIELDS,
  toSelectList,
  type ProfileRow,
  type UserSettingsRow,
} from '@/server/tables'
import {
  isReservedUsername,
  publicUsernameSchema,
  updateProfileSchema,
  updateUserSettingsSchema,
  usernameSchema,
} from '@/server/validation'

const PERFIL_PUBLICO: ProfileRow = {
  id: 'perfil-1',
  user_id: 'user_2alice',
  username: 'vecola',
  display_name: 'Vecola',
  avatar_path: 'avatars/vecola.webp',
  rating_estimate: 1180,
  rating_source: 'diagnostico',
  profile_visibility: 'public',
  created_at: '2026-09-01T10:00:00.000Z',
  updated_at: '2026-09-02T10:00:00.000Z',
}

const SETTINGS: UserSettingsRow = {
  user_id: 'user_2alice',
  language: 'pt-BR',
  theme: 'escuro',
  board_theme: 'papel',
  piece_theme: 'padrao',
  timezone: 'America/Sao_Paulo',
  training_reminders: true,
  analytics_opt_in: null,
}

/** Variação da linha sem disparar excess property check em literal solto. */
function perfilCom(patch: Partial<ProfileRow>): ProfileRow {
  return { ...PERFIL_PUBLICO, ...patch }
}

/** Todos os valores de um objeto, em texto, para procurar dado que vazou. */
function serializar(objeto: object): string {
  return JSON.stringify(objeto)
}

function capturarErro(fn: () => unknown): unknown {
  try {
    fn()
    return null
  } catch (erro) {
    return erro
  }
}

/** Caractere de controle montado por código: nada de byte invisível no fonte. */
const BEL = String.fromCharCode(7)

describe('DTO de perfil', () => {
  it('não expõe identificadores internos nem campos proibidos', () => {
    const dto = toProfileDto(PERFIL_PUBLICO)
    const chaves = Object.keys(dto).map((chave) => chave.toLowerCase())

    expect(chaves).not.toContain('id')
    expect(chaves).not.toContain('user_id')
    expect(chaves).not.toContain('userid')

    for (const proibido of FORBIDDEN_FIELDS) {
      expect(chaves).not.toContain(proibido)
    }

    // O `user_id` também não pode aparecer como VALOR em campo nenhum.
    expect(serializar(dto)).not.toContain('user_2alice')
  })

  it('não deixa vazar coluna nova que apareça na linha do banco', () => {
    // Simula uma migração futura acrescentando colunas sensíveis.
    const linhaComExtras = {
      ...PERFIL_PUBLICO,
      email: 'alice@example.com',
      password_hash: 'hash-super-secreto',
      clerk_jwt: 'ey.jwt.falso',
      is_admin: true,
      moderation_notes: 'nota interna',
    }

    const dto = toProfileDto(linhaComExtras)
    const serializado = serializar(dto)

    expect(Object.keys(dto)).toEqual([
      'username',
      'displayName',
      'avatarUrl',
      'ratingEstimate',
      'ratingSource',
      'profileVisibility',
      'createdAt',
      'updatedAt',
    ])
    expect(serializado).not.toContain('alice@example.com')
    expect(serializado).not.toContain('hash-super-secreto')
    expect(serializado).not.toContain('ey.jwt.falso')
    expect(serializado).not.toContain('nota interna')
  })

  it('trata visibilidade desconhecida como privada (fail closed)', () => {
    expect(toProfileDto(perfilCom({ profile_visibility: 'quase-publico' })).profileVisibility).toBe(
      'private',
    )
  })
})

describe('DTO público', () => {
  it('é subconjunto estrito do DTO privado', () => {
    const publico = toPublicProfileDto(PERFIL_PUBLICO)
    expect(publico).not.toBeNull()

    const chavesPrivadas = Object.keys(toProfileDto(PERFIL_PUBLICO))
    const chavesPublicas = Object.keys(publico ?? {})

    for (const chave of chavesPublicas) {
      expect(chavesPrivadas).toContain(chave)
    }
    expect(chavesPublicas.length).toBeLessThan(chavesPrivadas.length)
  })

  it('devolve null para perfil privado, mesmo com a linha em mãos', () => {
    // Seção 127: o dado não pode nem chegar ao navegador para ser escondido lá.
    expect(toPublicProfileDto(perfilCom({ profile_visibility: 'private' }))).toBeNull()
  })

  it('devolve null quando não há username', () => {
    expect(toPublicProfileDto(perfilCom({ username: null }))).toBeNull()
    expect(toPublicProfileDto(perfilCom({ username: '' }))).toBeNull()
  })

  it('não expõe campo proibido nem com coluna extra na linha', () => {
    const linhaComExtras = {
      ...PERFIL_PUBLICO,
      email: 'alice@example.com',
      ip_address: '203.0.113.9',
      moderation_flag: 'suspeito',
    }

    const publico = toPublicProfileDto(linhaComExtras)

    expect(publico).not.toBeNull()
    expect(Object.keys(publico ?? {})).toEqual([
      'username',
      'displayName',
      'avatarUrl',
      'ratingEstimate',
    ])
    expect(serializar(publico ?? {})).not.toContain('203.0.113.9')
    expect(serializar(publico ?? {})).not.toContain('user_2alice')
    expect(serializar(publico ?? {})).not.toContain('suspeito')
  })
})

describe('DTO de preferências', () => {
  it('não devolve user_id e trata opt-in ausente como desligado', () => {
    const dto = toUserSettingsDto(SETTINGS)

    expect(Object.keys(dto)).not.toContain('user_id')
    expect(dto.analyticsOptIn).toBe(false)
    expect(dto.trainingReminders).toBe(true)
  })
})

describe('lista de colunas', () => {
  it('recusa select("*") e coluna proibida', () => {
    expect(() => toSelectList(['username', '*'])).toThrow(/select/i)
    expect(() => toSelectList(['username', 'password_hash'])).toThrow(/proibida/i)
    expect(() => toSelectList([])).toThrow()
    expect(toSelectList(['username', 'display_name'])).toBe('username, display_name')
  })
})

describe('validação de username', () => {
  it('aceita o formato do plano', () => {
    expect(usernameSchema.safeParse('vecola').success).toBe(true)
    expect(usernameSchema.safeParse('Ana_Lu-99').success).toBe(true)
  })

  it('rejeita username reservado, em qualquer caixa', () => {
    for (const reservado of ['admin', 'ADMIN', 'Support', 'lancezero', 'api']) {
      expect(usernameSchema.safeParse(reservado).success).toBe(false)
      expect(isReservedUsername(reservado)).toBe(true)
    }
  })

  it('rejeita caractere inválido, acento e tentativa de injeção', () => {
    const invalidos = [
      've cola',
      'vecolá',
      've.cola',
      've/cola',
      '<script>alert(1)</script>',
      "vecola'--",
      'ab',
      'a'.repeat(25),
      'усер',
    ]

    for (const entrada of invalidos) {
      expect(usernameSchema.safeParse(entrada).success).toBe(false)
    }
  })

  it('usa a mesma regra na URL pública', () => {
    expect(publicUsernameSchema.safeParse('../../etc/passwd').success).toBe(false)
    expect(publicUsernameSchema.safeParse('vecola').success).toBe(true)
  })
})

describe('validação de atualização de perfil (mass assignment)', () => {
  const valido = { username: 'vecola', displayName: 'Vecola', ratingEstimate: 1180 }

  it('aceita a entrada legítima', () => {
    expect(updateProfileSchema.safeParse(valido).success).toBe(true)
  })

  it('REJEITA campo a mais em vez de ignorar em silêncio', () => {
    const extras: Record<string, unknown>[] = [
      { ...valido, user_id: 'user_2bob' },
      { ...valido, userId: 'user_2bob' },
      { ...valido, profile_visibility: 'public' },
      { ...valido, profileVisibility: 'public' },
      { ...valido, role: 'admin' },
      { ...valido, verified: true },
      { ...valido, id: 'perfil-9' },
    ]

    for (const entrada of extras) {
      expect(updateProfileSchema.safeParse(entrada).success).toBe(false)
    }
  })

  it('mantém a faixa de rating da constraint do banco', () => {
    expect(updateProfileSchema.safeParse({ ...valido, ratingEstimate: 99 }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ ...valido, ratingEstimate: 4001 }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ ...valido, ratingEstimate: 1500.5 }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ ...valido, ratingEstimate: null }).success).toBe(true)
  })

  it('recusa display name vazio, longo demais ou com caractere de controle', () => {
    expect(updateProfileSchema.safeParse({ ...valido, displayName: '   ' }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ ...valido, displayName: 'x'.repeat(41) }).success).toBe(
      false,
    )
    expect(
      updateProfileSchema.safeParse({ ...valido, displayName: `Vecola${BEL}admin` }).success,
    ).toBe(false)
    // Unicode legítimo continua permitido (seção 128).
    expect(updateProfileSchema.safeParse({ ...valido, displayName: 'Verônica ♞' }).success).toBe(
      true,
    )
  })

  it('também barra campo extra nas preferências', () => {
    expect(updateUserSettingsSchema.safeParse({ theme: 'escuro' }).success).toBe(true)
    expect(
      updateUserSettingsSchema.safeParse({ theme: 'escuro', user_id: 'user_2bob' }).success,
    ).toBe(false)
  })
})

describe('leitura de ambiente', () => {
  const AMBIENTE_OK: EnvSource = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://projeto.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pk_publica',
    SUPABASE_SECRET_KEY: 'sb_secret',
  }

  it('lê a configuração válida', () => {
    expect(readPublicEnv(AMBIENTE_OK).NEXT_PUBLIC_SUPABASE_URL).toBe('https://projeto.supabase.co')
    expect(readSecretEnv(AMBIENTE_OK).SUPABASE_SECRET_KEY).toBe('sb_secret')
  })

  it('falha no boot quando falta variável obrigatória', () => {
    expect(() => readSecretEnv({ ...AMBIENTE_OK, SUPABASE_SECRET_KEY: undefined })).toThrow(
      EnvConfigError,
    )
    expect(() => readPublicEnv({ ...AMBIENTE_OK, NEXT_PUBLIC_SUPABASE_URL: 'nao-e-url' })).toThrow(
      EnvConfigError,
    )
    expect(() =>
      readPublicEnv({ ...AMBIENTE_OK, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' }),
    ).toThrow(EnvConfigError)
  })

  it('não coloca valor de variável na mensagem de erro', () => {
    const erro = capturarErro(() =>
      readSecretEnv({ ...AMBIENTE_OK, SUPABASE_SECRET_KEY: undefined }),
    )

    expect(erro).toBeInstanceOf(EnvConfigError)
    const mensagem = (erro as EnvConfigError).message
    expect(mensagem).toContain('SUPABASE_SECRET_KEY')
    expect(mensagem).not.toContain('clerk_secret')
    expect(mensagem).not.toContain('pk_publica')
  })

  it('derruba a configuração quando um segredo aparece com prefixo público', () => {
    const expostas: EnvSource[] = [
      { ...AMBIENTE_OK, NEXT_PUBLIC_SUPABASE_SECRET_KEY: 'sb_secret' },
      { ...AMBIENTE_OK, NEXT_PUBLIC_SUPABASE_SECRET_KEY: 'sb_secret' },
      { ...AMBIENTE_OK, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'sb_service' },
      { ...AMBIENTE_OK, NEXT_PUBLIC_DB_PASSWORD: 'senha' },
    ]

    for (const ambiente of expostas) {
      expect(() => assertNoPublicSecrets(ambiente)).toThrow(EnvConfigError)
      expect(() => readPublicEnv(ambiente)).toThrow(EnvConfigError)
      expect(() => readSecretEnv(ambiente)).toThrow(EnvConfigError)
    }
  })

  it('aceita as variáveis públicas legítimas da seção 41', () => {
    expect(() => assertNoPublicSecrets(AMBIENTE_OK)).not.toThrow()
  })
})
