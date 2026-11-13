import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BUCKET_SIZES_KG } from '@/lib/honey/jars'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.honeyBucket.findMany({
    where: { userId: session.user.id },
    select: { sizeKg: true, tareKg: true },
  })
  return NextResponse.json(rows)
}

// Body: { sizeKg: 20 | 25 | 40, tareKg: number }
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: { sizeKg?: unknown; tareKg?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const sizeKg = body.sizeKg
  const tareKg = body.tareKg
  if (typeof sizeKg !== 'number' || !(BUCKET_SIZES_KG as readonly number[]).includes(sizeKg)) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 400 })
  }
  if (typeof tareKg !== 'number' || !Number.isFinite(tareKg) || tareKg < 0 || tareKg >= sizeKg) {
    return NextResponse.json({ error: 'invalid_tare' }, { status: 400 })
  }

  await prisma.honeyBucket.upsert({
    where: { userId_sizeKg: { userId, sizeKg } },
    create: { userId, sizeKg, tareKg },
    update: { tareKg },
  })
  return NextResponse.json({ ok: true })
}
