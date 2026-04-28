import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { parseQueensJson } from '@/lib/breeding-queens'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lineIds = searchParams.get('lineIds')?.split(',') || []
  const status = searchParams.get('status') as 'hatched' | 'mated' | 'distributed' | null
  const dateFromStr = searchParams.get('dateFrom')
  const dateToStr = searchParams.get('dateTo')

  try {
    // Get all batches for this user's lines
    const batches = await prisma.breedingBatch.findMany({
      where: {
        line: {
          userId: session.user.id,
          ...(lineIds.length > 0 && { id: { in: lineIds } }),
        },
      },
      include: {
        line: { select: { id: true, name: true } },
        motherColony: { select: { id: true, name: true } },
      },
      orderBy: { graftDate: 'desc' },
    })

    // Flatten queens from all batches
    const queens: any[] = []
    for (const batch of batches) {
      if (!batch.queensIds) continue

      const parsedQueens = parseQueensJson(batch.queensIds)
      for (const q of parsedQueens) {
        // Filter by status and date range if provided
        if (status && q.status !== status) continue
        if (dateFromStr && new Date(dateFromStr) > q.hatchDate) continue
        if (dateToStr && new Date(dateToStr) < q.hatchDate) continue

        queens.push({
          number: q.number,
          hatchDate: q.hatchDate,
          status: q.status,
          lineId: batch.line.id,
          lineName: batch.line.name,
          batchGraftDate: batch.graftDate,
          motherColonyName: batch.motherColony?.name || null,
          notes: q.notes || null,
        })
      }
    }

    return NextResponse.json(queens)
  } catch (error) {
    console.error('Error fetching queens:', error)
    return NextResponse.json({ error: 'Failed to fetch queens' }, { status: 500 })
  }
}
