'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface OrderItem { product: { name: string; shopName: string | null; unit: string }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; statusChangedAt: string; note: string | null; items: OrderItem[] }

const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', READY: 'bg-green-100 text-green-800', PICKED_UP: 'bg-zinc-100 text-zinc-600', CANCELLED: 'bg-rose-100 text-rose-700' }
const STATUS_DE: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const STATUS_EN: Record<string, string> = { PENDING: 'Received', CONFIRMED: 'Confirmed', READY: 'Ready for pickup', PICKED_UP: 'Picked up', CANCELLED: 'Cancelled' }

export default function BestellungDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const locale = (typeof document !== 'undefined' && document.cookie.match(/shop-locale=([^;]*)/)?.[1] === 'en' ? 'en' : 'de') as 'de' | 'en'
  const statusLabels = locale === 'en' ? STATUS_EN : STATUS_DE

  useEffect(() => {
    fetch(`/api/shop/orders/${id}`).then(r => r.json()).then(setOrder).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-zinc-400">...</p>
  if (!order) return <p className="text-zinc-500">{locale === 'de' ? 'Bestellung nicht gefunden' : 'Order not found'}</p>

  const total = order.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)

  return (
    <>
      <Link href="/shop/konto" className="text-sm text-amber-600 hover:text-amber-700 mb-4 inline-block">&larr; {locale === 'de' ? 'Zurück' : 'Back'}</Link>
      <div className="bg-white rounded-2xl border border-zinc-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-zinc-800">{locale === 'de' ? 'Bestelldetails' : 'Order Details'}</h1>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status]}`}>{statusLabels[order.status]}</span>
        </div>
        <p className="text-sm text-zinc-500 mb-1">{locale === 'de' ? 'Bestellt am' : 'Ordered on'}: {new Date(order.createdAt).toLocaleDateString('de-DE')}</p>
        <p className="text-sm text-zinc-500 mb-4">{locale === 'de' ? 'Letzte Aktualisierung' : 'Last update'}: {new Date(order.statusChangedAt).toLocaleDateString('de-DE')}</p>

        <table className="w-full text-sm mb-4">
          <thead><tr className="border-b border-zinc-100 text-zinc-500"><th className="text-left py-2">{locale === 'de' ? 'Produkt' : 'Product'}</th><th className="text-right py-2">{locale === 'de' ? 'Menge' : 'Qty'}</th><th className="text-right py-2">{locale === 'de' ? 'Preis' : 'Price'}</th><th className="text-right py-2">{locale === 'de' ? 'Summe' : 'Subtotal'}</th></tr></thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx} className="border-b border-zinc-50">
                <td className="py-2">{i.product.shopName ?? i.product.name}</td>
                <td className="text-right py-2">{i.quantity} {i.product.unit}</td>
                <td className="text-right py-2">{i.priceAtOrder.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
                <td className="text-right py-2 font-medium">{(i.quantity * i.priceAtOrder).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-bold text-amber-700 text-lg">{total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
        {order.note && <p className="mt-4 text-sm text-zinc-600 bg-zinc-50 rounded-xl p-3">{order.note}</p>}
      </div>
    </>
  )
}
