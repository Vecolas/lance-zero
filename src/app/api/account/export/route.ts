import { NextResponse, type NextRequest } from 'next/server'
import { exportAccountData } from '@/server/account-export'
import { getAuthSessionFromRequest } from '@/server/request-auth'

export async function GET(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const result = await exportAccountData(session)
  if (!result.ok) return NextResponse.json({ error: 'Não foi possível exportar.' }, { status: 500 })
  return NextResponse.json(result.data, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
