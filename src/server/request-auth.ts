import 'server-only'

import type { NextRequest } from 'next/server'
import type { AuthSession } from '@/server/profile-dal'
import { createUserClient } from '@/server/supabase'

/** Verifica o JWT no Supabase; nunca confia em user id vindo do corpo. */
export async function getAuthSessionFromRequest(
  request: NextRequest | Request,
): Promise<AuthSession | null> {
  const header = request.headers.get('authorization')
  if (!header || !/^Bearer\s+\S+$/i.test(header)) return null
  const token = header.replace(/^Bearer\s+/i, '').trim()
  try {
    const { data, error } = await createUserClient(token).auth.getUser(token)
    if (error || !data.user?.id) return null
    return { userId: data.user.id, token }
  } catch {
    return null
  }
}
