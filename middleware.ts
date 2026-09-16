import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, jwtDecrypt } from 'jose'

async function verifyShopToken(token: string): Promise<{ sub: string } | null> {
  if (!token) return null
  try {
    const secret = process.env.SHOP_JWT_SECRET
    if (!secret) return null
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
    if (typeof payload.sub !== 'string') return null
    if (payload.purpose) return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}

async function getNextAuthToken(req: NextRequest): Promise<Record<string, unknown> | null> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return null
  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
  const token = req.cookies.get(cookieName)?.value
  if (!token) return null
  try {
    const enc = new TextEncoder()
    const signingKey = await crypto.subtle.importKey(
      'raw', enc.encode(secret).slice(0, 32),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const derived = new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, enc.encode('NextAuth.js Generated Encryption Key')))
    const { payload } = await jwtDecrypt(token, derived, { clockTolerance: 15 })
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

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

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  // --- Shop subdomain ---
  if (isShopHost(host)) {
    // Public shop paths — let through
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

    // Protected shop paths — check shop-token
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

  // --- Main domain (existing admin logic) ---
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

  const token = await getNextAuthToken(request)

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
