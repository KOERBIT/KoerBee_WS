import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that never require authentication
const PUBLIC_PATHS = [
  '/',
  '/impressum',
  '/datenschutz',
  '/widerruf',
  '/versand',
  '/kontakt',
  '/login',
  '/api/auth',
  '/api/health',
  '/api/shop',
  '/shop',
  '/_next',
  '/favicon',
  '/sitemap.xml',
  '/robots.txt',
]

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) =>
    pathname === p || pathname.startsWith(p + '/')
  )
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths — always allow
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Admin paths — check for session cookie
  const hasSession =
    request.cookies.has('__Secure-next-auth.session-token') ||
    request.cookies.has('next-auth.session-token')

  if (!hasSession) {
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
