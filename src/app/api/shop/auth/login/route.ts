import { NextRequest, NextResponse } from 'next/server'
import { clientIp, rateLimitAll, tooManyRequests } from '@/lib/rate-limit'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signShopToken, setShopCookie } from '@/lib/shop/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

  const ip = clientIp(req.headers)
  const rl = await rateLimitAll([
    [`shop-login:${ip}:${String(email).toLowerCase()}`, 10, 15 * 60],
    [`shop-login-ip:${ip}`, 40, 15 * 60],
  ])
  if (!rl.ok) return tooManyRequests(rl.retryAfter)

  const customer = await prisma.shopCustomer.findUnique({
    where: { email: email.toLowerCase() },
  })
  if (!customer) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, customer.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = await signShopToken(customer.id)
  const response = NextResponse.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    locale: customer.locale,
    emailVerified: customer.emailVerified,
  })
  return setShopCookie(response, token)
}
