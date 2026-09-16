import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify, compactDecrypt } from 'jose'

// --- Inline token helpers (Edge-compatible, no @/ imports) ---

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

async function getNextAuthToken(req: NextRequest): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return false
  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'
  const token = req.cookies.get(cookieName)?.value
  if (!token) return false
  try {
    const enc = new TextEncoder()
    // Derive encryption key the same way NextAuth v4 does
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HKDF' }, false, ['deriveKey']
    )
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: enc.encode(''), info: enc.encode('NextAuth.js Generated Encryption Key') },
      keyMaterial,
      { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    )
    await compactDecrypt(token, derivedKey)
    return true
  } catch {
    return false
  }
}

// --- Routing ---

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

  const hasToken = await getNextAuthToken(request)

  if (!hasToken) {
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
