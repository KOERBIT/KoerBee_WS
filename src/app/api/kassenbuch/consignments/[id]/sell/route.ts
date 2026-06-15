import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Bucht einen (Teil-)Verkauf aus einer Kommission: zieht die verkaufte Menge
// von der offenen Menge ab, erstellt einen echten Verkauf (mit Bezug zu Name +
// Laden) und bucht das Lager ab.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const consignment = await prisma.consignment.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { product: true } }, commissionStore: true },
  })
  if (!consignment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { customerName, date, items } = await req.json()
  const requested = (items as { id: string; quantity: number; price: number }[] | undefined) ?? []
  const toSell = requested.filter(i => i.quantity > 0)
  if (toSell.length === 0) return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })

  // Validierung: offene Menge + Lagerbestand
  const stockErrors: { productName: string; requested: number; available: number }[] = []
  const openErrors: { productName: string; requested: number; open: number }[] = []
  const resolved: { item: (typeof consignment.items)[number]; quantity: number; price: number }[] = []

  for (const r of toSell) {
    const ci = consignment.items.find(i => i.id === r.id)
    if (!ci) return NextResponse.json({ error: 'position_not_found', id: r.id }, { status: 422 })
    const open = ci.quantity - ci.soldQuantity - ci.returnedQuantity
    if (r.quantity > open + 1e-9) {
      openErrors.push({ productName: ci.product.name, requested: r.quantity, open })
    }
    if (Math.round(r.quantity) > ci.product.stockQuantity) {
      stockErrors.push({ productName: ci.product.name, requested: r.quantity, available: ci.product.stockQuantity })
    }
    const price = typeof r.price === 'number' && r.price >= 0 ? r.price : ci.price
    resolved.push({ item: ci, quantity: r.quantity, price })
  }

  if (openErrors.length > 0) return NextResponse.json({ error: 'exceeds_open', items: openErrors }, { status: 409 })
  if (stockErrors.length > 0) return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })

  const total = resolved.reduce((s, r) => s + r.quantity * r.price, 0)
  const locationLabel = consignment.commissionStore?.name || consignment.locationName

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Lager erneut prüfen (TOCTOU-Schutz)
      const productIds = resolved.map(r => r.item.productId)
      const freshProducts = await tx.product.findMany({ where: { id: { in: productIds } } })
      for (const r of resolved) {
        const fp = freshProducts.find(p => p.id === r.item.productId)
        if (!fp || Math.round(r.quantity) > fp.stockQuantity) {
          throw new Error(`insufficient_stock:${r.item.productId}`)
        }
      }

      await tx.sale.create({
        data: {
          userId: session.user.id,
          date: date ? new Date(date) : new Date(),
          customerName: customerName || locationLabel || null,
          customerId: consignment.customerId,
          commissionStoreId: consignment.commissionStoreId,
          consignmentId: consignment.id,
          notes: locationLabel ? `Via Kommission: ${locationLabel}` : 'Via Kommission',
          total,
          items: {
            create: resolved.map(r => ({
              productId: r.item.productId,
              quantity: r.quantity,
              price: r.price,
              total: r.quantity * r.price,
            })),
          },
        },
      })

      for (const r of resolved) {
        await tx.consignmentItem.update({
          where: { id: r.item.id },
          data: { soldQuantity: { increment: r.quantity } },
        })
        await tx.product.update({
          where: { id: r.item.productId },
          data: { stockQuantity: { decrement: Math.round(r.quantity) } },
        })
      }

      // Status auf "settled" setzen, wenn nichts mehr offen ist
      const fullyClosed = consignment.items.every(ci => {
        const sold = ci.soldQuantity + (resolved.find(r => r.item.id === ci.id)?.quantity ?? 0)
        return sold + ci.returnedQuantity >= ci.quantity - 1e-9
      })

      return tx.consignment.update({
        where: { id: consignment.id },
        data: { status: fullyClosed ? 'settled' : consignment.status },
        include: { items: { include: { product: true } }, customer: true, commissionStore: true },
      })
    })

    return NextResponse.json(updated)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.startsWith('insufficient_stock:')) {
      return NextResponse.json({ error: 'insufficient_stock', productId: msg.split(':')[1] }, { status: 409 })
    }
    return NextResponse.json({ error: 'Fehler beim Buchen des Verkaufs' }, { status: 500 })
  }
}
