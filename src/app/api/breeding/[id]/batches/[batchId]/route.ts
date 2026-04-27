import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: lineId, batchId } = await params
  const { notes, larvaeGrafted, larvaeAccepted, queensHatched, queensMated } = await req.json()

  // Verify ownership
  const batch = await prisma.breedingBatch.findFirst({
    where: {
      id: batchId,
      line: { userId: session.user.id }
    }
  })
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update batch
  const updated = await prisma.breedingBatch.update({
    where: { id: batchId },
    data: {
      notes: notes !== undefined ? notes : undefined,
      larvaeGrafted: larvaeGrafted !== undefined ? larvaeGrafted : undefined,
      larvaeAccepted: larvaeAccepted !== undefined ? larvaeAccepted : undefined,
      queensHatched: queensHatched !== undefined ? queensHatched : undefined,
      queensMated: queensMated !== undefined ? queensMated : undefined,
    },
    include: { events: true }
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; batchId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: lineId, batchId } = await params
  const batch = await prisma.breedingBatch.findFirst({
    where: { id: batchId, lineId, line: { userId: session.user.id } },
  })
  if (!batch) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.breedingBatch.delete({ where: { id: batchId } })
  return NextResponse.json({ ok: true })
}
