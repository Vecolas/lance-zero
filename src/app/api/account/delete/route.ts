import { NextResponse, type NextRequest } from 'next/server'
import { deleteAccount } from '@/server/account-deletion'
import { getAuthSessionFromRequest } from '@/server/request-auth'

export async function DELETE(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Confirmação inválida.' }, { status: 400 })
  }
  const confirmation =
    body && typeof body === 'object' && 'confirmation' in body
      ? (body as { confirmation?: unknown }).confirmation
      : undefined
  const result = await deleteAccount(session, confirmation)
  if (!result.ok) {
    const status =
      result.code === 'confirmation-required' ? 400 : result.code === 'unauthorized' ? 401 : 500
    return NextResponse.json({ error: result.code }, { status })
  }
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
