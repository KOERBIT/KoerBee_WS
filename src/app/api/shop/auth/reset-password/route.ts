import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/shop/mail'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 })

  // Always return success to prevent email enumeration
  const customer = await prisma.shopCustomer.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (customer) {
    try {
      const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
      const resetToken = await new SignJWT({ sub: customer.id, purpose: 'reset' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret)

      const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
      if (admin) {
        const shopBaseUrl = process.env.SHOP_BASE_URL ?? `https://${req.headers.get('host') ?? 'localhost'}`
        await sendPasswordResetEmail({
          userId: admin.id,
          to: customer.email,
          locale: customer.locale as 'de' | 'en',
          token: resetToken,
          shopBaseUrl,
        })
      }
    } catch (e) {
      console.error('Failed to send reset email:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
