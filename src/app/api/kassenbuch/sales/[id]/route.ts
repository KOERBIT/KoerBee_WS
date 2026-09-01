import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const sale = await prisma.sale.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: true,
      consignment: { include: { items: true } },
    },
  })
  if (!sale) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const fromConsignment = !!sale.consignmentId

  await prisma.$transaction(async (tx) => {
    // Lager zurückbuchen – spiegelt die Abbuchung beim Verkauf:
    //  - normaler Verkauf: um die volle (ggf. Nachkomma-)Menge
    //  - aus Kommission:   um die gerundete Menge (wie beim Buchen)
    for (const item of sale.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { increment: fromConsignment ? Math.round(item.quantity) : item.quantity } },
      })
    }

    // Bei Kommissions-Verkäufen die verkaufte Menge wieder freigeben.
    if (sale.consignment) {
      for (const item of sale.items) {
        const ci = sale.consignment.items.find(c => c.productId === item.productId)
        if (ci) {
          const newSold = Math.max(0, ci.soldQuantity - item.quantity)
          await tx.consignmentItem.update({ where: { id: ci.id }, data: { soldQuantity: newSold } })
        }
      }
      // War die Kommission „abgerechnet", ist durch die Rückgabe wieder etwas offen → reaktivieren.
      if (sale.consignment.status === 'settled') {
        await tx.consignment.update({ where: { id: sale.consignment.id }, data: { status: 'active' } })
      }
    }

    await tx.sale.delete({ where: { id } })
  })

  return NextResponse.json({ ok: true })
}
