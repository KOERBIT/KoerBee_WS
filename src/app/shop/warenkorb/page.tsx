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
  de: { cart: 'Warenkorb', empty: 'Dein Warenkorb ist leer', total: 'Gesamt', submit: 'Vorbestellung absenden', note: 'Anmerkung (optional)', login_required: 'Bitte melde dich an, um zu bestellen', login: 'Anmelden', back: 'Weiter einkaufen', success: 'Deine Vorbestellung ist eingegangen!', orders: 'Zu meinen Bestellungen', remove: 'Entfernen', quantity: 'Menge', pickup: 'Bezahlung & Abholung vor Ort' },
  en: { cart: 'Cart', empty: 'Your cart is empty', total: 'Total', submit: 'Submit pre-order', note: 'Note (optional)', login_required: 'Please sign in to place an order', login: 'Sign In', back: 'Continue shopping', success: 'Your pre-order has been received!', orders: 'Go to my orders', remove: 'Remove', quantity: 'Qty', pickup: 'Payment & pickup on site' },
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
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-zinc-800 mb-2">{t.success}</h1>
        <p className="text-zinc-500 mb-6">{t.pickup}</p>
        <Link href="/shop/konto" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl">{t.orders}</Link>
      </div>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800">KörBee</Link>
          <Link href="/shop/produkte" className="text-sm text-amber-600 hover:text-amber-700">{t.back}</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-800 mb-6">{t.cart}</h1>

        {cart.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg">{t.empty}</p>
            <Link href="/shop/produkte" className="inline-block mt-4 text-amber-600 hover:text-amber-700 font-medium">{t.back}</Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {cart.map(item => {
                const p = productMap.get(item.productId)
                if (!p) return null
                const price = p.shopPrice ?? p.price
                return (
                  <div key={item.productId} className="bg-white rounded-2xl border border-zinc-100 p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-800">{pName(p)}</h3>
                      <p className="text-sm text-zinc-500">{price.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} / {p.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50">−</button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center hover:bg-zinc-50">+</button>
                    </div>
                    <span className="font-bold text-amber-700 w-20 text-right">{(price * item.quantity).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                    <button onClick={() => removeItem(item.productId)} className="text-zinc-400 hover:text-rose-500 text-sm">{t.remove}</button>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-zinc-100 p-4">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t.note}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-lg font-bold text-zinc-800">{t.total}: {total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
            </div>

            {isLoggedIn === false && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-800 mb-2">{t.login_required}</p>
                <Link href={`/shop/login?callbackUrl=/shop/warenkorb`} className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-xl">{t.login}</Link>
              </div>
            )}

            {error && <p className="mt-4 text-rose-600 text-sm">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting || isLoggedIn === false}
              className="mt-4 w-full bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {submitting ? '...' : t.submit}
            </button>
            <p className="mt-2 text-center text-sm text-zinc-400">{t.pickup}</p>
          </>
        )}
      </main>
    </>
  )
}
