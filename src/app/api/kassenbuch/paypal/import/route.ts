import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { parsePayPalCsv } from '@/lib/paypal/csv'
import { upsertPayPalTransactions } from '@/lib/paypal/persist'

export const dynamic = 'force-dynamic'

// Importiert den PayPal-Aktivitäten-CSV-Export (funktioniert auch mit Privatkonten).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const text = await req.text()
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'empty_file' }, { status: 400 })
  }

  const { transactions, skipped, total } = parsePayPalCsv(text)
  if (total === 0) {
    return NextResponse.json({ error: 'no_rows', detail: 'Keine Datenzeilen erkannt – ist das die PayPal-CSV?' }, { status: 400 })
  }

  const imported = await upsertPayPalTransactions(session.user.id, transactions)
  return NextResponse.json({ imported, recognized: transactions.length, skipped, total })
}
