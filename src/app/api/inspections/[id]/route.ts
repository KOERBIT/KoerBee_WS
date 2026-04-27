import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { colonyId, date, notes, items } = await req.json()

  // Verify ownership
  const inspection = await prisma.inspection.findFirst({
    where: {
      id: params.id,
      colony: { apiary: { userId: session.user.id } }
    },
  })
  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update inspection
  const updated = await prisma.inspection.update({
    where: { id: params.id },
    data: {
      date: date ? new Date(date) : undefined,
      notes: notes ?? null,
      items: {
        deleteMany: {},
        create: (items ?? []).map((item: { key: string; value: string }) => ({
          key: item.key,
          value: String(item.value),
        })),
      },
    },
    include: { items: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const inspection = await prisma.inspection.findFirst({
    where: {
      id: params.id,
      colony: { apiary: { userId: session.user.id } }
    },
  })
  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete inspection (items cascade delete)
  await prisma.inspection.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
