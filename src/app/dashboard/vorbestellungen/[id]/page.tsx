'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface OrderItem { product: { name: string; shopName: string | null; unit: string }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; statusChangedAt: string; note: string | null; adminNote: string | null; shopCustomer: { name: string; email: string; phone: string | null }; items: OrderItem[] }

const STATUS_LABELS: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', READY: 'bg-green-100 text-green-800', PICKED_UP: 'bg-zinc-100 text-zinc-600', CANCELLED: 'bg-rose-100 text-rose-700' }
const ACTIONS: Record<string, Array<{ label: string; status: string; color: string }>> = {
  PENDING: [{ label: 'Bestätigen', status: 'CONFIRMED', color: 'bg-blue-500 hover:bg-blue-600 text-white' }, { label: 'Stornieren', status: 'CANCELLED', color: 'bg-rose-500 hover:bg-rose-600 text-white' }],
  CONFIRMED: [{ label: 'Abholbereit melden', status: 'READY', color: 'bg-green-500 hover:bg-green-600 text-white' }, { label: 'Stornieren', status: 'CANCELLED', color: 'bg-rose-500 hover:bg-rose-600 text-white' }],
  READY: [{ label: 'Als abgeholt markieren', status: 'PICKED_UP', color: 'bg-zinc-600 hover:bg-zinc-700 text-white' }],
}

function fmt(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }

export default function VorbestellungDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/preorders/${id}`).then(r => r.json()).then(o => { setOrder(o); setAdminNote(o.adminNote ?? '') }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function changeStatus(newStatus: string) {
    setActing(true)
    const res = await fetch(`/api/admin/preorders/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, adminNote: adminNote || undefined }),
    })
    if (res.ok) { const updated = await res.json(); setOrder(updated) }
    setActing(false)
  }

  if (loading) return <div className="p-6"><p className="text-zinc-400">...</p></div>
  if (!order) return <div className="p-6"><p className="text-zinc-500">Bestellung nicht gefunden</p></div>

  const total = order.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
  const actions = ACTIONS[order.status] ?? []

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/dashboard/vorbestellungen" className="text-sm text-amber-600 hover:text-amber-700 mb-4 inline-block">&larr; Zurück</Link>

      <div className="bg-white rounded-2xl border border-zinc-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-zinc-800">Vorbestellung</h1>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
        </div>

        {/* Customer info */}
        <div className="bg-zinc-50 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Kunde</h2>
          <p className="text-sm">{order.shopCustomer.name}</p>
          <p className="text-sm text-zinc-500">{order.shopCustomer.email}</p>
          {order.shopCustomer.phone && <p className="text-sm text-zinc-500">{order.shopCustomer.phone}</p>}
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-4">
          <thead><tr className="border-b border-zinc-100 text-zinc-500"><th className="text-left py-2">Produkt</th><th className="text-right py-2">Menge</th><th className="text-right py-2">Preis</th><th className="text-right py-2">Summe</th></tr></thead>
          <tbody>
            {order.items.map((i, idx) => (
              <tr key={idx} className="border-b border-zinc-50"><td className="py-2">{i.product.shopName ?? i.product.name}</td><td className="text-right py-2">{i.quantity} {i.product.unit}</td><td className="text-right py-2">{fmt(i.priceAtOrder)}</td><td className="text-right py-2 font-medium">{fmt(i.quantity * i.priceAtOrder)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-bold text-amber-700 text-lg">{fmt(total)}</p>

        {order.note && <div className="mt-4 bg-amber-50 rounded-xl p-3"><p className="text-xs font-semibold text-amber-800 mb-1">Kundennotiz</p><p className="text-sm text-zinc-700">{order.note}</p></div>}

        <p className="text-xs text-zinc-400 mt-4">Bestellt: {new Date(order.createdAt).toLocaleString('de-DE')} | Aktualisiert: {new Date(order.statusChangedAt).toLocaleString('de-DE')}</p>
      </div>

      {/* Admin note + actions */}
      {actions.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">Aktion</h2>
          <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Interne Notiz (optional)" className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm resize-none h-16 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          <div className="flex gap-3">
            {actions.map(a => (
              <button key={a.status} onClick={() => changeStatus(a.status)} disabled={acting} className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${a.color}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
