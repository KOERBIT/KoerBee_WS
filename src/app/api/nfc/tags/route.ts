import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { uid, label, colonyId, actions } = await req.json()
  if (!uid || !colonyId) return NextResponse.json({ error: 'UID und Volk fehlen' }, { status: 400 })

  const colony = await prisma.colony.findFirst({
    where: { id: colonyId, apiary: { userId: session.user.id } },
  })
  if (!colony) return NextResponse.json({ error: 'Volk nicht gefunden' }, { status: 404 })

  const tag = await prisma.nfcTag.upsert({
    where: { uid },
    update: { label: label ?? null, colonyId },
    create: { uid, label: label ?? null, colonyId },
  })

  if (actions && Array.isArray(actions)) {
    await prisma.nfcAction.deleteMany({ where: { nfcTagId: tag.id } })
    if (actions.length > 0) {
      await prisma.nfcAction.createMany({
        data: actions.map((a: { type: string; defaultValues?: object }) => ({
          nfcTagId: tag.id,
          type: a.type,
          defaultValues: a.defaultValues ?? null,
        })),
      })
    }
  }

  const result = await prisma.nfcTag.findUnique({
    where: { id: tag.id },
    include: { actions: true, colony: { include: { apiary: { select: { id: true, name: true } } } } },
  })
  return NextResponse.json(result, { status: 201 })
}
