import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureReceipt, renderReceiptHtml, normalizePaymentMethod, receiptFileName } from '@/lib/receipt/service'
import { formatReceiptNumber } from '@/lib/receipt/render'
import { getSmtpConfigForUser, sendReceiptMail } from '@/lib/receipt/mail'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST: Quittung per SMTP an den Kunden (oder eine angegebene Adresse) senden.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const sale = await prisma.sale.findFirst({
    where: { id, userId: session.user.id },
    include: { items: { include: { product: true } }, customer: true },
  })
  if (!sale) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  let body: { to?: unknown; paymentMethod?: unknown } = {}
  try { body = await req.json() } catch { /* egal */ }

  const to = (typeof body.to === 'string' && body.to.trim()) || sale.customer?.email || ''
  if (!to || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: 'no_recipient' }, { status: 422 })
  }

  const cfg = await getSmtpConfigForUser(session.user.id)
  if (!cfg) return NextResponse.json({ error: 'smtp_not_configured' }, { status: 422 })

  const paymentMethod = body.paymentMethod != null ? normalizePaymentMethod(body.paymentMethod) : undefined
  const receipt = await ensureReceipt(session.user.id, id, paymentMethod)
  const html = renderReceiptHtml(sale, receipt)
  const nr = formatReceiptNumber(receipt.number, sale.date)

  try {
    await sendReceiptMail({
      cfg,
      to,
      subject: `Deine Quittung ${nr} – Imkerei KörBee`,
      html,
      fileName: receiptFileName(receipt.number, sale.date),
      senderName: 'Imkerei KörBee',
    })
  } catch {
    return NextResponse.json({ error: 'send_failed' }, { status: 502 })
  }

  await prisma.saleReceipt.update({
    where: { saleId: id },
    data: { recipient: to, emailedAt: new Date() },
  })

  return NextResponse.json({ ok: true, to, formatted: nr })
}
