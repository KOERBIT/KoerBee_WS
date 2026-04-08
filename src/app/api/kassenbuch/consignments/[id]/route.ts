import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const consignment = await prisma.consignment.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { product: true } }, commissionStore: true },
  })
  if (!consignment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const { status, items } = await req.json()

  // Beim Abrechnen: Lagerprüfung für soldQuantity
  if (status === 'settled' && consignment.status !== 'settled') {
    const itemsToSettle = items as { id: string; soldQuantity?: number; returnedQuantity?: number }[] | undefined
    const stockErrors: { productId: string; productName: string; requested: number; available: number }[] = []

    for (const ci of consignment.items) {
      const update = itemsToSettle?.find(i => i.id === ci.id)
      const soldQty = update?.soldQuantity ?? ci.soldQuantity
      if (soldQty > ci.product.stockQuantity) {
        stockErrors.push({
          productId: ci.productId,
          productName: ci.product.name,
          requested: soldQty,
          available: ci.product.stockQuantity,
        })
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })
    }
  }

  let updated: Awaited<ReturnType<typeof prisma.consignment.update>>
  try {
  updated = await prisma.$transaction(async (tx) => {
    const cons = await tx.consignment.update({
      where: { id },
      data: {
        status: status ?? consignment.status,
        ...(items && {
          items: {
            updateMany: (items as { id: string; soldQuantity?: number; returnedQuantity?: number }[]).map(i => ({
              where: { id: i.id },
              data: {
                ...(i.soldQuantity != null && { soldQuantity: i.soldQuantity }),
                ...(i.returnedQuantity != null && { returnedQuantity: i.returnedQuantity }),
              },
            })),
          },
        }),
      },
      include: { items: { include: { product: true } }, customer: true, commissionStore: true },
    })

    // Auto-Sale + Lagerabzug beim Abrechnen
    if (status === 'settled' && consignment.status !== 'settled') {
      const soldItems = cons.items.filter(i => i.soldQuantity > 0)
      if (soldItems.length > 0) {
        // Re-check stock inside transaction to prevent TOCTOU race
        const productIds = soldItems.map(i => i.productId)
        const freshProducts = await tx.product.findMany({ where: { id: { in: productIds } } })
        for (const i of soldItems) {
          const fp = freshProducts.find(p => p.id === i.productId)
          const soldQty = Math.round(i.soldQuantity) // soldQuantity is Float — round to Int for stock
          if (!fp || soldQty > fp.stockQuantity) {
            throw new Error(`insufficient_stock:${i.productId}`)
          }
        }

        const total = soldItems.reduce((sum, i) => sum + i.soldQuantity * i.price, 0)
        await tx.sale.create({
          data: {
            userId: session.user.id,
            date: new Date(),
            customerName: cons.commissionStore?.name || cons.locationName,
            customerId: cons.customerId,
            notes: cons.locationName ? `Via Kommission: ${cons.locationName}` : 'Via Kommission',
            total,
            items: {
              create: soldItems.map(i => ({
                productId: i.productId,
                quantity: i.soldQuantity,
                price: i.price,
                total: i.soldQuantity * i.price,
              })),
            },
          },
        })

        await Promise.all(soldItems.map(i =>
          tx.product.update({
            where: { id: i.productId },
            data: { stockQuantity: { decrement: Math.round(i.soldQuantity) } },
          })
        ))
      }
    }

    return cons
  })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.startsWith('insufficient_stock:')) {
      return NextResponse.json({ error: 'insufficient_stock', productId: msg.split(':')[1] }, { status: 409 })
    }
    return NextResponse.json({ error: 'Fehler beim Abrechnen' }, { status: 500 })
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const consignment = await prisma.consignment.findFirst({ where: { id, userId: session.user.id } })
  if (!consignment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  await prisma.consignment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
