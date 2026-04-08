import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const consignments = await prisma.consignment.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { product: true } }, customer: true, commissionStore: true },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(consignments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { locationName, customerId, date, notes, items, commissionStoreId } = await req.json()
  if (!items || items.length === 0) return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })

  const consignment = await prisma.consignment.create({
    data: {
      locationName: locationName || null,
      customerId: customerId || null,
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
      userId: session.user.id,
      commissionStoreId: commissionStoreId || null,
      items: {
        create: items.map((i: { productId: string; quantity: number; price: number }) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
        })),
      },
    },
    include: { items: { include: { product: true } }, customer: true, commissionStore: true },
  })
  return NextResponse.json(consignment, { status: 201 })
}
