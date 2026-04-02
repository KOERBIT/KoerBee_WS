import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const consignment = await prisma.consignment.findFirst({ where: { id, userId: session.user.id } })
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
