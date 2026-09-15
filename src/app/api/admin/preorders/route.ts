import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')
  const search = req.nextUrl.searchParams.get('search')

  const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'READY', 'PICKED_UP', 'CANCELLED']
  const where: Record<string, unknown> = {}
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    }
    where.status = status
  }
  if (search) {
    where.shopCustomer = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }

  const orders = await prisma.preOrder.findMany({
    where,
    include: {
      shopCustomer: { select: { name: true, email: true, phone: true } },
      items: { include: { product: { select: { name: true, shopName: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(orders)
}
