import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const order = await prisma.preOrder.findUnique({
    where: { id },
    include: {
      shopCustomer: { select: { name: true, email: true, phone: true, locale: true } },
      items: {
        include: { product: { select: { name: true, shopName: true, unit: true, imageUrl: true } } },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(order)
}
