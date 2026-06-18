import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Statuswechsel nur zwischen new/ignored erlaubt; "linked" entsteht ausschließlich
// über die /link-Route.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { status } = await req.json()
  if (status !== 'new' && status !== 'ignored') {
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const txn = await prisma.payPalTransaction.findFirst({ where: { id, userId: session.user.id } })
  if (!txn) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  await prisma.payPalTransaction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
