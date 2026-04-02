import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tagId, actionType, amount, unit, notes } = await req.json()

  const tag = await prisma.nfcTag.findFirst({
    where: { id: tagId, colony: { apiary: { userId: session.user.id } } },
    include: { colony: true },
  })
  if (!tag) return NextResponse.json({ error: 'Tag nicht gefunden' }, { status: 404 })

  const now = new Date()

  if (actionType === 'inspection') {
    const inspection = await prisma.inspection.create({
      data: {
        colonyId: tag.colonyId,
        date: now,
        notes: notes ?? 'Via NFC-Scan',
        createdOffline: false,
      },
    })
    return NextResponse.json({ ok: true, type: 'inspection', id: inspection.id })
  }

  if (['varroa', 'feeding', 'honey_harvest', 'oxalic_acid', 'formic_acid', 'thymol', 'other'].includes(actionType)) {
    const treatment = await prisma.treatment.create({
      data: {
        colonyId: tag.colonyId,
        type: actionType,
        amount: amount ?? null,
        unit: unit ?? null,
        date: now,
        notes: notes ?? 'Via NFC-Scan',
      },
    })
    return NextResponse.json({ ok: true, type: 'treatment', id: treatment.id })
  }

  return NextResponse.json({ error: 'Unbekannter Aktionstyp' }, { status: 400 })
}
