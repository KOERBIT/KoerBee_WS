import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getShopCustomerFromRequest } from '@/lib/shop/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params

  const order = await prisma.preOrder.findFirst({
    where: { id, shopCustomerId: customer.id },
    include: {
      items: {
        include: { product: { select: { name: true, shopName: true, unit: true, imageUrl: true } } },
      },
    },
  })

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(order)
}
