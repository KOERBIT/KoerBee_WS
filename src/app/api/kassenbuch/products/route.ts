import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const products = await prisma.product.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, unit, price, description } = await req.json()
  if (!name || price == null) return NextResponse.json({ error: 'Name und Preis fehlen' }, { status: 400 })
  const product = await prisma.product.create({
    data: { name, unit: unit || 'Stück', price: parseFloat(price), description: description || null, userId: session.user.id },
  })
  return NextResponse.json(product, { status: 201 })
}
