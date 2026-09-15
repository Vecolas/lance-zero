import { NextResponse, type NextRequest } from 'next/server'
import { getAuthSessionFromRequest } from '@/server/request-auth'
import { createUserClient } from '@/server/supabase'

const MAX_RAW_BYTES = 8 * 1024 * 1024
const MAX_DEVICE_LABEL = 40

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.payload)) return 'payload deve ser um objeto.'
  if (
    typeof value.schemaVersion !== 'number' ||
    !Number.isInteger(value.schemaVersion) ||
    value.schemaVersion < 1
  )
    return 'schemaVersion inválido.'
  if (
    value.deviceLabel !== null &&
    value.deviceLabel !== undefined &&
    (typeof value.deviceLabel !== 'string' ||
      value.deviceLabel.length < 1 ||
      value.deviceLabel.length > MAX_DEVICE_LABEL)
  )
    return 'deviceLabel inválido.'
  return null
}

export async function GET(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const { data, error } = await createUserClient(session.token)
    .from('user_state')
    .select('payload, schema_version, device_label, updated_at')
    .eq('user_id', session.userId)
    .maybeSingle()
  if (error)
    return NextResponse.json({ error: 'Não foi possível ler a sincronização.' }, { status: 500 })
  return NextResponse.json(
    data
      ? {
          payload: data.payload,
          schemaVersion: data.schema_version,
          deviceLabel: data.device_label,
          updatedAt: data.updated_at,
        }
      : null,
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export async function PUT(request: NextRequest) {
  const session = await getAuthSessionFromRequest(request)
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  const raw = await request.text()
  if (new TextEncoder().encode(raw).byteLength > MAX_RAW_BYTES)
    return NextResponse.json({ error: 'Estado grande demais.' }, { status: 413 })
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }
  const problem = invalid(body)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  const value = body as {
    payload: Record<string, unknown>
    schemaVersion: number
    deviceLabel?: string | null
  }
  const { data, error } = await createUserClient(session.token)
    .from('user_state')
    .upsert(
      {
        user_id: session.userId,
        payload: value.payload,
        schema_version: value.schemaVersion,
        device_label: value.deviceLabel ?? null,
      },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single()
  if (error) return NextResponse.json({ error: 'Não foi possível sincronizar.' }, { status: 500 })
  return NextResponse.json(
    { updatedAt: data.updated_at },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
