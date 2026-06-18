import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { PAYPAL_SANDBOX, PAYPAL_LIVE, normalizeBase } from '@/lib/paypal/config'

// Liefert die hinterlegten PayPal-Einstellungen – OHNE das Secret.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const cred = await prisma.payPalCredential.findUnique({
    where: { userId: session.user.id },
    select: { clientId: true, apiBase: true, clientSecret: true, updatedAt: true },
  })
  const envFallback = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
  return NextResponse.json({
    clientId: cred?.clientId ?? '',
    apiBase: cred?.apiBase ?? PAYPAL_SANDBOX,
    hasSecret: !!cred?.clientSecret,
    source: cred?.clientId ? 'db' : envFallback ? 'env' : 'none',
    updatedAt: cred?.updatedAt ?? null,
  })
}

// Speichert clientId/apiBase und (optional) ein neues, verschlüsseltes Secret.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: { clientId?: unknown; clientSecret?: unknown; apiBase?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  const clientSecret = typeof body.clientSecret === 'string' ? body.clientSecret.trim() : ''
  const apiBase = normalizeBase(typeof body.apiBase === 'string' ? body.apiBase : undefined)

  if (!clientId) return NextResponse.json({ error: 'client_id_required' }, { status: 400 })
  // Base auf die bekannten Endpunkte beschränken (verhindert SSRF/Tippfehler)
  if (apiBase !== PAYPAL_SANDBOX && apiBase !== PAYPAL_LIVE) {
    return NextResponse.json({ error: 'invalid_api_base' }, { status: 400 })
  }

  const existing = await prisma.payPalCredential.findUnique({ where: { userId } })
  // Secret nur überschreiben, wenn eines eingegeben wurde; sonst bestehendes behalten.
  if (!clientSecret && !existing?.clientSecret) {
    return NextResponse.json({ error: 'client_secret_required' }, { status: 400 })
  }
  const encryptedSecret = clientSecret ? encrypt(clientSecret) : existing!.clientSecret

  await prisma.payPalCredential.upsert({
    where: { userId },
    create: { userId, clientId, clientSecret: encryptedSecret, apiBase },
    update: { clientId, clientSecret: encryptedSecret, apiBase },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.payPalCredential.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
