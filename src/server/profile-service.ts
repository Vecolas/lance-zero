import 'server-only'

/**
 * Composição de produção da camada de perfil.
 *
 * Aqui — e só aqui — a DAL testável encontra o Supabase de verdade. As funções
 * exportadas são as que Server Components e Server Actions devem chamar
 * (seção 23):
 *
 * ```ts
 * const perfil = await getMyProfile(session)
 * ```
 *
 * A assinatura repete a regra da DAL: a identidade entra pela SESSÃO. Não
 * existe parâmetro `userId` em nenhuma função pública deste arquivo, então não
 * existe onde encaixar o `user_id` da vítima (seções 27 e 28).
 *
 * Cada chamada monta um cliente novo com o JWT daquela sessão. É de propósito:
 * cliente de longa vida compartilhado entre requisições é como o token de um
 * usuário acaba servindo a consulta de outro.
 */

import { createProfileDal, type AuthSession, type ProfileDal } from '@/server/profile-dal'
import { createSupabaseProfileStore } from '@/server/profile-store-supabase'
import { createAnonClient, createUserClient } from '@/server/supabase'
import type { ProfileDto, PublicProfileDto, UserSettingsDto } from '@/server/dto'

/**
 * DAL ligada ao usuário da sessão. Falha fechado antes de qualquer I/O: sessão
 * ausente ou sem token não chega a criar cliente nem a tocar o banco.
 */
function dalParaSessao(session: AuthSession | null | undefined): ProfileDal {
  if (!session || typeof session.token !== 'string' || session.token.length === 0) {
    // Store que nega tudo. A DAL rejeita a sessão inválida antes de usá-lo;
    // isto existe para o caso de alguém, um dia, inverter a ordem lá dentro.
    return createProfileDal({
      store: {
        findProfileByUserId: async () => ({ ok: false, error: 'sessão ausente' }),
        updateProfileByUserId: async () => ({ ok: false, error: 'sessão ausente' }),
        findPublicProfileByUsername: async () => ({ ok: false, error: 'sessão ausente' }),
        findSettingsByUserId: async () => ({ ok: false, error: 'sessão ausente' }),
        updateSettingsByUserId: async () => ({ ok: false, error: 'sessão ausente' }),
      },
    })
  }

  return createProfileDal({ store: createSupabaseProfileStore(createUserClient(session.token)) })
}

export function getMyProfile(session: AuthSession | null | undefined): Promise<ProfileDto | null> {
  return dalParaSessao(session).getMyProfile(session)
}

export function updateMyProfile(
  session: AuthSession | null | undefined,
  entrada: unknown,
): Promise<ProfileDto> {
  return dalParaSessao(session).updateMyProfile(session, entrada)
}

export function getMySettings(
  session: AuthSession | null | undefined,
): Promise<UserSettingsDto | null> {
  return dalParaSessao(session).getMySettings(session)
}

export function updateMySettings(
  session: AuthSession | null | undefined,
  entrada: unknown,
): Promise<UserSettingsDto> {
  return dalParaSessao(session).updateMySettings(session, entrada)
}

/**
 * Perfil público: sem sessão, com cliente do próprio visitante quando houver.
 * Usa o cliente anônimo, que continua sujeito à RLS — a policy pública é que
 * decide o que existe para quem não está logado.
 */
export function getPublicProfile(
  username: unknown,
  session?: AuthSession | null,
): Promise<PublicProfileDto | null> {
  const client = session && session.token ? createUserClient(session.token) : createAnonClient()
  return createProfileDal({ store: createSupabaseProfileStore(client) }).getPublicProfile(username)
}
