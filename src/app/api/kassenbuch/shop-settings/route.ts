import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.shopSettings.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json(settings ?? { stockLowThreshold: 5 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stockLowThreshold } = await req.json()
  const threshold = Math.max(1, Math.floor(Number(stockLowThreshold) || 5))

  const settings = await prisma.shopSettings.upsert({
    where: { userId: session.user.id },
    update: { stockLowThreshold: threshold },
    create: { userId: session.user.id, stockLowThreshold: threshold },
  })

  return NextResponse.json(settings)
}
