'use client'

import { useState, useEffect } from 'react'
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
  de: { products: 'Produkte', add: 'In den Warenkorb', added: 'Hinzugefügt!', cart: 'Warenkorb', back: 'Zurück', empty: 'Noch keine Produkte verfügbar' },
  en: { products: 'Products', add: 'Add to cart', added: 'Added!', cart: 'Cart', back: 'Back', empty: 'No products available yet' },
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
    setTimeout(() => setJustAdded(null), 1500)
  }

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-amber-100">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/shop" className="text-lg font-bold text-amber-800">KörBee</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop/warenkorb" className="text-zinc-600 hover:text-amber-700 relative">
              {t.cart}
              {cartCount > 0 && <span className="absolute -top-2 -right-4 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartCount}</span>}
            </Link>
            <Link href="/shop/konto" className="text-zinc-600 hover:text-amber-700">{locale === 'de' ? 'Mein Konto' : 'My Account'}</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-zinc-800 mb-8">{t.products}</h1>
        {products.length === 0 ? (
          <p className="text-zinc-500">{t.empty}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col">
                {p.imageUrl ? (
                  <div className="h-48 bg-amber-50"><img src={p.imageUrl} alt={pName(p)} className="w-full h-full object-cover" /></div>
                ) : (
                  <div className="h-48 bg-amber-50 flex items-center justify-center text-5xl">🍯</div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-zinc-800 text-lg">{pName(p)}</h3>
                  {pDesc(p) && <p className="text-sm text-zinc-500 mt-1">{pDesc(p)}</p>}
                  <div className="mt-auto pt-4 flex items-center justify-between">
                    <span className="text-amber-700 font-bold text-lg">
                      {(p.shopPrice ?? p.price).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      <span className="text-sm font-normal text-zinc-400"> / {p.unit}</span>
                    </span>
                    <button
                      onClick={() => addToCart(p.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        justAdded === p.id
                          ? 'bg-green-500 text-white'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {justAdded === p.id ? t.added : t.add}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
