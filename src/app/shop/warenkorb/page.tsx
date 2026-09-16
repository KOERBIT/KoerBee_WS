'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Locale = 'de' | 'en'
interface CartItem { productId: string; quantity: number }
interface ShopProduct {
  id: string; name: string; shopName: string | null; shopNameEn: string | null
  price: number; shopPrice: number | null; unit: string
}

function getLocale(): Locale { const m = document.cookie.match(/shop-locale=([^;]*)/); return m?.[1] === 'en' ? 'en' : 'de' }
function getCart(): CartItem[] { try { return JSON.parse(localStorage.getItem('shop-cart') ?? '[]') } catch { return [] } }
function saveCart(c: CartItem[]) { localStorage.setItem('shop-cart', JSON.stringify(c)) }

const L = {
  de: { cart: 'Warenkorb', empty: 'Dein Warenkorb ist leer', total: 'Gesamt', submit: 'Vorbestellung absenden', note: 'Anmerkung (optional)', login_required: 'Bitte melde dich an, um zu bestellen', login: 'Anmelden', back: 'Weiter einkaufen', success: 'Deine Vorbestellung ist eingegangen!', orders: 'Zu meinen Bestellungen', remove: 'Entfernen', pickup: 'Bezahlung & Abholung vor Ort', account: 'Konto' },
  en: { cart: 'Cart', empty: 'Your cart is empty', total: 'Total', submit: 'Submit pre-order', note: 'Note (optional)', login_required: 'Please sign in to place an order', login: 'Sign In', back: 'Continue shopping', success: 'Your pre-order has been received!', orders: 'Go to my orders', remove: 'Remove', pickup: 'Payment & pickup on site', account: 'Account' },
}

export default function WarenkorbPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('de')
  const [cart, setCart] = useState<CartItem[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [note, setNote] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const t = L[locale]

  useEffect(() => {
    setLocale(getLocale())
    setCart(getCart())
    fetch('/api/shop/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/shop/auth/me').then(r => setIsLoggedIn(r.ok)).catch(() => setIsLoggedIn(false))
  }, [])

  const productMap = new Map(products.map(p => [p.id, p]))
  const pName = (p: ShopProduct) => locale === 'en' ? p.shopNameEn ?? p.shopName ?? p.name : p.shopName ?? p.name

  function updateQty(productId: string, qty: number) {
    if (qty < 1) return removeItem(productId)
    const updated = cart.map(i => i.productId === productId ? { ...i, quantity: qty } : i)
    setCart(updated); saveCart(updated)
  }
  function removeItem(productId: string) {
    const updated = cart.filter(i => i.productId !== productId)
    setCart(updated); saveCart(updated)
  }

  const total = cart.reduce((s, i) => {
    const p = productMap.get(i.productId)
    return s + (p ? (p.shopPrice ?? p.price) * i.quantity : 0)
  }, 0)

  async function submit() {
    if (!isLoggedIn) { router.push(`/shop/login?callbackUrl=/shop/warenkorb`); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, note: note || undefined }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'unknown') }
      localStorage.removeItem('shop-cart')
      setCart([]); setSuccess(true)
    } catch (e) {
      setError((e as Error).message)
    } finally { setSubmitting(false) }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-6">🐝</div>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--shop-ink)' }}>{t.success}</h1>
        <p className="mb-8" style={{ color: 'var(--shop-dim)' }}>{t.pickup}</p>
        <Link
          href="/shop/konto"
          className="transition-all duration-150 active:scale-[.92]"
          style={{
            background: 'var(--shop-ink)', color: 'var(--shop-bg)',
            fontWeight: 700, padding: '12px 24px', borderRadius: 999, textDecoration: 'none',
          }}
        >
          {t.orders}
        </Link>
      </div>
    )
  }

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
          <Link href="/shop" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: '1.9rem', lineHeight: 1, color: 'var(--shop-ink)' }}>
              KörBee
            </span>
          </Link>
          <Link href="/shop/produkte" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--shop-dim)', textDecoration: 'none', fontWeight: 600, fontSize: '.85rem' }}>
            {t.back}
          </Link>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="mb-8" style={{ fontSize: '1.6rem', fontWeight: 800 }}>{t.cart}</h1>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-lg mb-4" style={{ color: 'var(--shop-dim)' }}>{t.empty}</p>
            <Link
              href="/shop/produkte"
              className="transition-all duration-150 active:scale-[.92]"
              style={{
                background: 'var(--shop-ink)', color: 'var(--shop-bg)',
                fontWeight: 700, padding: '10px 20px', borderRadius: 999,
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              {t.back}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {cart.map(item => {
                const p = productMap.get(item.productId)
                if (!p) return null
                const price = p.shopPrice ?? p.price
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-4 p-4 rounded-[16px]"
                    style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)', boxShadow: 'var(--shop-shadow)' }}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold" style={{ color: 'var(--shop-ink)' }}>{pName(p)}</h3>
                      <p className="text-sm" style={{ color: 'var(--shop-dim)', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {p.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                        style={{ background: 'var(--shop-panel-2)', border: '1px solid var(--shop-border)' }}
                      >−</button>
                      <span className="w-8 text-center font-bold text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
                        style={{ background: 'var(--shop-panel-2)', border: '1px solid var(--shop-border)' }}
                      >+</button>
                    </div>
                    <span className="w-24 text-right font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '.95rem' }}>
                      {(price * item.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-sm transition-opacity hover:opacity-60"
                      style={{ color: 'var(--shop-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {t.remove}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Note */}
            <div className="mt-5 rounded-[16px] p-4" style={{ background: 'var(--shop-panel)', border: '1px solid var(--shop-border)' }}>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t.note}
                className="w-full resize-none h-20 focus:outline-none"
                style={{
                  background: 'var(--shop-panel-2)', border: '1px solid var(--shop-border)',
                  borderRadius: 12, padding: '10px 14px', fontSize: '.9rem',
                  color: 'var(--shop-ink)', fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Total */}
            <div className="mt-6 flex items-center justify-between px-1">
              <span className="text-lg font-extrabold">{t.total}</span>
              <span className="text-xl font-extrabold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>

            {isLoggedIn === false && (
              <div className="mt-5 text-center p-5 rounded-[16px]" style={{ background: 'var(--shop-cream)', border: '1px solid var(--shop-border)' }}>
                <p className="mb-3 font-medium" style={{ color: 'var(--shop-ink)' }}>{t.login_required}</p>
                <Link
                  href={`/shop/login?callbackUrl=/shop/warenkorb`}
                  className="transition-all duration-150 active:scale-[.92]"
                  style={{
                    background: 'var(--shop-ink)', color: 'var(--shop-bg)',
                    fontWeight: 700, padding: '10px 22px', borderRadius: 999,
                    textDecoration: 'none', display: 'inline-block',
                  }}
                >
                  {t.login}
                </Link>
              </div>
            )}

            {error && <p className="mt-4 text-sm" style={{ color: '#dc2626' }}>{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || isLoggedIn === false}
              className="mt-5 w-full transition-all duration-150 active:scale-[.98] disabled:opacity-40"
              style={{
                background: 'var(--shop-ink)', color: 'var(--shop-bg)',
                fontWeight: 700, fontSize: '.95rem', padding: '14px 0',
                borderRadius: 999, border: 'none', cursor: 'pointer',
              }}
            >
              {submitting ? '...' : t.submit}
            </button>
            <p className="mt-3 text-center" style={{ fontSize: '.78rem', color: 'var(--shop-dim)' }}>{t.pickup}</p>
          </>
        )}
      </main>
    </>
  )
}
