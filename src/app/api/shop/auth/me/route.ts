import { NextRequest, NextResponse } from 'next/server'
import { getShopCustomerFromRequest } from '@/lib/shop/auth'

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
