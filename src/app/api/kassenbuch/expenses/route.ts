import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(expenses)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { date, amount, category, description } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Betrag fehlt' }, { status: 400 })
  const expense = await prisma.expense.create({
    data: {
      date: date ? new Date(date) : new Date(),
      amount: parseFloat(amount),
      category: category || 'Sonstiges',
      description: description || null,
      userId: session.user.id,
    },
  })
  return NextResponse.json(expense, { status: 201 })
}
