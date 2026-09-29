import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

function shopBase(req: NextRequest): string {
  return process.env.SHOP_BASE_URL ?? `https://${req.headers.get('host') ?? 'localhost'}`
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.redirect(`${shopBase(req)}/shop/login?verify_error=missing`)
  }

  try {
    const secret = new TextEncoder().encode(process.env.SHOP_JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== 'verify' || typeof payload.sub !== 'string') {
      return NextResponse.redirect(`${shopBase(req)}/shop/login?verify_error=invalid`)
    }

    // Check if already verified
    const customer = await prisma.shopCustomer.findUnique({ where: { id: payload.sub } })
    if (!customer) {
      return NextResponse.redirect(`${shopBase(req)}/shop/login?verify_error=invalid`)
    }
    if (customer.emailVerified) {
      // Already verified — just redirect to login success
      return NextResponse.redirect(`${shopBase(req)}/shop/login?verified=1`)
    }

    await prisma.shopCustomer.update({
      where: { id: payload.sub },
      data: { emailVerified: true },
    })

    return NextResponse.redirect(`${shopBase(req)}/shop/login?verified=1`)
  } catch {
    return NextResponse.redirect(`${shopBase(req)}/shop/login?verify_error=expired`)
  }
}
