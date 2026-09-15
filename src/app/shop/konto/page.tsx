'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface OrderItem { product: { name: string; shopName: string | null }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; items: OrderItem[] }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  READY: 'bg-green-100 text-green-800',
  PICKED_UP: 'bg-zinc-100 text-zinc-600',
  CANCELLED: 'bg-rose-100 text-rose-700',
}

const STATUS_DE: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const STATUS_EN: Record<string, string> = { PENDING: 'Received', CONFIRMED: 'Confirmed', READY: 'Ready for pickup', PICKED_UP: 'Picked up', CANCELLED: 'Cancelled' }

export default function KontoPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [locale, setLocale] = useState<'de' | 'en'>('de')
  const statusLabels = locale === 'en' ? STATUS_EN : STATUS_DE

  useEffect(() => {
    const m = document.cookie.match(/shop-locale=([^;]*)/)
    if (m?.[1] === 'en') setLocale('en')
    fetch('/api/shop/orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-400">...</p>

  return (
    <>
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">{locale === 'de' ? 'Meine Bestellungen' : 'My Orders'}</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500">{locale === 'de' ? 'Du hast noch keine Bestellungen' : 'You have no orders yet'}</p>
          <Link href="/shop/produkte" className="inline-block mt-4 text-amber-600 font-medium">{locale === 'de' ? 'Jetzt bestellen' : 'Order now'}</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const total = o.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
            return (
              <Link key={o.id} href={`/shop/konto/bestellung/${o.id}`} className="block bg-white rounded-2xl border border-zinc-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-500">{new Date(o.createdAt).toLocaleDateString('de-DE')}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status] ?? 'bg-zinc-100'}`}>
                    {statusLabels[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-700">{o.items.map(i => `${i.quantity}x ${i.product.shopName ?? i.product.name}`).join(', ')}</p>
                <p className="text-amber-700 font-bold mt-1">{total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
