import { NextRequest, NextResponse } from 'next/server'
import de from './locales/de.json'
import en from './locales/en.json'

export type Locale = 'de' | 'en'

const translations: Record<Locale, Record<string, string>> = { de, en }

const COOKIE_NAME = 'shop-locale'

/** Look up a translation key. Falls back: requested locale → DE → raw key. */
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations.de[key] ?? key
}

export function getLocaleFromCookie(request: NextRequest): Locale {
  const val = request.cookies.get(COOKIE_NAME)?.value
  return val === 'en' ? 'en' : 'de'
}

export function setLocaleCookie(
  response: NextResponse,
  locale: Locale
): NextResponse {
  response.cookies.set(COOKIE_NAME, locale, {
    httpOnly: false, // readable by client JS for language toggle
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
  })
  return response
}
