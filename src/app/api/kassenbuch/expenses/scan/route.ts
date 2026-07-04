import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getAnthropicConfigForUser } from '@/lib/anthropic/config'
import { extractReceipt, ALLOWED_RECEIPT_MIME } from '@/lib/anthropic/receipt'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Wertet ein Beleg-Foto/-PDF per Claude aus und liefert Betrag/Datum/Kategorie/Beschreibung.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = await getAnthropicConfigForUser(session.user.id)
  if (!cfg) return NextResponse.json({ error: 'anthropic_not_configured' }, { status: 503 })

  let body: { base64?: unknown; mimeType?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const base64 = typeof body.base64 === 'string' ? body.base64 : ''
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : ''
  if (!base64) return NextResponse.json({ error: 'no_file' }, { status: 400 })
  if (!ALLOWED_RECEIPT_MIME.includes(mimeType)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 })
  }

  try {
    const extracted = await extractReceipt(cfg, { base64, mimeType })
    return NextResponse.json(extracted)
  } catch (err) {
    console.error('[receipt scan]', err)
    return NextResponse.json({ error: 'scan_failed' }, { status: 502 })
  }
}
