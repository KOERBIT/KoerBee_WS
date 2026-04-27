import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: lineId } = await params
  const line = await prisma.breedingLine.findFirst({ where: { id: lineId, userId: session.user.id } })
  if (!line) return NextResponse.json({ error: 'Linie nicht gefunden' }, { status: 404 })

  const { graftDate, notes, motherColonyId, larvaeGrafted } = await req.json()
  if (!graftDate) return NextResponse.json({ error: 'Umlarv-Datum fehlt' }, { status: 400 })

  const graft = new Date(graftDate)

  const batch = await prisma.breedingBatch.create({
    data: {
      lineId,
      graftDate: graft,
      notes: notes || null,
      motherColonyId: motherColonyId || null,
      larvaeGrafted: larvaeGrafted || null,
      events: {
        create: [
          { type: 'graft',       date: graft,              completed: false },
          { type: 'check',       date: addDays(graft, 4),  completed: false },
          { type: 'hatch',       date: addDays(graft, 12), completed: false },
          { type: 'mating',      date: addDays(graft, 14), completed: false },
          { type: 'laying',      date: addDays(graft, 21), completed: false },
          { type: 'assessment',  date: addDays(graft, 28), completed: false },
        ],
      },
    },
    include: {
      events: {
        select: {
          id: true,
          type: true,
          date: true,
          completed: true,
          notes: true,
          eventValue: true,
          eventNotes: true,
        },
        orderBy: { date: 'asc' }
      },
      motherColony: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(batch, { status: 201 })
}
