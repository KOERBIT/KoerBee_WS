import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { quantity } = await req.json()

  if (!quantity || typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
    return NextResponse.json({ error: 'Menge muss eine positive ganze Zahl sein' }, { status: 400 })
  }

  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!product) return NextResponse.json({ error: 'Artikel nicht gefunden' }, { status: 404 })

  const updated = await prisma.product.update({
    where: { id },
    data: { stockQuantity: { increment: quantity } },
  })

  return NextResponse.json({ stockQuantity: updated.stockQuantity })
}
