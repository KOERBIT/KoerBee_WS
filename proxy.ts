import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyShopToken } from '@/lib/shop/verify-token'

// Paths on the shop subdomain that require a valid shop-token
const SHOP_AUTH_PATHS = ['/shop/konto', '/api/shop/orders']

function isShopHost(host: string): boolean {
  const shopHost = process.env.SHOP_HOST
  if (shopHost && host.startsWith(shopHost)) return true
  return host.startsWith('shop.')
}

function needsShopAuth(pathname: string): boolean {
  return SHOP_AUTH_PATHS.some((p) => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // --- Shop subdomain ---
  if (isShopHost(host)) {
    if (
      pathname.startsWith('/shop/login') ||
      pathname.startsWith('/shop/registrieren') ||
      pathname.startsWith('/shop/passwort-vergessen') ||
      pathname.startsWith('/api/shop/auth') ||
      pathname.startsWith('/api/shop/products') ||
      pathname === '/shop' ||
      pathname.startsWith('/shop/produkte') ||
      pathname.startsWith('/shop/warenkorb') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname === '/api/health'
    ) {
      return NextResponse.next()
    }

    if (needsShopAuth(pathname)) {
      const token = request.cookies.get('shop-token')?.value
      if (!token) {
        const loginUrl = new URL('/shop/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
      const payload = await verifyShopToken(token)
      if (!payload) {
        const loginUrl = new URL('/shop/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }

    return NextResponse.next()
  }

  // --- Main domain ---
  if (
    pathname === '/' ||
    pathname.startsWith('/impressum') ||
    pathname.startsWith('/datenschutz') ||
    pathname.startsWith('/widerruf') ||
    pathname.startsWith('/versand') ||
    pathname.startsWith('/kontakt') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/shop/products') ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname === '/favicon.ico' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
