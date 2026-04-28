import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { parseQueensJson } from '@/lib/breeding-queens'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lineIds = searchParams.get('lineIds')?.split(',').filter(Boolean) || []

  if (lineIds.length === 0) {
    return NextResponse.json({ error: 'No lines specified' }, { status: 400 })
  }

  try {
    // Fetch lines and their batches
    const lines = await prisma.breedingLine.findMany({
      where: {
        id: { in: lineIds },
        userId: session.user.id,
      },
      include: {
        batches: {
          include: {
            events: { orderBy: { date: 'asc' } },
            motherColony: { select: { id: true, name: true } },
          },
          orderBy: { graftDate: 'asc' },
        },
      },
    })

    // Build report data
    const reportData = {
      lines: lines.map(line => ({
        id: line.id,
        name: line.name,
        description: line.description,
        batchCount: line.batches.length,
      })),
      batches: lines.flatMap(line =>
        line.batches.map(batch => ({
          id: batch.id,
          lineId: batch.lineId,
          lineName: lines.find(l => l.id === batch.lineId)?.name || '',
          graftDate: batch.graftDate,
          motherColonyName: batch.motherColony?.name || null,
          notes: batch.notes,
          status: batch.status,
          events: batch.events.map(e => ({
            id: e.id,
            type: e.type,
            date: e.date,
            completed: e.completed,
            eventValue: e.eventValue,
            eventNotes: e.eventNotes,
          })),
          queens: batch.queensIds ? parseQueensJson(batch.queensIds) : [],
          tracking: {
            larvaeGrafted: batch.larvaeGrafted,
            larvaeAccepted: batch.larvaeAccepted,
            queensHatched: batch.queensHatched,
            queensMated: batch.queensMated,
          },
        }))
      ),
      summary: {
        totalQueens: 0,
        totalHatched: 0,
        totalMated: 0,
        totalDistributed: 0,
      },
    }

    // Calculate summary
    for (const batch of reportData.batches) {
      for (const queen of batch.queens) {
        reportData.summary.totalQueens++
        if (queen.status === 'hatched') reportData.summary.totalHatched++
        if (queen.status === 'mated') reportData.summary.totalMated++
        if (queen.status === 'distributed') reportData.summary.totalDistributed++
      }
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
