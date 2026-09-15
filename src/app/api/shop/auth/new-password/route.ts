import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) {
    return NextResponse.json({ error: 'token and password required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  try {
    const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'reset' || typeof payload.sub !== 'string') {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    // Verify the token hasn't already been used by checking current password hash
    const customer = await prisma.shopCustomer.findUnique({ where: { id: payload.sub }, select: { passwordHash: true } })
    if (!customer) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }
    // If token includes a password hash snapshot, verify it hasn't changed (single-use enforcement)
    if (payload.phash && payload.phash !== customer.passwordHash.slice(-8)) {
      return NextResponse.json({ error: 'token_already_used' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.shopCustomer.update({
      where: { id: payload.sub },
      data: { passwordHash },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 })
  }
}
