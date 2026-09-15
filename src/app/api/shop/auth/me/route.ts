import { NextRequest, NextResponse } from 'next/server'
import { getShopCustomerFromRequest } from '@/lib/shop/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    locale: customer.locale,
    emailVerified: customer.emailVerified,
  })
}

export async function PATCH(req: NextRequest) {
  const customer = await getShopCustomerFromRequest(req)
  if (!customer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { name, phone, locale, password } = await req.json()
  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (phone !== undefined) data.phone = phone
  if (locale === 'de' || locale === 'en') data.locale = locale
  if (password) {
    if (password.length < 8) return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  const updated = await prisma.shopCustomer.update({ where: { id: customer.id }, data })
  return NextResponse.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, locale: updated.locale })
}
