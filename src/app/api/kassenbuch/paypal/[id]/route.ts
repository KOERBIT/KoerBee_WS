import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Statuswechsel zwischen new/ignored/deleted erlaubt; "linked" entsteht
// ausschließlich über die /link-Route.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { status } = await req.json()
  if (status !== 'new' && status !== 'ignored' && status !== 'deleted') {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }
  const txn = await prisma.payPalTransaction.findFirst({ where: { id, userId: session.user.id } })
  if (!txn) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (txn.status === 'linked') {
    return NextResponse.json({ error: 'already_linked' }, { status: 409 })
  }
  const updated = await prisma.payPalTransaction.update({ where: { id }, data: { status } })
  return NextResponse.json(updated)
}

// Soft-Delete: Eintrag wird als "deleted" markiert (nicht entfernt), damit er
// beim erneuten E-Mail-/CSV-/API-Abruf nicht wieder neu angelegt wird.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const txn = await prisma.payPalTransaction.findFirst({ where: { id, userId: session.user.id } })
  if (!txn) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (txn.status === 'linked') {
    return NextResponse.json({ error: 'already_linked' }, { status: 409 })
  }
  await prisma.payPalTransaction.update({ where: { id }, data: { status: 'deleted' } })
  return NextResponse.json({ ok: true })
}
