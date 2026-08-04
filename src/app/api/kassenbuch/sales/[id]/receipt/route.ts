import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureReceipt, renderReceiptHtml, normalizePaymentMethod, receiptFileName } from '@/lib/receipt/service'
import { formatReceiptNumber } from '@/lib/receipt/render'

async function loadSale(userId: string, saleId: string) {
  return prisma.sale.findFirst({
    where: { id: saleId, userId },
    include: { items: { include: { product: true } } },
  })
}

// POST: Quittung anlegen bzw. Zahlart aktualisieren (vergibt laufende Nummer).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const sale = await loadSale(session.user.id, id)
  if (!sale) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  let paymentMethod: 'bar' | 'ueberweisung' | undefined
  try {
    const body = await req.json()
    if (body?.paymentMethod != null) paymentMethod = normalizePaymentMethod(body.paymentMethod)
  } catch { /* leerer Body ok */ }

  const receipt = await ensureReceipt(session.user.id, id, paymentMethod)
  return NextResponse.json({
    number: receipt.number,
    formatted: formatReceiptNumber(receipt.number, sale.date),
    paymentMethod: receipt.paymentMethod,
    emailedAt: receipt.emailedAt,
    recipient: receipt.recipient,
  })
}

// GET: gerendertes Quittungs-HTML ausliefern (?dl=1 = Download-Anhang).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const sale = await loadSale(session.user.id, id)
  if (!sale) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  const receipt = await prisma.saleReceipt.findUnique({ where: { saleId: id } })
  if (!receipt) return NextResponse.json({ error: 'Keine Quittung' }, { status: 404 })

  const html = renderReceiptHtml(sale, receipt)
  const download = req.nextUrl.searchParams.get('dl') === '1'
  const fileName = receiptFileName(receipt.number, sale.date)
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
