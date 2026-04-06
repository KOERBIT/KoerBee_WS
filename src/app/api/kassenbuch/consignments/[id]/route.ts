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
    include: { items: { include: { product: true } } },
  })
  if (!consignment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const { status, items } = await req.json()

  const updated = await prisma.consignment.update({
    where: { id },
    data: {
      status: status ?? consignment.status,
      ...(items && {
        items: {
          updateMany: items.map((i: { id: string; soldQuantity?: number; returnedQuantity?: number }) => ({
            where: { id: i.id },
            data: {
              ...(i.soldQuantity != null && { soldQuantity: i.soldQuantity }),
              ...(i.returnedQuantity != null && { returnedQuantity: i.returnedQuantity }),
            },
          })),
        },
      }),
    },
    include: { items: { include: { product: true } }, customer: true },
  })

  // Auto-Sale: nur beim Übergang auf 'settled'
  if (status === 'settled' && consignment.status !== 'settled') {
    const soldItems = updated.items.filter(i => i.soldQuantity > 0)
    if (soldItems.length > 0) {
      const total = soldItems.reduce((sum, i) => sum + i.soldQuantity * i.price, 0)
      await prisma.sale.create({
        data: {
          userId: session.user.id,
          date: new Date(),
          customerName: updated.locationName,
          customerId: updated.customerId,
          notes: `Via Kommission: ${updated.locationName ?? ''}`.trim().replace(/:\s*$/, ''),
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
    }
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
