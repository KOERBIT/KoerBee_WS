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

  const total = items.reduce((sum: number, i: { quantity: number; price: number }) => sum + i.quantity * i.price, 0)

  const sale = await prisma.sale.create({
    data: {
      customerName: customerName || null,
      customerId: customerId || null,
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
      total,
      userId: session.user.id,
      items: {
        create: items.map((i: { productId: string; quantity: number; price: number }) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
          total: i.quantity * i.price,
        })),
      },
    },
    include: { items: { include: { product: true } }, customer: true },
  })
  return NextResponse.json(sale, { status: 201 })
}
