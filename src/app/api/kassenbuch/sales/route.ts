import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sales = await prisma.sale.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } }, customer: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(sales)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { customerName, customerId, date, notes, items } = await req.json()
  if (!items || items.length === 0) return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })

  // Lagerprüfung
  const productIds = items.map((i: { productId: string }) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, userId: session.user.id },
  })

  type SaleItem = { productId: string; quantity: number; price: number }
  const typedItems = items as SaleItem[]

  const stockErrors: { productId: string; productName: string; requested: number; available: number }[] = []
  for (const item of typedItems) {
    const product = products.find(p => p.id === item.productId)
    if (!product) {
      return NextResponse.json({ error: 'product_not_found', productId: item.productId }, { status: 422 })
    }
    if (item.quantity > product.stockQuantity) {
      stockErrors.push({
        productId: product.id,
        productName: product.name,
        requested: item.quantity,
        available: product.stockQuantity,
      })
    }
  }

  if (stockErrors.length > 0) {
    return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })
  }

  // Atomare Transaktion: Sale erstellen + Lager abziehen
  const total = typedItems.reduce((sum, i) => sum + i.quantity * i.price, 0)

  try {
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        customerName: customerName || null,
        customerId: customerId || null,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        total,
        userId: session.user.id,
        items: {
          create: (items as { productId: string; quantity: number; price: number }[]).map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            total: i.quantity * i.price,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    })

    for (const item of typedItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      })
    }

    return created
  })

  return NextResponse.json(sale, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Fehler beim Speichern des Verkaufs' }, { status: 500 })
  }
}
