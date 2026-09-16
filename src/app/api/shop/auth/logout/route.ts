import { NextResponse } from 'next/server'
import { clearShopCookie } from '@/lib/shop/auth'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  return clearShopCookie(response)
}
