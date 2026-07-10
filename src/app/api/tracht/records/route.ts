import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANTS_BY_ID } from '@/lib/tracht/plants'

// Liste aller erfassten Trachtbeginn/-enden (Statistik über alle Jahre).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const records = await prisma.bloomRecord.findMany({
    where: { userId: session.user.id },
    orderBy: [{ year: 'desc' }, { plantName: 'asc' }],
  })
  return NextResponse.json(records)
}

function toDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

// Erfasst/aktualisiert Beginn und/oder Ende einer Tracht (pro Pflanze & Jahr).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: { plantId?: unknown; year?: unknown; startDate?: unknown; endDate?: unknown; notes?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const plantId = typeof body.plantId === 'string' ? body.plantId : ''
  const plant = PLANTS_BY_ID[plantId]
  if (!plant) return NextResponse.json({ error: 'invalid_plant' }, { status: 400 })

  const startDate = body.startDate !== undefined ? toDate(body.startDate) : undefined
  const endDate = body.endDate !== undefined ? toDate(body.endDate) : undefined
  const notes = body.notes !== undefined ? (typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null) : undefined

  const year = Number(body.year)
    || (startDate ?? endDate ?? new Date()).getUTCFullYear()

  const existing = await prisma.bloomRecord.findUnique({
    where: { userId_plantId_year: { userId, plantId, year } },
  })

  const record = await prisma.bloomRecord.upsert({
    where: { userId_plantId_year: { userId, plantId, year } },
    create: {
      userId, plantId, plantName: plant.name, year,
      startDate: startDate ?? null, endDate: endDate ?? null, notes: notes ?? null,
    },
    update: {
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(notes !== undefined && { notes }),
      plantName: plant.name,
    },
  })
  void existing
  return NextResponse.json(record)
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 })
  const rec = await prisma.bloomRecord.findFirst({ where: { id, userId: session.user.id } })
  if (!rec) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  await prisma.bloomRecord.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
