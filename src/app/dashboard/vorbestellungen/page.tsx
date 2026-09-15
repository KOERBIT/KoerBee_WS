'use client'

import { useState, useEffect, useCallback } from 'react'

interface OrderItem { product: { name: string; shopName: string | null }; quantity: number; priceAtOrder: number }
interface Order { id: string; status: string; createdAt: string; shopCustomer: { name: string; email: string }; items: OrderItem[] }
interface Stats { pending: number; confirmed: number; ready: number; pickedUpThisWeek: number; productSummary: Array<{ productName: string; totalOrdered: number }> }

const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800', READY: 'bg-green-100 text-green-800', PICKED_UP: 'bg-zinc-100 text-zinc-600', CANCELLED: 'bg-rose-100 text-rose-700' }
const STATUS_LABELS: Record<string, string> = { PENDING: 'Eingegangen', CONFIRMED: 'Bestätigt', READY: 'Abholbereit', PICKED_UP: 'Abgeholt', CANCELLED: 'Storniert' }
const FILTER_OPTIONS = ['', 'PENDING', 'CONFIRMED', 'READY', 'PICKED_UP', 'CANCELLED']

function fmt(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }

export default function VorbestellungenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (filter) params.set('status', filter)
    if (search) params.set('search', search)
    fetch(`/api/admin/preorders?${params}`).then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : []))
    fetch('/api/admin/preorders/stats').then(r => r.json()).then(setStats)
  }, [filter, search])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Vorbestellungen</h1>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Offen</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></div>
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Bestätigt</p><p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p></div>
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Abholbereit</p><p className="text-2xl font-bold text-green-600">{stats.ready}</p></div>
          <div className="bg-white rounded-2xl border border-zinc-100 p-4"><p className="text-sm text-zinc-500">Diese Woche abgeholt</p><p className="text-2xl font-bold text-zinc-600">{stats.pickedUpThisWeek}</p></div>
        </div>
      )}

      {/* Product summary */}
      {stats && stats.productSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 p-4 mb-6">
          <h2 className="text-sm font-semibold text-zinc-700 mb-2">Vorbestellte Produkte (offen)</h2>
          <div className="flex flex-wrap gap-3">
            {stats.productSummary.map((p, i) => (
              <span key={i} className="text-sm bg-amber-50 text-amber-800 px-3 py-1 rounded-full">{p.totalOrdered}x {p.productName}</span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border border-zinc-200 rounded-xl px-3 py-2 text-sm">
          <option value="">Alle Status</option>
          {FILTER_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche (Name, E-Mail)..." className="border border-zinc-200 rounded-xl px-3 py-2 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-300" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-100 text-zinc-500 text-left"><th className="px-4 py-3">Datum</th><th className="px-4 py-3">Kunde</th><th className="px-4 py-3">Positionen</th><th className="px-4 py-3 text-right">Summe</th><th className="px-4 py-3">Status</th></tr></thead>
          <tbody>
            {orders.map(o => {
              const total = o.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
              return (
                <tr key={o.id} className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer" onClick={() => window.location.href = `/dashboard/vorbestellungen/${o.id}`}>
                  <td className="px-4 py-3">{new Date(o.createdAt).toLocaleDateString('de-DE')}</td>
                  <td className="px-4 py-3"><div className="font-medium">{o.shopCustomer.name}</div><div className="text-zinc-400 text-xs">{o.shopCustomer.email}</div></td>
                  <td className="px-4 py-3">{o.items.map(i => `${i.quantity}x ${i.product.shopName ?? i.product.name}`).join(', ')}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(total)}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
                </tr>
              )
            })}
            {orders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400">Keine Vorbestellungen gefunden</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
