import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopCustomerFromRequest } from '@/lib/shop/auth'
import { sendOrderStatusEmail } from '@/lib/shop/mail'

export async function GET(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const orders = await prisma.preOrder.findMany({
    where: { shopCustomerId: customer.id },
    include: {
      items: { include: { product: { select: { name: true, shopName: true, unit: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { items, note } = await req.json() as {
    items: Array<{ productId: string; quantity: number }>
    note?: string
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items_required' }, { status: 400 })
  }

  // Validate products exist and are shop-visible, get current prices
  const productIds = items.map((i) => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, shopVisible: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const orderItems: Array<{ productId: string; quantity: number; priceAtOrder: number }> = []
  for (const item of items) {
    const product = productMap.get(item.productId)
    if (!product) {
      return NextResponse.json({ error: `product_not_found: ${item.productId}` }, { status: 400 })
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
      return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 })
    }
    orderItems.push({
      productId: product.id,
      quantity: item.quantity,
      priceAtOrder: product.shopPrice ?? product.price,
    })
  }

  const order = await prisma.preOrder.create({
    data: {
      shopCustomerId: customer.id,
      note: note ?? null,
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shopCustomer: { select: { email: true, name: true, locale: true } },
    },
  })

  // Send confirmation email (best-effort)
  try {
    const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
    if (admin) {
      await sendOrderStatusEmail({ userId: admin.id, order, newStatus: 'PENDING' })
    }
  } catch (e) {
    console.error('Failed to send order confirmation email:', e)
  }

  return NextResponse.json(order, { status: 201 })
}
