import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'token_missing' }, { status: 400 })
  }

  try {
    const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'verify' || typeof payload.sub !== 'string') {
      return NextResponse.json({ error: 'invalid_token' }, { status: 400 })
    }

    await prisma.shopCustomer.update({
      where: { id: payload.sub },
      data: { emailVerified: true },
    })

    // Redirect to shop login with success message
    const shopBase = process.env.SHOP_BASE_URL ?? `https://${req.headers.get('host') ?? 'localhost'}`
    return NextResponse.redirect(`${shopBase}/shop/login?verified=1`)
  } catch {
    return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 })
  }
}
