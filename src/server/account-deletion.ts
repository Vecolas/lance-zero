import 'server-only'

import type { AuthSession } from '@/server/profile-dal'
import { createSecretClient } from '@/server/supabase'

const AVATAR_BUCKET = 'avatars'
const PAGE_SIZE = 100
const REMOVE_BATCH_SIZE = 100
/**
 * As frases que confirmam a exclusão — uma por idioma do produto.
 *
 * O QUE SE VALIDA AQUI É O ATO DELIBERADO DO ALUNO, e por isso a frase precisa
 * existir no idioma em que ele está lendo a tela. A alternativa era o cliente
 * traduzir a frase digitada para um token único antes de enviar; aí o servidor
 * passaria a validar um token que o cliente fabrica, e não o gesto de quem
 * escreveu "APAGAR CONTA" letra por letra — que é a única coisa que essa
 * checagem existe para exigir.
 *
 * `APAGAR CONTA` continua primeiro e continua aceita SEMPRE, inclusive para quem
 * está lendo em inglês: ela é a frase que já foi publicada, e qualquer script ou
 * anotação de quem usa o app hoje depende dela.
 */
const CONFIRMATIONS = ['APAGAR CONTA', 'DELETE ACCOUNT'] as const

type StorageObject = { name: string }

export type AccountDeletionResult =
  | { ok: true }
  | { ok: false; code: 'unauthorized' | 'confirmation-required' | 'storage-failed' | 'auth-failed' }

export interface AccountDeletionAdmin {
  listAvatarObjects(
    userId: string,
    options: { limit: number; offset: number },
  ): Promise<{ data: StorageObject[] | null; error: unknown }>
  removeAvatarObjects(paths: string[]): Promise<{ error: unknown }>
  deleteAuthUser(userId: string): Promise<{ error: unknown }>
}

function isSessionValida(session: AuthSession | null | undefined): session is AuthSession {
  return Boolean(
    session &&
    typeof session.userId === 'string' &&
    session.userId.trim() !== '' &&
    typeof session.token === 'string' &&
    session.token.trim() !== '',
  )
}

function pathsSegurosDoUsuario(userId: string, objetos: StorageObject[]): string[] | null {
  const caminhos: string[] = []

  for (const objeto of objetos) {
    if (
      typeof objeto.name !== 'string' ||
      objeto.name.length === 0 ||
      objeto.name.includes('/') ||
      objeto.name.includes('..')
    ) {
      return null
    }
    caminhos.push(`${userId}/${objeto.name}`)
  }

  return caminhos
}

async function limparAvatares(
  userId: string,
  admin: AccountDeletionAdmin,
): Promise<AccountDeletionResult> {
  while (true) {
    let resposta: { data: StorageObject[] | null; error: unknown }
    try {
      // Depois da remoção, os objetos seguintes ocupam o início da lista. Reler
      // com offset zero evita pular arquivos quando a página encolhe.
      resposta = await admin.listAvatarObjects(userId, { limit: PAGE_SIZE, offset: 0 })
    } catch {
      return { ok: false, code: 'storage-failed' }
    }

    if (resposta.error) return { ok: false, code: 'storage-failed' }
    const caminhos = pathsSegurosDoUsuario(userId, resposta.data ?? [])
    if (caminhos === null) return { ok: false, code: 'storage-failed' }

    for (let inicio = 0; inicio < caminhos.length; inicio += REMOVE_BATCH_SIZE) {
      const lote = caminhos.slice(inicio, inicio + REMOVE_BATCH_SIZE)
      try {
        const removidos = await admin.removeAvatarObjects(lote)
        if (removidos.error) return { ok: false, code: 'storage-failed' }
      } catch {
        return { ok: false, code: 'storage-failed' }
      }
    }

    if (caminhos.length < PAGE_SIZE) return { ok: true }
  }
}

export async function deleteAccount(
  session: AuthSession | null | undefined,
  confirmation: unknown,
  admin?: AccountDeletionAdmin,
): Promise<AccountDeletionResult> {
  if (!isSessionValida(session)) return { ok: false, code: 'unauthorized' }
  if (!CONFIRMATIONS.some((frase) => frase === confirmation))
    return { ok: false, code: 'confirmation-required' }

  // Só constrói o cliente privilegiado depois das guardas. Uma sessão inválida
  // nunca deve sequer tentar carregar configuração ou preparar admin client.
  const operador = admin ?? createSupabaseAccountDeletionAdmin()
  const storage = await limparAvatares(session.userId, operador)
  if (!storage.ok) return storage

  try {
    const removido = await operador.deleteAuthUser(session.userId)
    if (removido.error) return { ok: false, code: 'auth-failed' }
  } catch {
    return { ok: false, code: 'auth-failed' }
  }

  return { ok: true }
}

function createSupabaseAccountDeletionAdmin(): AccountDeletionAdmin {
  const client = createSecretClient()

  return {
    async listAvatarObjects(userId, options) {
      try {
        const { data, error } = await client.storage.from(AVATAR_BUCKET).list(userId, options)
        return { data: data?.map((item) => ({ name: item.name })) ?? null, error }
      } catch (error) {
        return { data: null, error }
      }
    },

    async removeAvatarObjects(paths) {
      try {
        const { error } = await client.storage.from(AVATAR_BUCKET).remove(paths)
        return { error }
      } catch (error) {
        return { error }
      }
    },

    async deleteAuthUser(userId) {
      try {
        const { error } = await client.auth.admin.deleteUser(userId, false)
        return { error }
      } catch (error) {
        return { error }
      }
    },
  }
}
