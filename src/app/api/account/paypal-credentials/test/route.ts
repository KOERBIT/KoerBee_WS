import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getAccessToken } from '@/lib/paypal/client'
import { getPayPalConfigForUser, normalizeBase, PAYPAL_SANDBOX, PAYPAL_LIVE } from '@/lib/paypal/config'

export const dynamic = 'force-dynamic'

// Verbindungstest: holt ein OAuth-Token mit den (gespeicherten oder im Body
// übergebenen, ungespeicherten) Credentials und meldet Erfolg/Fehler.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { clientId?: unknown; clientSecret?: unknown; apiBase?: unknown } = {}
  try { body = await req.json() } catch { /* leerer Body = gespeicherte Credentials testen */ }

  let cfg
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  const clientSecret = typeof body.clientSecret === 'string' ? body.clientSecret.trim() : ''
  if (clientId && clientSecret) {
    const base = normalizeBase(typeof body.apiBase === 'string' ? body.apiBase : undefined)
    if (base !== PAYPAL_SANDBOX && base !== PAYPAL_LIVE) {
      return NextResponse.json({ ok: false, error: 'invalid_api_base' }, { status: 400 })
    }
    cfg = { clientId, secret: clientSecret, base }
  } else {
    cfg = await getPayPalConfigForUser(session.user.id)
  }

  if (!cfg) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 200 })

  try {
    await getAccessToken(cfg)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'auth_failed' }, { status: 200 })
  }
}
