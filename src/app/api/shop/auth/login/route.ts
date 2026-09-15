import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signShopToken, setShopCookie } from '@/lib/shop/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 })
  }

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
