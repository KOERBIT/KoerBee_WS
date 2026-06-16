import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PLANTS_BY_ID } from '@/lib/tracht/plants'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const reports = await prisma.bloomReport.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    take: 50,
  })
  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { plantId, phase, date, apiaryId, region } = await req.json()

  const plant = PLANTS_BY_ID[plantId]
  if (!plant) return NextResponse.json({ error: 'Unbekannte Pflanze' }, { status: 400 })

  // Koordinaten vom Standort übernehmen (für ortsbezogene Verifizierung)
  let lat: number | null = null
  let lng: number | null = null
  if (apiaryId) {
    const apiary = await prisma.apiary.findFirst({ where: { id: apiaryId, userId: session.user.id } })
    if (apiary) { lat = apiary.lat; lng = apiary.lng }
  }

  const report = await prisma.bloomReport.create({
    data: {
      plantId,
      plantName: plant.name,
      phase: phase || null,
      date: date ? new Date(date) : new Date(),
      region: region || null,
      apiaryId: apiaryId || null,
      lat, lng,
      userId: session.user.id,
    },
  })
  return NextResponse.json(report, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 })
  const report = await prisma.bloomReport.findFirst({ where: { id, userId: session.user.id } })
  if (!report) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  await prisma.bloomReport.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
