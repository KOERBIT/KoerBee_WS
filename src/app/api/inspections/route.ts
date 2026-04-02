import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inspections = await prisma.inspection.findMany({
    where: { colony: { apiary: { userId: session.user.id } } },
    include: {
      colony: { include: { apiary: { select: { id: true, name: true } } } },
      items: true,
    },
    orderBy: { date: 'desc' },
    take: 100,
  })
  return NextResponse.json(inspections)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { colonyId, date, notes, items } = await req.json()
  if (!colonyId) return NextResponse.json({ error: 'Volk fehlt' }, { status: 400 })

  const colony = await prisma.colony.findFirst({
    where: { id: colonyId, apiary: { userId: session.user.id } },
  })
  if (!colony) return NextResponse.json({ error: 'Volk nicht gefunden' }, { status: 404 })

  const inspection = await prisma.inspection.create({
    data: {
      colonyId,
      date: date ? new Date(date) : new Date(),
      notes: notes ?? null,
      items: {
        create: (items ?? []).map((item: { key: string; value: string }) => ({
          key: item.key,
          value: String(item.value),
        })),
      },
    },
    include: { items: true },
  })
  return NextResponse.json(inspection, { status: 201 })
}
