import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAccessToken, searchTransactions } from '@/lib/paypal/client'
import { getPayPalConfigForUser } from '@/lib/paypal/config'
import { performSync, mapTransaction, MappedTransaction } from '@/lib/paypal/sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const cfg = await getPayPalConfigForUser(userId)
  if (!cfg) return NextResponse.json({ error: 'paypal_not_configured' }, { status: 503 })

  const state = await prisma.payPalSyncState.findUnique({ where: { userId } })
  const fallbackDays = Number(process.env.PAYPAL_SYNC_FALLBACK_DAYS) || 31
  const now = new Date()

  try {
    const token = await getAccessToken(cfg)

    const { imported, newLastSyncedAt } = await performSync({
      now,
      lastSyncedAt: state?.lastSyncedAt ?? null,
      fallbackDays,
      fetchChunk: async (start, end) => {
        const raw = await searchTransactions(cfg.base, start, end, token)
        return raw
          .map(mapTransaction)
          .filter((t): t is MappedTransaction => t !== null)
      },
      upsert: async (txns) => {
        let created = 0
        for (const t of txns) {
          const existing = await prisma.payPalTransaction.findUnique({
            where: { userId_transactionId: { userId, transactionId: t.transactionId } },
          })
          if (existing) {
            // Stammdaten aktualisieren, Workflow-Status (new/ignored/linked) NICHT überschreiben
            await prisma.payPalTransaction.update({
              where: { id: existing.id },
              data: {
                date: t.date, amount: t.amount, currency: t.currency,
                payerName: t.payerName, payerEmail: t.payerEmail, paypalStatus: t.paypalStatus,
              },
            })
          } else {
            await prisma.payPalTransaction.create({ data: { ...t, userId } })
            created++
          }
        }
        return created
      },
    })

    // lastSyncedAt NUR nach erfolgreichem Abruf fortschreiben
    await prisma.payPalSyncState.upsert({
      where: { userId },
      create: { userId, lastSyncedAt: newLastSyncedAt },
      update: { lastSyncedAt: newLastSyncedAt },
    })

    return NextResponse.json({ imported, lastSyncedAt: newLastSyncedAt })
  } catch (err) {
    // Fehler → lastSyncedAt bleibt unverändert, kein Datenverlust beim nächsten Versuch
    console.error('[paypal sync]', err)
    const msg = err instanceof Error ? err.message : ''
    let code = 'sync_failed'
    let detail: string | undefined
    if (msg.startsWith('paypal_search_failed:')) {
      detail = msg.slice('paypal_search_failed:'.length)
      if (detail.startsWith('403')) code = 'transaction_search_not_enabled'
    } else if (msg.startsWith('paypal_auth_failed')) {
      code = 'auth_failed'
      detail = msg.includes(':') ? msg.slice(msg.indexOf(':') + 1) : undefined
    }
    return NextResponse.json({ error: code, detail }, { status: 502 })
  }
}
