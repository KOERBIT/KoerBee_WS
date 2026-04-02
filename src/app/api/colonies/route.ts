import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const colonies = await prisma.colony.findMany({
    where: { apiary: { userId: session.user.id } },
    include: {
      apiary: { select: { id: true, name: true } },
      _count: { select: { inspections: true, treatments: true } },
      inspections: { orderBy: { date: 'desc' }, take: 1, include: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(colonies)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, apiaryId, queenYear, queenColor } = await req.json()
  if (!name || !apiaryId) return NextResponse.json({ error: 'Name und Standort fehlen' }, { status: 400 })

  const apiary = await prisma.apiary.findFirst({ where: { id: apiaryId, userId: session.user.id } })
  if (!apiary) return NextResponse.json({ error: 'Standort nicht gefunden' }, { status: 404 })

  const colony = await prisma.colony.create({
    data: { name, apiaryId, queenYear: queenYear ?? null, queenColor: queenColor ?? null },
  })
  return NextResponse.json(colony, { status: 201 })
}
