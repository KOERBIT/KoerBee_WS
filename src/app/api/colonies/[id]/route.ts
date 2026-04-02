import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function ownsColony(colonyId: string, userId: string) {
  return prisma.colony.findFirst({ where: { id: colonyId, apiary: { userId } } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!await ownsColony(id, session.user.id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const body = await req.json()
  const colony = await prisma.colony.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.apiaryId !== undefined && { apiaryId: body.apiaryId }),
      ...(body.queenYear !== undefined && { queenYear: body.queenYear ?? null }),
      ...(body.queenColor !== undefined && { queenColor: body.queenColor ?? null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.statusNote !== undefined && { statusNote: body.statusNote ?? null }),
      ...(body.statusChangedAt !== undefined && { statusChangedAt: body.statusChangedAt ? new Date(body.statusChangedAt) : null }),
    },
  })
  return NextResponse.json(colony)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!await ownsColony(id, session.user.id)) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.colony.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
