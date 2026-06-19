import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { fetchPayPalEmails } from '@/lib/paypal/imap'
import { getMailConfigForUser } from '@/lib/paypal/mail-config'
import { upsertPayPalTransactions } from '@/lib/paypal/persist'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Liest PayPal-Eingangsmails aus dem hinterlegten Postfach (IMAP) und übernimmt
// sie als Zahlungen (Dedup über Transaktionscode).
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = await getMailConfigForUser(session.user.id)
  if (!cfg) return NextResponse.json({ error: 'mail_not_configured' }, { status: 503 })

  try {
    const { transactions, scanned } = await fetchPayPalEmails(cfg, 90)
    const imported = await upsertPayPalTransactions(session.user.id, transactions)
    return NextResponse.json({ imported, recognized: transactions.length, scanned })
  } catch (err) {
    console.error('[paypal fetch-emails]', err)
    return NextResponse.json({ error: 'mail_fetch_failed' }, { status: 502 })
  }
}
