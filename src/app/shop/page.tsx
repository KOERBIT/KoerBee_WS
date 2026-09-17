'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Locale = 'de' | 'en'

const T: Record<Locale, Record<string, string>> = {
  de: {
    title: 'KörBee',
    subtitle: 'Imkerei',
    welcome: 'Frisch vom Stock.',
    text: 'Honig, Wachs & mehr — vorbestellen und direkt beim Imker abholen. Ehrliche Produkte, faire Preise.',
    cta: 'Jetzt entdecken',
    products: 'Produkte',
    cart: 'Warenkorb',
    account: 'Konto',
    login: 'Anmelden',
    highlights: 'Aus dem Stock',
    contact: 'Kontakt',
    imprint: 'Impressum',
    pickup: 'Bezahlung & Abholung vor Ort',
    addToCart: 'In den Korb',
    added: 'Drin!',
  },
  en: {
    title: 'KörBee',
    subtitle: 'Apiary',
    welcome: 'Fresh from the hive.',
    text: 'Honey, wax & more — pre-order and pick up directly from the beekeeper. Honest products, fair prices.',
    cta: 'Discover now',
    products: 'Products',
    cart: 'Cart',
    account: 'Account',
    login: 'Sign In',
    highlights: 'From the hive',
    contact: 'Contact',
    imprint: 'Imprint',
    pickup: 'Payment & pickup on site',
    addToCart: 'Add to cart',
    added: 'Added!',
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

interface CartItem { productId: string; quantity: number }

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function getCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem('shop-cart') ?? '[]') } catch { return [] }
}
function saveCart(cart: CartItem[]) { localStorage.setItem('shop-cart', JSON.stringify(cart)) }

function ProductCard({ p, locale, t, onAdd, justAdded }: {
  p: ShopProduct; locale: Locale; t: Record<string, string>
  onAdd: (id: string) => void; justAdded: string | null
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const name = locale === 'en' ? p.shopNameEn ?? p.shopName ?? p.name : p.shopName ?? p.name
  const desc = locale === 'en' ? p.descriptionEn ?? p.description : p.description
  const isAdded = justAdded === p.id

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div
        className="rounded-[20px] overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1"
        style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)' }}
      >
        {p.imageUrl ? (
          <div className="h-44" style={{ background: 'var(--shop-cream)' }}>
            <img src={p.imageUrl} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-5xl" style={{ background: 'var(--shop-cream)' }}>
            🍯
          </div>
        )}
        <div className="p-5 flex flex-col flex-1 gap-2">
          <h3 className="font-bold text-[.98rem]" style={{ color: 'var(--shop-ink)' }}>{name}</h3>
          {desc && <p className="text-[.78rem] leading-relaxed line-clamp-2" style={{ color: 'var(--shop-dim)' }}>{desc}</p>}
          <div className="mt-auto pt-3 flex items-center justify-between">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums', fontWeight: 500, fontSize: '.92rem' }}>
              {(p.shopPrice ?? p.price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              <span className="text-xs ml-1" style={{ color: 'var(--shop-dim)' }}>/ {p.unit}</span>
            </span>
            <button
              onClick={() => onAdd(p.id)}
              className="transition-all duration-150 active:scale-[.92]"
              style={{
                background: isAdded ? 'var(--shop-accent)' : 'var(--shop-ink)',
                color: isAdded ? 'var(--shop-accent-ink)' : 'var(--shop-bg)',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem',
                padding: '9px 15px', borderRadius: 999, border: 'none', cursor: 'pointer',
              }}
            >
              {isAdded ? t.added : t.addToCart}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShopLandingPage() {
  const [locale, setLocale] = useState<Locale>('de')
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [latestPost, setLatestPost] = useState<{ title: string; slug: string; publishedAt: string } | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const t = T[locale]

  useEffect(() => {
    const l = getCookie('shop-locale')
    if (l === 'en') setLocale('en')
    setCart(getCart())
    fetch('/api/shop/products')
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data.slice(0, 4) : []))
      .catch(() => {})

    fetch('/api/cms/blog?limit=1')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const post = data[0]
          // Only show if less than 30 days old
          const age = Date.now() - new Date(post.publishedAt).getTime()
          if (age < 30 * 24 * 60 * 60 * 1000) setLatestPost(post)
        }
      })
      .catch(() => {})

    setBannerDismissed(localStorage.getItem('shop-news-dismissed') === 'true')
  }, [])

  const toggleLocale = () => {
    const next = locale === 'de' ? 'en' : 'de'
    setLocale(next)
    document.cookie = `shop-locale=${next};path=/;max-age=${365 * 86400}`
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  function addToCart(productId: string) {
    const updated = [...cart]
    const idx = updated.findIndex(i => i.productId === productId)
    if (idx >= 0) updated[idx].quantity += 1
    else updated.push({ productId, quantity: 1 })
    setCart(updated)
    saveCart(updated)
    setJustAdded(productId)
    setTimeout(() => setJustAdded(null), 1200)
    window.dispatchEvent(new Event('korbee:add-to-cart'))
  }

  return (
    <>
      {/* Header — pill nav */}
      <header className="sticky top-0 z-50 px-4 pt-3 pb-2">
        <nav
          className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-5 py-2"
          style={{
            background: 'var(--shop-panel)', border: '1px solid var(--shop-border)',
            borderRadius: 999, boxShadow: 'var(--shop-shadow)',
          }}
        >
          <Link href="/" className="flex items-center gap-2 shrink-0" style={{ textDecoration: 'none' }}>
            <Image
              src="/Koerbee_Logo.png"
              alt="KörBee Logo"
              width={30}
              height={30}
              className="rounded-lg sm:w-9 sm:h-9"
              style={{ objectFit: 'contain' }}
            />
            <div className="flex flex-col">
              <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem', lineHeight: 1, color: 'var(--shop-ink)' }}>
                {t.title}
              </span>
              <small className="hidden sm:block" style={{ fontFamily: "'Manrope', sans-serif", fontSize: '.55rem', fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--shop-dim)' }}>
                {t.subtitle}
              </small>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link href="/shop/produkte" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500, fontSize: '.85rem' }} className="hidden sm:inline hover:opacity-70 transition-opacity">
              {t.products}
            </Link>
            <Link
              href="/shop/warenkorb"
              id="cart-icon"
              className="relative flex items-center justify-center transition-opacity hover:opacity-70 shrink-0"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--shop-panel-2)', border: '1px solid var(--shop-border)',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--shop-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                <path d="M2.5 3h2l2.6 12.6a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6" />
              </svg>
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center"
                  style={{
                    minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999,
                    background: 'var(--shop-accent)', color: 'var(--shop-accent-ink)',
                    fontSize: '.68rem', fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </Link>
            <Link href="/shop/konto" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500, fontSize: '.85rem' }} className="hidden sm:inline hover:opacity-70 transition-opacity">
              {t.account}
            </Link>
            <Link href="/shop/produkte" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="sm:hidden hover:opacity-70 transition-opacity shrink-0" aria-label={t.products}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </Link>
            <Link href="/shop/konto" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="sm:hidden hover:opacity-70 transition-opacity shrink-0" aria-label={t.account}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0112 0v1"/>
              </svg>
            </Link>
            <button
              onClick={toggleLocale}
              className="transition-opacity hover:opacity-70 shrink-0"
              style={{
                fontSize: '.65rem', fontWeight: 700, letterSpacing: '.06em',
                border: '1px solid var(--shop-border)', borderRadius: 999,
                padding: '4px 8px', background: 'transparent', color: 'var(--shop-dim)', cursor: 'pointer',
              }}
            >
              {locale === 'de' ? 'EN' : 'DE'}
            </button>
          </div>
        </nav>
      </header>

      {/* News banner */}
      {latestPost && !bannerDismissed && (
        <div className="mx-4 mt-2">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-2.5 rounded-2xl" style={{ background: 'var(--shop-cream)', border: '1px solid var(--shop-border)' }}>
            <Link href={`/blog/${latestPost.slug}`} className="flex items-center gap-2 text-[13px] font-medium" style={{ color: 'var(--shop-ink)', textDecoration: 'none' }}>
              <span style={{ color: 'var(--shop-accent)' }}>Neu:</span>
              <span className="truncate">{latestPost.title}</span>
            </Link>
            <button
              onClick={() => { setBannerDismissed(true); localStorage.setItem('shop-news-dismissed', 'true') }}
              className="text-zinc-400 hover:text-zinc-600 ml-2 shrink-0"
              style={{ fontSize: '1.1rem', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Hero / Diorama */}
      <section
        id="shop-hero"
        className="relative mx-4 mt-4 overflow-hidden"
        style={{
          height: 320, borderRadius: 26,
          border: '1px solid rgba(24,21,15,.12)',
          background: 'linear-gradient(180deg, var(--shop-sky-top) 0%, var(--shop-sky-bottom) 100%)',
          boxShadow: 'inset 0 0 0 6px var(--shop-panel), var(--shop-shadow)',
          perspective: 1000,
        }}
      >
        {/* Radial light overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at 18% 82%, rgba(255,255,255,.5) 0, rgba(255,255,255,0) 42%), radial-gradient(circle at 85% 20%, rgba(255,255,255,.35) 0, rgba(255,255,255,0) 38%)',
        }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-10">
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#2a1f0a', marginBottom: 8 }}>
            {t.welcome}
          </h1>
          <p className="max-w-md" style={{ fontSize: '1.05rem', color: '#43391f', lineHeight: 1.55, marginBottom: 24 }}>
            {t.text}
          </p>
          <Link
            href="/shop/produkte"
            className="transition-all duration-150 active:scale-[.92] hover:opacity-90"
            style={{
              background: 'var(--shop-ink)', color: 'var(--shop-bg)',
              fontWeight: 700, fontSize: '.9rem', padding: '12px 28px',
              borderRadius: 999, textDecoration: 'none',
            }}
          >
            {t.cta}
          </Link>
          <p className="mt-3" style={{ fontSize: '.78rem', color: '#43391f', opacity: 0.6 }}>{t.pickup}</p>
        </div>
      </section>

      {/* Product highlights */}
      {products.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-16">
          <div className="flex items-baseline justify-between px-1 mb-6">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t.highlights}</h2>
            <span style={{ fontSize: '.8rem', color: 'var(--shop-dim)' }}>{products.length} {locale === 'de' ? 'Produkte' : 'Products'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} locale={locale} t={t} onAdd={addToCart} justAdded={justAdded} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto px-4 py-8" style={{ fontSize: '.78rem', color: 'var(--shop-dim)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2" style={{ color: 'var(--shop-ink)' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem' }}>KörBee</span>
          </span>
          <div className="flex gap-6">
            <Link href="/kontakt" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">{t.contact}</Link>
            <Link href="/impressum" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">{t.imprint}</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
