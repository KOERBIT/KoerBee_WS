import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import Anthropic from '@anthropic-ai/sdk'
import { authOptions } from '@/lib/auth'
import { getAnthropicConfigForUser } from '@/lib/anthropic/config'

export const dynamic = 'force-dynamic'

// Verbindungstest: prüft den API-Key (Modell-Liste abrufen, kostenlos, ohne Tokens).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { apiKey?: unknown } = {}
  try { body = await req.json() } catch { /* gespeicherten Key testen */ }

  let apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  if (!apiKey) {
    const cfg = await getAnthropicConfigForUser(session.user.id)
    if (!cfg) return NextResponse.json({ ok: false, error: 'not_configured' })
    apiKey = cfg.apiKey
  }

  try {
    const client = new Anthropic({ apiKey })
    await client.models.list({ limit: 1 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'auth_failed' })
  }
}
