import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sales = await prisma.sale.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } }, customer: true, commissionStore: true, receipt: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(sales)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const { customerName, customerEmail, customerId, date, notes, items: rawItems } = body ?? {}
  if (!Array.isArray(rawItems) || rawItems.length === 0) return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })

  // Positionen prüfen: ganze Stückzahl > 0, Preis >= 0; doppelte Produkte zusammenfassen
  const merged = new Map<string, { productId: string; quantity: number; price: number }>()
  for (const raw of rawItems) {
    const q = raw?.quantity
    const p = raw?.price
    if (typeof raw?.productId !== 'string' || !Number.isInteger(q) || q <= 0 || typeof p !== 'number' || !Number.isFinite(p) || p < 0) {
      return NextResponse.json({ error: 'invalid_item' }, { status: 422 })
    }
    const key = `${raw.productId}|${p}`
    const prev = merged.get(key)
    if (prev) prev.quantity += q
    else merged.set(key, { productId: raw.productId, quantity: q, price: p })
  }
  const items = [...merged.values()]

  const saleDate = date ? new Date(date) : new Date()
  if (isNaN(saleDate.getTime())) return NextResponse.json({ error: 'invalid_date' }, { status: 422 })

  // Optionale E-Mail leicht validieren (leer = keine).
  const email = typeof customerEmail === 'string' ? customerEmail.trim() : ''
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 422 })
  }

  // Fremder Kunde? (IDOR-Schutz)
  if (customerId && !(await prisma.customer.findFirst({ where: { id: customerId, userId: session.user.id } }))) {
    return NextResponse.json({ error: 'invalid_customer' }, { status: 422 })
  }

  // Lagerprüfung
  const productIds = items.map(i => i.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, userId: session.user.id },
  })

  const typedItems = items
  const requestedByProduct = new Map<string, number>()
  for (const i of typedItems) requestedByProduct.set(i.productId, (requestedByProduct.get(i.productId) ?? 0) + i.quantity)

  const stockErrors: { productId: string; productName: string; requested: number; available: number }[] = []
  for (const item of typedItems) {
    const product = products.find(p => p.id === item.productId)
    if (!product) {
      return NextResponse.json({ error: 'product_not_found', productId: item.productId }, { status: 422 })
    }
    const requested = requestedByProduct.get(item.productId) ?? item.quantity
    if (requested > product.stockQuantity) {
      stockErrors.push({
        productId: product.id,
        productName: product.name,
        requested,
        available: product.stockQuantity,
      })
    }
  }

  if (stockErrors.length > 0) {
    return NextResponse.json({ error: 'insufficient_stock', items: stockErrors }, { status: 409 })
  }

  // Atomare Transaktion: Sale erstellen + Lager abziehen
  const cents = (n: number) => Math.round(n * 100) / 100
  const total = cents(typedItems.reduce((sum, i) => sum + i.quantity * i.price, 0))

  try {
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        customerName: customerName || null,
        customerEmail: email || null,
        customerId: customerId || null,
        date: saleDate,
        notes: notes || null,
        total,
        userId: session.user.id,
        items: {
          create: typedItems.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            total: cents(i.quantity * i.price),
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    })

    // Bestand atomar prüfen + abziehen (schützt vor parallelen Verkäufen)
    for (const [productId, qty] of requestedByProduct) {
      const res = await tx.product.updateMany({
        where: { id: productId, userId: session.user.id, stockQuantity: { gte: qty } },
        data: { stockQuantity: { decrement: qty } },
      })
      if (res.count === 0) throw new Error('insufficient_stock')
    }

    return created
  })

  return NextResponse.json(sale, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message === 'insufficient_stock') {
      return NextResponse.json({ error: 'insufficient_stock', items: [] }, { status: 409 })
    }
    return NextResponse.json({ error: 'Fehler beim Speichern des Verkaufs' }, { status: 500 })
  }
}
