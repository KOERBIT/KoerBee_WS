'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Locale = 'de' | 'en'

interface ShopProduct {
  id: string; name: string; shopName: string | null; shopNameEn: string | null
  description: string | null; descriptionEn: string | null; imageUrl: string | null
  price: number; shopPrice: number | null; unit: string
}
interface CartItem { productId: string; quantity: number }

function getLocale(): Locale {
  const match = document.cookie.match(/shop-locale=([^;]*)/)
  return match?.[1] === 'en' ? 'en' : 'de'
}
function getCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem('shop-cart') ?? '[]') } catch { return [] }
}
function saveCart(cart: CartItem[]) { localStorage.setItem('shop-cart', JSON.stringify(cart)) }

const L = {
  de: { products: 'Produkte', add: 'In den Korb', added: 'Drin!', cart: 'Warenkorb', back: 'Zurück', empty: 'Noch keine Produkte verfügbar', account: 'Konto' },
  en: { products: 'Products', add: 'Add to cart', added: 'Added!', cart: 'Cart', back: 'Back', empty: 'No products available yet', account: 'Account' },
}

function RevealCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function ProduktePage() {
  const [locale, setLocale] = useState<Locale>('de')
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const t = L[locale]

  useEffect(() => {
    setLocale(getLocale())
    setCart(getCart())
    fetch('/api/shop/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const pName = (p: ShopProduct) => locale === 'en' ? p.shopNameEn ?? p.shopName ?? p.name : p.shopName ?? p.name
  const pDesc = (p: ShopProduct) => locale === 'en' ? p.descriptionEn ?? p.description : p.description

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

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      {/* Header — pill nav */}
      <header className="sticky top-0 z-50 px-4 pt-3 pb-2">
        <nav
          className="max-w-3xl mx-auto flex items-center justify-between gap-3 px-5 py-2.5"
          style={{
            background: 'var(--shop-panel)', border: '1px solid var(--shop-border)',
            borderRadius: 999, boxShadow: 'var(--shop-shadow)',
          }}
        >
          <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={32} height={32} className="rounded-lg" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.5rem', lineHeight: 1, color: 'var(--shop-ink)' }}>
              KörBee
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/shop/warenkorb"
              id="cart-icon"
              className="relative flex items-center justify-center transition-opacity hover:opacity-70"
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--shop-panel-2)', border: '1px solid var(--shop-border)',
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="var(--shop-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <Link href="/shop/konto" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 500 }} className="hover:opacity-70 transition-opacity">
              {t.account}
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="mb-8" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.products}</h1>
        {products.length === 0 ? (
          <p style={{ color: 'var(--shop-dim)' }}>{t.empty}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p, i) => (
              <RevealCard key={p.id} delay={i * 80}>
                <div
                  className="rounded-[20px] overflow-hidden flex flex-col transition-transform duration-300 hover:-translate-y-1"
                  style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)' }}
                >
                  {p.imageUrl ? (
                    <div className="h-52" style={{ background: 'var(--shop-cream)' }}>
                      <img src={p.imageUrl} alt={pName(p)} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-52 flex items-center justify-center text-5xl" style={{ background: 'var(--shop-cream)' }}>🍯</div>
                  )}
                  <div className="p-5 flex flex-col flex-1 gap-2">
                    <h3 className="font-bold text-lg" style={{ color: 'var(--shop-ink)' }}>{pName(p)}</h3>
                    {pDesc(p) && <p className="text-sm leading-relaxed" style={{ color: 'var(--shop-dim)' }}>{pDesc(p)}</p>}
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontVariantNumeric: 'tabular-nums', fontWeight: 500, fontSize: '.95rem' }}>
                        {(p.shopPrice ?? p.price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        <span className="text-xs ml-1" style={{ color: 'var(--shop-dim)' }}>/ {p.unit}</span>
                      </span>
                      <button
                        onClick={() => addToCart(p.id)}
                        className="transition-all duration-150 active:scale-[.92]"
                        style={{
                          background: justAdded === p.id ? 'var(--shop-accent)' : 'var(--shop-ink)',
                          color: justAdded === p.id ? 'var(--shop-accent-ink)' : 'var(--shop-bg)',
                          fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem',
                          padding: '9px 15px', borderRadius: 999, border: 'none', cursor: 'pointer',
                        }}
                      >
                        {justAdded === p.id ? t.added : t.add}
                      </button>
                    </div>
                  </div>
                </div>
              </RevealCard>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto px-4 py-8" style={{ fontSize: '.78rem', color: 'var(--shop-dim)' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="flex items-center gap-2" style={{ color: 'var(--shop-ink)' }}>
            <Image src="/Koerbee_Logo.png" alt="KörBee" width={24} height={24} className="rounded-md" style={{ objectFit: 'contain' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.3rem' }}>KörBee</span>
          </span>
          <div className="flex gap-6">
            <Link href="/kontakt" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">{locale === 'de' ? 'Kontakt' : 'Contact'}</Link>
            <Link href="/impressum" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">{locale === 'de' ? 'Impressum' : 'Imprint'}</Link>
            <Link href="/datenschutz" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">{locale === 'de' ? 'Datenschutz' : 'Privacy'}</Link>
            <Link href="/widerruf" style={{ color: 'var(--shop-dim)', textDecoration: 'none' }} className="hover:opacity-70 transition-opacity">{locale === 'de' ? 'Widerruf' : 'Withdrawal'}</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
