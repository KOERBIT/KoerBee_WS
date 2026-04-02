import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = req.nextUrl.searchParams.get('uid')
  if (!uid) return NextResponse.json({ error: 'UID fehlt' }, { status: 400 })

  const tag = await prisma.nfcTag.findFirst({
    where: { uid, colony: { apiary: { userId: session.user.id } } },
    include: {
      colony: { include: { apiary: { select: { id: true, name: true } } } },
      actions: true,
    },
  })

  if (!tag) return NextResponse.json({ found: false })
  return NextResponse.json({ found: true, tag })
}
