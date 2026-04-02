import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const treatments = await prisma.treatment.findMany({
    where: { colony: { apiary: { userId: session.user.id } } },
    include: {
      colony: { include: { apiary: { select: { id: true, name: true } } } },
    },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(treatments)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { colonyId, type, amount, unit, date, notes } = await req.json()
  if (!colonyId || !type) return NextResponse.json({ error: 'Volk und Typ fehlen' }, { status: 400 })

  const colony = await prisma.colony.findFirst({
    where: { id: colonyId, apiary: { userId: session.user.id } },
  })
  if (!colony) return NextResponse.json({ error: 'Volk nicht gefunden' }, { status: 404 })

  const treatment = await prisma.treatment.create({
    data: {
      colonyId,
      type,
      amount: amount ?? null,
      unit: unit ?? null,
      date: date ? new Date(date) : new Date(),
      notes: notes ?? null,
    },
  })
  return NextResponse.json(treatment, { status: 201 })
}
