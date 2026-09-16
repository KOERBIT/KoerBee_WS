import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signShopToken, setShopCookie } from '@/lib/shop/auth'
import { sendVerificationEmail } from '@/lib/shop/mail'
import { SignJWT } from 'jose'

export async function POST(req: NextRequest) {
  const { name, email, password, phone, locale } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  const existing = await prisma.shopCustomer.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'email_exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const customer = await prisma.shopCustomer.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone ?? null,
      locale: locale === 'en' ? 'en' : 'de',
    },
  })

  // Send verification email (best-effort, don't block registration)
  try {
    const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
    const verifyToken = await new SignJWT({ sub: customer.id, purpose: 'verify' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(secret)

    // Find the first admin user's mail config (shop shares the admin's SMTP)
    const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
    if (admin) {
      const shopBaseUrl = process.env.SHOP_BASE_URL ?? `https://${req.headers.get('host') ?? 'localhost'}`
      await sendVerificationEmail({
        userId: admin.id,
        to: customer.email,
        locale: customer.locale as 'de' | 'en',
        token: verifyToken,
        shopBaseUrl,
      })
    }
  } catch (e) {
    console.error('Failed to send verification email:', e)
  }

  const token = await signShopToken(customer.id)
  const response = NextResponse.json(
    { id: customer.id, name: customer.name, email: customer.email },
    { status: 201 }
  )
  return setShopCookie(response, token)
}
