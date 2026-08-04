import { prisma } from '@/lib/prisma'
import { renderSaleReceipt, formatReceiptNumber, PaymentMethod } from './render'

export const PAYMENT_METHODS: PaymentMethod[] = ['bar', 'ueberweisung']

export function normalizePaymentMethod(v: unknown): PaymentMethod {
  return v === 'ueberweisung' ? 'ueberweisung' : 'bar'
}

type SaleWithItems = {
  id: string
  date: Date
  customerName: string | null
  total: number
  notes: string | null
  items: { quantity: number; price: number; total: number; product: { name: string } }[]
}

/**
 * Stellt sicher, dass für den Verkauf eine Quittung (mit laufender Nummer) existiert.
 * Vergibt die nächste freie Nummer pro Nutzer und aktualisiert ggf. die Zahlart.
 */
export async function ensureReceipt(userId: string, saleId: string, paymentMethod?: PaymentMethod) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.saleReceipt.findUnique({ where: { saleId } })
    if (existing) {
      if (paymentMethod && paymentMethod !== existing.paymentMethod) {
        return tx.saleReceipt.update({ where: { saleId }, data: { paymentMethod } })
      }
      return existing
    }
    const max = await tx.saleReceipt.aggregate({ where: { userId }, _max: { number: true } })
    const number = (max._max.number ?? 0) + 1
    return tx.saleReceipt.create({
      data: { saleId, userId, number, paymentMethod: paymentMethod ?? 'bar' },
    })
  })
}

/** Rendert das Quittungs-HTML aus Verkaufsdaten + gespeicherter Quittung. */
export function renderReceiptHtml(
  sale: SaleWithItems,
  receipt: { number: number; paymentMethod: string },
): string {
  return renderSaleReceipt({
    number: receipt.number,
    date: sale.date,
    customerName: sale.customerName,
    items: sale.items.map(i => ({
      name: i.product.name,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
    })),
    total: sale.total,
    paymentMethod: normalizePaymentMethod(receipt.paymentMethod),
    notes: sale.notes,
  })
}

export function receiptFileName(number: number, date: Date): string {
  return `Quittung_${formatReceiptNumber(number, date)}.html`
}
