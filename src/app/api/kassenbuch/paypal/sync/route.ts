import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAccessToken, searchTransactions, paypalConfigured } from '@/lib/paypal/client'
import { performSync, mapTransaction, MappedTransaction } from '@/lib/paypal/sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!paypalConfigured()) {
    return NextResponse.json({ error: 'paypal_not_configured' }, { status: 503 })
  }

  const userId = session.user.id
  const state = await prisma.payPalSyncState.findUnique({ where: { userId } })
  const fallbackDays = Number(process.env.PAYPAL_SYNC_FALLBACK_DAYS) || 31
  const now = new Date()

  try {
    const token = await getAccessToken()

    const { imported, newLastSyncedAt } = await performSync({
      now,
      lastSyncedAt: state?.lastSyncedAt ?? null,
      fallbackDays,
      fetchChunk: async (start, end) => {
        const raw = await searchTransactions(start, end, token)
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
  } catch {
    // Fehler → lastSyncedAt bleibt unverändert, kein Datenverlust beim nächsten Versuch
    return NextResponse.json({ error: 'sync_failed' }, { status: 502 })
  }
}
