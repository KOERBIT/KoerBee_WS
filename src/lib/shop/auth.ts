import { SignJWT, jwtVerify } from 'jose'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const COOKIE_NAME = 'shop-token'
const EXPIRY = '30d'

function getSecret(): Uint8Array {
  const secret = process.env.SHOP_JWT_SECRET
  if (!secret) throw new Error('SHOP_JWT_SECRET env var is missing')
  return new TextEncoder().encode(secret)
}

export async function signShopToken(customerId: string): Promise<string> {
  return new SignJWT({ sub: customerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyShopToken(
  token: string
): Promise<{ sub: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.sub !== 'string') return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}

export function setShopCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  })
  return response
}

export function clearShopCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}

export async function getShopCustomerFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifyShopToken(token)
  if (!payload) return null
  return prisma.shopCustomer.findUnique({ where: { id: payload.sub } })
}
