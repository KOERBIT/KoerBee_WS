import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendOrderStatusEmail } from '@/lib/shop/mail'

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP'],
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status: newStatus, adminNote } = await req.json()

  const order = await prisma.preOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shopCustomer: { select: { email: true, name: true, locale: true } },
    },
  })

  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const allowed = VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `invalid_transition: ${order.status} → ${newStatus}` },
      { status: 400 }
    )
  }

  const updated = await prisma.preOrder.update({
    where: { id },
    data: {
      status: newStatus,
      statusChangedAt: new Date(),
      ...(adminNote !== undefined ? { adminNote } : {}),
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      shopCustomer: { select: { email: true, name: true, locale: true } },
    },
  })

  // Send status email (best-effort)
  try {
    await sendOrderStatusEmail({
      userId: session.user.id,
      order: updated,
      newStatus,
    })
  } catch (e) {
    console.error('Failed to send status email:', e)
  }

  return NextResponse.json(updated)
}
