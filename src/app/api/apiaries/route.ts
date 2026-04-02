import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiaries = await prisma.apiary.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { colonies: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(apiaries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, lat, lng, notes } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })

  const apiary = await prisma.apiary.create({
    data: { name, lat: lat ?? null, lng: lng ?? null, notes: notes ?? null, userId: session.user.id },
  })
  return NextResponse.json(apiary, { status: 201 })
}
