import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const STATUSES = ['new', 'ignored', 'linked', 'deleted']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = new URL(req.url).searchParams.get('status')
  const where = {
    userId: session.user.id,
    ...(status && STATUSES.includes(status) ? { status } : {}),
  }
  const transactions = await prisma.payPalTransaction.findMany({
    where,
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(transactions)
}
