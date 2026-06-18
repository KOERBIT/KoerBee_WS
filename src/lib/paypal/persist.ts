import { prisma } from '@/lib/prisma'
import { MappedTransaction } from './sync'

/**
 * Speichert Transaktionen mit Dedup über (userId, transactionId). Stammdaten
 * bestehender Einträge werden aktualisiert, der Workflow-Status
 * (new/ignored/linked) bleibt unangetastet. Liefert die Anzahl NEU angelegter.
 */
export async function upsertPayPalTransactions(userId: string, txns: MappedTransaction[]): Promise<number> {
  let created = 0
  for (const t of txns) {
    const existing = await prisma.payPalTransaction.findUnique({
      where: { userId_transactionId: { userId, transactionId: t.transactionId } },
    })
    if (existing) {
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
}
