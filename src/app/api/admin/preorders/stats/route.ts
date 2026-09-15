import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const [pending, confirmed, ready, pickedUpThisWeek, productStats] = await Promise.all([
    prisma.preOrder.count({ where: { status: 'PENDING' } }),
    prisma.preOrder.count({ where: { status: 'CONFIRMED' } }),
    prisma.preOrder.count({ where: { status: 'READY' } }),
    prisma.preOrder.count({
      where: { status: 'PICKED_UP', statusChangedAt: { gte: oneWeekAgo } },
    }),
    prisma.preOrderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        preOrder: { status: { in: ['PENDING', 'CONFIRMED', 'READY'] } },
      },
    }),
  ])

  // Enrich product stats with names
  const productIds = productStats.map((s) => s.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, shopName: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const productSummary = productStats.map((s) => ({
    productId: s.productId,
    productName: productMap.get(s.productId)?.shopName ?? productMap.get(s.productId)?.name ?? '?',
    totalOrdered: s._sum.quantity ?? 0,
  }))

  return NextResponse.json({
    pending,
    confirmed,
    ready,
    pickedUpThisWeek,
    productSummary,
  })
}
