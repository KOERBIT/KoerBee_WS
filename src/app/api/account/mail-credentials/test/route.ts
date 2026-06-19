import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { testMailConnection } from '@/lib/paypal/imap'
import { getMailConfigForUser } from '@/lib/paypal/mail-config'

export const dynamic = 'force-dynamic'

// Verbindungstest fürs Postfach: prüft IMAP-Login (gespeicherte oder im Body
// übergebene, noch ungespeicherte Zugangsdaten).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { imapHost?: unknown; imapPort?: unknown; imapUser?: unknown; imapPassword?: unknown } = {}
  try { body = await req.json() } catch { /* gespeicherte testen */ }

  const user = typeof body.imapUser === 'string' ? body.imapUser.trim() : ''
  const pass = typeof body.imapPassword === 'string' ? body.imapPassword.trim() : ''
  let cfg
  if (user && pass) {
    cfg = {
      host: (typeof body.imapHost === 'string' && body.imapHost.trim()) || 'imap.gmx.net',
      port: Number(body.imapPort) || 993,
      user, password: pass,
    }
  } else {
    cfg = await getMailConfigForUser(session.user.id)
  }
  if (!cfg) return NextResponse.json({ ok: false, error: 'not_configured' })

  const ok = await testMailConnection(cfg)
  return NextResponse.json({ ok })
}
