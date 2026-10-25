import { NextRequest, NextResponse } from 'next/server'
import { clientIp, rateLimitAll, tooManyRequests } from '@/lib/rate-limit'
import { SignJWT } from 'jose'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/shop/mail'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 })

  const ip = clientIp(req.headers)
  const rl = await rateLimitAll([
    [`shop-reset:${ip}:${String(email).toLowerCase()}`, 3, 60 * 60],
    [`shop-reset-ip:${ip}`, 10, 60 * 60],
  ])
  if (!rl.ok) return tooManyRequests(rl.retryAfter)

  // Always return success to prevent email enumeration
  const customer = await prisma.shopCustomer.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, locale: true, passwordHash: true },
  })

  if (customer) {
    try {
      const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
      const resetToken = await new SignJWT({ sub: customer.id, purpose: 'reset', phash: customer.passwordHash.slice(-8) })
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
