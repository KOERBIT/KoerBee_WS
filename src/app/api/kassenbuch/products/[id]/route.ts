import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { name, unit, price, description, fillAmount, fillUnit } = await req.json()
  const product = await prisma.product.findFirst({ where: { id, userId: session.user.id } })
  if (!product) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const updated = await prisma.product.update({
    where: { id },
    data: {
      name,
      unit,
      price: parseFloat(price),
      description: description || null,
      fillAmount: fillAmount ? parseFloat(fillAmount) : null,
      fillUnit: fillUnit || null,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const product = await prisma.product.findFirst({ where: { id, userId: session.user.id } })
  if (!product) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (product.stockQuantity > 0) {
    return NextResponse.json(
      { error: 'Artikel hat noch Lagerbestand. Bitte erst auf 0 reduzieren.' },
      { status: 409 }
    )
  }
  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
