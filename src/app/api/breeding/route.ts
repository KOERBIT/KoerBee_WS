import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lines = await prisma.breedingLine.findMany({
    where: { userId: session.user.id },
    include: {
      batches: {
        include: {
          events: { orderBy: { date: 'asc' } },
          motherColony: { select: { id: true, name: true } },
        },
        orderBy: { graftDate: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(lines)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })

  const line = await prisma.breedingLine.create({
    data: { name, description: description || null, userId: session.user.id },
  })

  return NextResponse.json(line, { status: 201 })
}
