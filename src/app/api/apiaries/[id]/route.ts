import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.apiary.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const body = await req.json()
  const { flightRadius } = body
  const apiary = await prisma.apiary.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.lat !== undefined && { lat: body.lat ?? null }),
      ...(body.lng !== undefined && { lng: body.lng ?? null }),
      ...(body.notes !== undefined && { notes: body.notes ?? null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.statusNote !== undefined && { statusNote: body.statusNote ?? null }),
      ...(body.statusChangedAt !== undefined && { statusChangedAt: body.statusChangedAt ? new Date(body.statusChangedAt) : null }),
      ...(flightRadius !== undefined && { flightRadius: flightRadius ? parseFloat(flightRadius) : null }),
    },
  })
  return NextResponse.json(apiary)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.apiary.findFirst({ where: { id, userId: session.user.id } })
  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.apiary.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
