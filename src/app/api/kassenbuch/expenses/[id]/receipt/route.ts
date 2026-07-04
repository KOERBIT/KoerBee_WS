import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Liefert den gespeicherten Original-Beleg (Bild/PDF) zu einer Ausgabe.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const receipt = await prisma.expenseReceipt.findFirst({
    where: { expenseId: id, userId: session.user.id },
  })
  if (!receipt) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const body = new Uint8Array(receipt.data)
  return new NextResponse(body, {
    headers: {
      'Content-Type': receipt.mimeType,
      'Content-Disposition': `inline; filename="${receipt.fileName || 'beleg'}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
