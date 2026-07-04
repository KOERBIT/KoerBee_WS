import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ALLOWED_RECEIPT_MIME } from '@/lib/anthropic/receipt-normalize'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
    include: { receipt: { select: { id: true, mimeType: true } } },
  })
  return NextResponse.json(expenses)
}

interface ReceiptInput { base64?: string; mimeType?: string; fileName?: string }

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const { date, amount, category, description, receipt } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Betrag fehlt' }, { status: 400 })

  const r = receipt as ReceiptInput | undefined
  const hasReceipt = !!(r?.base64 && r.mimeType)
  if (hasReceipt && !ALLOWED_RECEIPT_MIME.includes(r!.mimeType!)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 })
  }

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        date: date ? new Date(date) : new Date(),
        amount: parseFloat(amount),
        category: category || 'Sonstiges',
        description: description || null,
        userId,
      },
    })
    if (hasReceipt) {
      await tx.expenseReceipt.create({
        data: {
          expenseId: created.id,
          userId,
          data: Buffer.from(r!.base64!, 'base64'),
          mimeType: r!.mimeType!,
          fileName: r!.fileName || null,
        },
      })
    }
    return created
  })
  return NextResponse.json(expense, { status: 201 })
}
