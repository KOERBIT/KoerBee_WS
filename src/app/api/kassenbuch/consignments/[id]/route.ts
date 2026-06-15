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
    include: { items: true },
  })
  if (!consignment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const { status } = await req.json()

  // "Zurückgeholt": offene (noch nicht verkaufte) Menge als zurückgegeben verbuchen.
  // Verkäufe entstehen ausschließlich über die /sell-Route — hier wird kein Lager bewegt.
  const updated = await prisma.$transaction(async (tx) => {
    if (status === 'returned') {
      for (const ci of consignment.items) {
        const open = ci.quantity - ci.soldQuantity - ci.returnedQuantity
        if (open > 0) {
          await tx.consignmentItem.update({
            where: { id: ci.id },
            data: { returnedQuantity: { increment: open } },
          })
        }
      }
    }

    return tx.consignment.update({
      where: { id },
      data: { status: status ?? consignment.status },
      include: { items: { include: { product: true } }, customer: true, commissionStore: true },
    })
  })

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
