import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateQueenNumbers, parseQueensJson, serializeQueens, QueenRecord } from '@/lib/breeding-queens'
import { randomUUID } from 'crypto'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { completed, eventValue, eventNotes } = await req.json()

  // Verify ownership through chain
  const event = await prisma.breedingEvent.findFirst({
    where: { id },
    include: { batch: { include: { line: true } } },
  })
  if (!event || event.batch.line.userId !== session.user.id) {
    return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  }

  const updated = await prisma.breedingEvent.update({
    where: { id },
    data: {
      completed: completed !== undefined ? completed : undefined,
      eventValue: eventValue !== undefined ? eventValue : undefined,
      eventNotes: eventNotes !== undefined ? eventNotes : undefined,
    },
    select: {
      id: true,
      type: true,
      date: true,
      completed: true,
      notes: true,
      eventValue: true,
      eventNotes: true,
      batch: {
        select: {
          id: true,
          graftDate: true,
          notes: true,
          status: true,
          larvaeGrafted: true,
          larvaeAccepted: true,
          queensHatched: true,
          queensMated: true,
          motherColony: { select: { id: true, name: true } },
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
          }
        }
      }
    }
  })

  // Auto-update batch tracking field based on event type
  if (eventValue !== undefined) {
    const updateData: Record<string, number> = {}
    if (event.type === 'check') updateData.larvaeAccepted = eventValue
    if (event.type === 'hatch') updateData.queensHatched = eventValue
    if (event.type === 'mating') updateData.queensMated = eventValue

    if (Object.keys(updateData).length > 0) {
      await prisma.breedingBatch.update({
        where: { id: event.batchId },
        data: updateData
      })
    }
  }

  // Generate queen numbers for hatch events
  if (event.type === 'hatch' && eventValue && !event.completed) {
    const batch = await prisma.breedingBatch.findUnique({
      where: { id: event.batchId },
      include: { line: true },
    })

    if (batch && batch.line) {
      const hatchDate = new Date(event.date)
      const hatchDateStr = hatchDate.toISOString().split('T')[0] // YYYY-MM-DD

      const existingQueens = batch.queensIds ? parseQueensJson(batch.queensIds) : []
      const newQueenNumbers = generateQueenNumbers({
        lineName: batch.line.name,
        hatchDate: hatchDateStr,
        count: eventValue,
        existingQueens: existingQueens.map(q => ({
          number: q.number,
          status: q.status
        })),
      })

      // Create queen records
      const newQueens: QueenRecord[] = newQueenNumbers.map((number) => ({
        id: randomUUID(),
        number,
        hatchDate: new Date(hatchDateStr),
        status: 'hatched',
        notes: eventNotes || undefined,
      }))

      const allQueens = [...existingQueens, ...newQueens]

      // Update batch with new queens
      await prisma.breedingBatch.update({
        where: { id: batch.id },
        data: {
          queensIds: serializeQueens(allQueens),
        },
      })
    }
  }

  return NextResponse.json(updated)
}
