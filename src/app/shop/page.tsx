'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Locale = 'de' | 'en'

// Inline minimal translations for the landing page (avoids server import in client component)
const T: Record<Locale, Record<string, string>> = {
  de: {
    title: 'Imkerei-Shop',
    welcome: 'Willkommen bei unserer Imkerei',
    text: 'Bestelle frischen Honig und weitere Imkereiprodukte direkt vom Imker. Bezahlung bei Abholung.',
    cta: 'Jetzt vorbestellen',
    products: 'Produkte',
    cart: 'Warenkorb',
    account: 'Mein Konto',
    login: 'Anmelden',
    highlights: 'Unsere Produkte',
    contact: 'Kontakt',
    imprint: 'Impressum',
    pickup: 'Bezahlung & Abholung vor Ort',
  },
  en: {
    title: 'Beekeeping Shop',
    welcome: 'Welcome to our apiary',
    text: 'Pre-order fresh honey and other beekeeping products directly from the beekeeper. Pay on pickup.',
    cta: 'Pre-order now',
    products: 'Products',
    cart: 'Cart',
    account: 'My Account',
    login: 'Sign In',
    highlights: 'Our Products',
    contact: 'Contact',
    imprint: 'Imprint',
    pickup: 'Payment & pickup on site',
  },
}

interface ShopProduct {
  id: string
  name: string
  shopName: string | null
  shopNameEn: string | null
  description: string | null
  descriptionEn: string | null
  imageUrl: string | null
  price: number
  shopPrice: number | null
  unit: string
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function getCartCount(): number {
  try {
    const cart = JSON.parse(localStorage.getItem('shop-cart') ?? '[]')
    return cart.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
  } catch { return 0 }
}

export default function ShopLandingPage() {
  const [locale, setLocale] = useState<Locale>('de')
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [cartCount, setCartCount] = useState(0)
  const t = T[locale]

  useEffect(() => {
    const l = getCookie('shop-locale')
    if (l === 'en') setLocale('en')
    setCartCount(getCartCount())
    fetch('/api/shop/products')
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {})
  }, [])

  const toggleLocale = () => {
    const next = locale === 'de' ? 'en' : 'de'
    setLocale(next)
    document.cookie = `shop-locale=${next};path=/;max-age=${365 * 86400}`
  }

  const productName = (p: ShopProduct) =>
    locale === 'en' ? p.shopNameEn ?? p.shopName ?? p.name : p.shopName ?? p.name
  const productDesc = (p: ShopProduct) =>
    locale === 'en' ? p.descriptionEn ?? p.description : p.description

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800 tracking-tight">
            {t.title}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop/produkte" className="text-zinc-600 hover:text-amber-700">{t.products}</Link>
            <Link href="/shop/warenkorb" className="text-zinc-600 hover:text-amber-700 relative">
              {t.cart}
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-4 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/shop/konto" className="text-zinc-600 hover:text-amber-700">{t.account}</Link>
            <button onClick={toggleLocale} className="text-xs border border-zinc-200 rounded px-2 py-1 hover:bg-zinc-50">
              {locale === 'de' ? 'EN' : 'DE'}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-100 to-amber-50/30 py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-4">{t.welcome}</h1>
        <p className="text-lg text-amber-800/70 max-w-xl mx-auto mb-8">{t.text}</p>
        <Link
          href="/shop/produkte"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          {t.cta}
        </Link>
        <p className="mt-4 text-sm text-amber-700/60">{t.pickup}</p>
      </section>

      {/* Highlights */}
      {products.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-zinc-800 mb-8 text-center">{t.highlights}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                {p.imageUrl ? (
                  <div className="h-40 bg-amber-50 flex items-center justify-center">
                    <img src={p.imageUrl} alt={productName(p)} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 bg-amber-50 flex items-center justify-center text-4xl">🍯</div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-800">{productName(p)}</h3>
                  {productDesc(p) && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{productDesc(p)}</p>}
                  <p className="text-amber-700 font-bold mt-2">
                    {(p.shopPrice ?? p.price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {p.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-amber-100 bg-white py-8 px-4 text-center text-sm text-zinc-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-semibold text-amber-800">{t.title}</span>
          <div className="flex gap-6">
            <span>{t.contact}</span>
            <span>{t.imprint}</span>
          </div>
        </div>
      </footer>
    </>
  )
}
