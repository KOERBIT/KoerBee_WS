import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 })
  }

  const { quantity, reason, batchNumber, expiryDate } = body as Record<string, unknown>

  // Validate quantity
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity === 0) {
    return NextResponse.json({
      error: 'Menge muss eine ganze Zahl (nicht null) sein'
    }, { status: 400 })
  }

  // Validate reason
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json({
      error: 'Grund erforderlich'
    }, { status: 400 })
  }

  // Validate expiryDate if provided
  if (expiryDate && typeof expiryDate !== 'string') {
    return NextResponse.json({
      error: 'MHD muss ein Datum sein'
    }, { status: 400 })
  }

  // Check product exists and belongs to user
  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!product) return NextResponse.json({ error: 'Artikel nicht gefunden' }, { status: 404 })

  // Create correction record
  await prisma.stockCorrection.create({
    data: {
      productId: id,
      quantity,
      reason: reason.trim(),
      batchNumber: (batchNumber && typeof batchNumber === 'string') ? batchNumber.trim() : null,
      expiryDate: expiryDate ? new Date(expiryDate as string) : null,
      userId: session.user.id,
    },
  })

  // Update product stock
  const updated = await prisma.product.update({
    where: { id },
    data: { stockQuantity: { increment: quantity } },
  })

  return NextResponse.json({
    stockQuantity: updated.stockQuantity,
    message: 'Korrektur erfolgreich gespeichert',
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Check product exists and belongs to user
  const product = await prisma.product.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!product) return NextResponse.json({ error: 'Artikel nicht gefunden' }, { status: 404 })

  // Get all corrections for this product, sorted by newest first
  const corrections = await prisma.stockCorrection.findMany({
    where: { productId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(corrections)
}
