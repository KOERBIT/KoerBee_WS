import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { completed } = await req.json()

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
    data: { completed },
  })

  return NextResponse.json(updated)
}
