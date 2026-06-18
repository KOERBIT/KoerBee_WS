import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface LinkItem { productId: string; quantity: number }

// Verknüpft eine PayPal-Zahlung mit einem Verkauf: entweder Direktverkauf
// (Sale + Lagerabzug) oder Bezug zu einer Kommission (soldQuantity buchen).
// Der eingegangene PayPal-Betrag gewinnt als Sale.total.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { id } = await params

  const txn = await prisma.payPalTransaction.findFirst({ where: { id, userId } })
  if (!txn) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (txn.status === 'linked') return NextResponse.json({ error: 'already_linked' }, { status: 409 })
  if (txn.amount <= 0) return NextResponse.json({ error: 'invalid_amount' }, { status: 422 })

  let body: { mode?: string; items?: unknown; customerName?: string; consignmentId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const mode: 'sale' | 'consignment' = body.mode === 'consignment' ? 'consignment' : 'sale'
  const rawItems = Array.isArray(body.items) ? body.items : []
  const items: LinkItem[] = rawItems
    .map((i: { productId?: unknown; quantity?: unknown }) => ({ productId: String(i.productId ?? ''), quantity: Number(i.quantity) }))
    .filter(i => i.productId && Number.isFinite(i.quantity) && i.quantity > 0)
  if (items.length === 0) return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })
  if (items.some(i => !Number.isInteger(i.quantity))) return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 })
  const customerName: string | null = body.customerName || txn.payerName || null

  // Produkte des Users laden + Fremdzugriff verhindern (IDOR)
  const productIds = items.map(i => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, userId } })
  for (const it of items) {
    if (!products.find(p => p.id === it.productId)) {
      return NextResponse.json({ error: 'product_not_found', productId: it.productId }, { status: 422 })
    }
  }

  const expected = items.reduce((s, it) => {
    const p = products.find(pr => pr.id === it.productId)!
    return s + it.quantity * p.price
  }, 0)
  const mismatch = Math.abs(expected - txn.amount) > 0.01

  // Atomarer Statuswechsel: verhindert Doppelbuchung bei parallelen Requests.
  async function claim(tx: Prisma.TransactionClient): Promise<void> {
    const res = await tx.payPalTransaction.updateMany({
      where: { id, userId, status: { not: 'linked' } },
      data: { status: 'linked' },
    })
    if (res.count === 0) throw new Error('already_linked')
  }

  function saleItemsData() {
    return items.map(it => {
      const p = products.find(pr => pr.id === it.productId)!
      return { productId: it.productId, quantity: it.quantity, price: p.price, total: it.quantity * p.price }
    })
  }

  try {
    if (mode === 'sale') {
      const stockErrors = items
        .map(it => ({ it, p: products.find(pr => pr.id === it.productId)! }))
        .filter(({ it, p }) => it.quantity > p.stockQuantity)
        .map(({ it, p }) => ({ productId: p.id, productName: p.name, requested: it.quantity, available: p.stockQuantity }))
      if (stockErrors.length > 0) return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })

      const sale = await prisma.$transaction(async (tx) => {
        await claim(tx) // zuerst beanspruchen → kein Doppel-Link
        const fresh = await tx.product.findMany({ where: { id: { in: productIds } } })
        for (const it of items) {
          const fp = fresh.find(p => p.id === it.productId)
          if (!fp || it.quantity > fp.stockQuantity) throw new Error(`insufficient_stock:${it.productId}`)
        }
        const created = await tx.sale.create({
          data: {
            userId, date: txn.date, customerName,
            total: txn.amount, // PayPal-Betrag gewinnt
            notes: `Via PayPal: ${txn.transactionId}`,
            items: { create: saleItemsData() },
          },
        })
        for (const it of items) {
          await tx.product.update({ where: { id: it.productId }, data: { stockQuantity: { decrement: it.quantity } } })
        }
        await tx.payPalTransaction.update({ where: { id }, data: { saleId: created.id } })
        return created
      })
      return NextResponse.json({ sale, mismatch, expected, paid: txn.amount })
    }

    // mode === 'consignment'
    const consignmentId: string | undefined = body.consignmentId
    if (!consignmentId) return NextResponse.json({ error: 'consignment_required' }, { status: 400 })
    const consignment = await prisma.consignment.findFirst({
      where: { id: consignmentId, userId },
      include: { items: { include: { product: true } }, commissionStore: true },
    })
    if (!consignment) return NextResponse.json({ error: 'Kommission nicht gefunden' }, { status: 404 })

    const resolved: { ciId: string; productId: string; quantity: number }[] = []
    const openErrors: { productName: string; requested: number; open: number }[] = []
    const stockErrors: { productName: string; requested: number; available: number }[] = []
    for (const it of items) {
      const ci = consignment.items.find(c => c.productId === it.productId)
      if (!ci) return NextResponse.json({ error: 'not_in_consignment', productId: it.productId }, { status: 422 })
      const open = ci.quantity - ci.soldQuantity - ci.returnedQuantity
      if (it.quantity > open + 1e-9) openErrors.push({ productName: ci.product.name, requested: it.quantity, open })
      if (it.quantity > ci.product.stockQuantity) stockErrors.push({ productName: ci.product.name, requested: it.quantity, available: ci.product.stockQuantity })
      resolved.push({ ciId: ci.id, productId: it.productId, quantity: it.quantity })
    }
    if (openErrors.length > 0) return NextResponse.json({ error: 'exceeds_open', items: openErrors }, { status: 409 })
    if (stockErrors.length > 0) return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })

    const sale = await prisma.$transaction(async (tx) => {
      await claim(tx)
      const fresh = await tx.product.findMany({ where: { id: { in: productIds } } })
      for (const r of resolved) {
        const fp = fresh.find(p => p.id === r.productId)
        if (!fp || r.quantity > fp.stockQuantity) throw new Error(`insufficient_stock:${r.productId}`)
      }
      const created = await tx.sale.create({
        data: {
          userId, date: txn.date,
          customerName: customerName || consignment.commissionStore?.name || consignment.locationName,
          commissionStoreId: consignment.commissionStoreId,
          consignmentId: consignment.id,
          total: txn.amount, // PayPal-Betrag gewinnt
          notes: `Via PayPal: ${txn.transactionId}`,
          items: { create: saleItemsData() },
        },
      })
      for (const r of resolved) {
        await tx.consignmentItem.update({ where: { id: r.ciId }, data: { soldQuantity: { increment: r.quantity } } })
        await tx.product.update({ where: { id: r.productId }, data: { stockQuantity: { decrement: r.quantity } } })
      }
      const fullyClosed = consignment.items.every(ci => {
        const sold = ci.soldQuantity + (resolved.find(r => r.ciId === ci.id)?.quantity ?? 0)
        return sold + ci.returnedQuantity >= ci.quantity - 1e-9
      })
      await tx.consignment.update({ where: { id: consignment.id }, data: { status: fullyClosed ? 'settled' : consignment.status } })
      await tx.payPalTransaction.update({ where: { id }, data: { saleId: created.id, consignmentId: consignment.id } })
      return created
    })
    return NextResponse.json({ sale, mismatch, expected, paid: txn.amount })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'already_linked') return NextResponse.json({ error: 'already_linked' }, { status: 409 })
    if (msg.startsWith('insufficient_stock:')) {
      return NextResponse.json({ error: 'insufficient_stock', productId: msg.split(':')[1] }, { status: 409 })
    }
    return NextResponse.json({ error: 'link_failed' }, { status: 500 })
  }
}
