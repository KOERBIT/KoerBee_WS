import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Manuelle Korrektur einer Kommission: setzt je Position platzierte / verkaufte /
// zurückgegebene Menge und Preis direkt. Bewegt bewusst KEIN Lager (analog zur
// bestehenden „Zurückgeholt"-Logik) – reine Kommissions-Buchführung.
type Corr = { id: string; quantity: number; soldQuantity: number; returnedQuantity: number; price: number }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const consignment = await prisma.consignment.findFirst({
    where: { id, userId: session.user.id },
    include: { items: true },
  })
  if (!consignment) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  let body: { items?: unknown } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }
  const rows = Array.isArray(body.items) ? (body.items as Partial<Corr>[]) : []
  if (rows.length === 0) return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })

  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)
  const resolved: Corr[] = []
  for (const r of rows) {
    const ci = consignment.items.find(i => i.id === r.id)
    if (!ci) return NextResponse.json({ error: 'position_not_found', id: r.id }, { status: 422 })
    const quantity = num(r.quantity)
    const soldQuantity = num(r.soldQuantity)
    const returnedQuantity = num(r.returnedQuantity)
    const price = num(r.price)
    if ([quantity, soldQuantity, returnedQuantity, price].some(n => Number.isNaN(n) || n < 0)) {
      return NextResponse.json({ error: 'invalid_values', id: ci.id }, { status: 422 })
    }
    if (soldQuantity + returnedQuantity > quantity + 1e-9) {
      return NextResponse.json({ error: 'exceeds_quantity', id: ci.id }, { status: 422 })
    }
    resolved.push({ id: ci.id, quantity, soldQuantity, returnedQuantity, price })
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const r of resolved) {
      await tx.consignmentItem.update({
        where: { id: r.id },
        data: { quantity: r.quantity, soldQuantity: r.soldQuantity, returnedQuantity: r.returnedQuantity, price: r.price },
      })
    }
    // Status neu bestimmen: nichts mehr offen -> settled, sonst active.
    const anyOpen = resolved.some(r => r.quantity - r.soldQuantity - r.returnedQuantity > 1e-9)
    const status = consignment.status === 'returned'
      ? consignment.status
      : anyOpen ? 'active' : 'settled'
    return tx.consignment.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } }, customer: true, commissionStore: true },
    })
  })

  return NextResponse.json(updated)
}
