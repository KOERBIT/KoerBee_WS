import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const tag = await prisma.nfcTag.findFirst({
    where: { id, colony: { apiary: { userId: session.user.id } } },
  })
  if (!tag) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  await prisma.nfcTag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
