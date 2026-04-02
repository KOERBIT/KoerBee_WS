'use client'

import { useState, useEffect, useCallback } from 'react'

type Tab = 'verkauf' | 'kommission' | 'artikel'

interface Product { id: string; name: string; unit: string; price: number; description: string | null }
interface SaleItem { id: string; product: Product; quantity: number; price: number; total: number }
interface Sale { id: string; date: string; customerName: string | null; total: number; notes: string | null; items: SaleItem[] }
interface ConsignmentItem { id: string; product: Product; quantity: number; price: number; soldQuantity: number; returnedQuantity: number }
interface Consignment { id: string; date: string; locationName: string | null; status: string; notes: string | null; items: ConsignmentItem[] }

function fmt(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:   { label: 'Aktiv',       color: 'bg-amber-100 text-amber-700' },
  settled:  { label: 'Abgerechnet', color: 'bg-green-100 text-green-700' },
  returned: { label: 'Zurückgeholt', color: 'bg-zinc-100 text-zinc-600' },
}

export default function KassenbuchPage() {
  const [tab, setTab] = useState<Tab>('verkauf')
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [consignments, setConsignments] = useState<Consignment[]>([])
  const [loading, setLoading] = useState(true)

  // Sale form
  const [showSale, setShowSale] = useState(false)
  const [saleCustomer, setSaleCustomer] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10))
  const [saleNotes, setSaleNotes] = useState('')
  const [saleItems, setSaleItems] = useState([{ productId: '', quantity: 1, price: 0 }])
  const [savingSale, setSavingSale] = useState(false)

  // Consignment form
  const [showConsignment, setShowConsignment] = useState(false)
  const [consLocation, setConsLocation] = useState('')
  const [consDate, setConsDate] = useState(new Date().toISOString().slice(0, 10))
  const [consNotes, setConsNotes] = useState('')
  const [consItems, setConsItems] = useState([{ productId: '', quantity: 1, price: 0 }])
  const [savingCons, setSavingCons] = useState(false)

  // Product form
  const [showProduct, setShowProduct] = useState(false)
  const [prodName, setProdName] = useState('')
  const [prodUnit, setProdUnit] = useState('Stück')
  const [prodPrice, setProdPrice] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [savingProd, setSavingProd] = useState(false)

  const load = useCallback(async () => {
    const [p, s, c] = await Promise.all([
      fetch('/api/kassenbuch/products').then(r => r.json()),
      fetch('/api/kassenbuch/sales').then(r => r.json()),
      fetch('/api/kassenbuch/consignments').then(r => r.json()),
    ])
    setProducts(p)
    setSales(s)
    setConsignments(c)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-fill price when product selected
  function updateSaleItem(i: number, key: string, value: string | number) {
    setSaleItems(items => items.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [key]: value }
      if (key === 'productId') {
        const p = products.find(p => p.id === value)
        if (p) updated.price = p.price
      }
      return updated
    }))
  }
  function updateConsItem(i: number, key: string, value: string | number) {
    setConsItems(items => items.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [key]: value }
      if (key === 'productId') {
        const p = products.find(p => p.id === value)
        if (p) updated.price = p.price
      }
      return updated
    }))
  }

  async function saveSale(e: React.FormEvent) {
    e.preventDefault()
    setSavingSale(true)
    await fetch('/api/kassenbuch/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: saleCustomer, date: saleDate, notes: saleNotes, items: saleItems }),
    })
    setSavingSale(false)
    setShowSale(false)
    setSaleCustomer(''); setSaleNotes(''); setSaleItems([{ productId: '', quantity: 1, price: 0 }])
    load()
  }

  async function deleteSale(id: string) {
    if (!confirm('Verkauf löschen?')) return
    await fetch(`/api/kassenbuch/sales/${id}`, { method: 'DELETE' })
    load()
  }

  async function saveConsignment(e: React.FormEvent) {
    e.preventDefault()
    setSavingCons(true)
    await fetch('/api/kassenbuch/consignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationName: consLocation, date: consDate, notes: consNotes, items: consItems }),
    })
    setSavingCons(false)
    setShowConsignment(false)
    setConsLocation(''); setConsNotes(''); setConsItems([{ productId: '', quantity: 1, price: 0 }])
    load()
  }

  async function updateConsignmentStatus(id: string, status: string) {
    await fetch(`/api/kassenbuch/consignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function deleteConsignment(id: string) {
    if (!confirm('Kommission löschen?')) return
    await fetch(`/api/kassenbuch/consignments/${id}`, { method: 'DELETE' })
    load()
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSavingProd(true)
    await fetch('/api/kassenbuch/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: prodName, unit: prodUnit, price: parseFloat(prodPrice), description: prodDesc }),
    })
    setSavingProd(false)
    setShowProduct(false)
    setProdName(''); setProdPrice(''); setProdDesc('')
    load()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Artikel löschen?')) return
    await fetch(`/api/kassenbuch/products/${id}`, { method: 'DELETE' })
    load()
  }

  // Stats
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0)
  const thisMonth = sales.filter(s => new Date(s.date).getMonth() === new Date().getMonth() && new Date(s.date).getFullYear() === new Date().getFullYear())
  const monthTotal = thisMonth.reduce((s, sale) => s + sale.total, 0)
  const activeConsignments = consignments.filter(c => c.status === 'active')
  const consignmentValue = activeConsignments.reduce((s, c) => s + c.items.reduce((si, i) => si + i.quantity * i.price, 0), 0)

  if (loading) return (
    <div className="px-8 py-8 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
    </div>
  )

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Kassenbuch</h1>
          <p className="text-zinc-500 text-[14px] mt-1">Honigverkauf & Kommission</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Diesen Monat</p>
          <p className="text-xl font-semibold text-zinc-900">{fmt(monthTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Gesamt</p>
          <p className="text-xl font-semibold text-zinc-900">{fmt(totalSales)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Kommission</p>
          <p className="text-xl font-semibold text-zinc-900">{fmt(consignmentValue)}</p>
          <p className="text-[11px] text-zinc-400">{activeConsignments.length} aktiv</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-6">
        {(['verkauf', 'kommission', 'artikel'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'verkauf' ? 'Verkäufe' : t === 'kommission' ? 'Kommission' : 'Artikel'}
          </button>
        ))}
      </div>

      {/* VERKÄUFE */}
      {tab === 'verkauf' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowSale(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Verkauf erfassen
            </button>
          </div>

          {sales.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
              <p className="text-[15px] font-medium text-zinc-900">Noch keine Verkäufe</p>
              <p className="text-[13px] text-zinc-400 mt-1">Erfasse deinen ersten Honigverkauf</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map(sale => (
                <div key={sale.id} className="bg-white rounded-2xl shadow-sm px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-zinc-900">
                          {sale.customerName || 'Laufkundschaft'}
                        </span>
                        <span className="text-[12px] text-zinc-400">{fmtDate(sale.date)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {sale.items.map(item => (
                          <span key={item.id} className="text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                            {item.quantity}× {item.product.name} ({fmt(item.price)})
                          </span>
                        ))}
                      </div>
                      {sale.notes && <p className="text-[12px] text-zinc-400 mt-1">{sale.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className="text-[15px] font-semibold text-zinc-900">{fmt(sale.total)}</span>
                      <button onClick={() => deleteSale(sale.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KOMMISSION */}
      {tab === 'kommission' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowConsignment(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Kommission anlegen
            </button>
          </div>

          {consignments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
              <p className="text-[15px] font-medium text-zinc-900">Noch keine Kommissionen</p>
              <p className="text-[13px] text-zinc-400 mt-1">Leg fest was du wo auf Kommission hingestellt hast</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consignments.map(c => {
                const st = STATUS_LABELS[c.status] ?? STATUS_LABELS.active
                const totalValue = c.items.reduce((s, i) => s + i.quantity * i.price, 0)
                return (
                  <div key={c.id} className="bg-white rounded-2xl shadow-sm px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-zinc-900">{c.locationName || '—'}</span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          <span className="text-[12px] text-zinc-400">{fmtDate(c.date)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.items.map(item => (
                            <span key={item.id} className="text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                              {item.quantity}× {item.product.name}
                              {item.soldQuantity > 0 && ` (${item.soldQuantity} verk.)`}
                              {item.returnedQuantity > 0 && ` (${item.returnedQuantity} zurück)`}
                            </span>
                          ))}
                        </div>
                        {c.notes && <p className="text-[12px] text-zinc-400 mt-1">{c.notes}</p>}
                        {c.status === 'active' && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => updateConsignmentStatus(c.id, 'settled')}
                              className="text-[12px] font-medium text-green-600 hover:text-green-700 px-3 py-1 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              Abgerechnet
                            </button>
                            <button onClick={() => updateConsignmentStatus(c.id, 'returned')}
                              className="text-[12px] font-medium text-zinc-600 hover:text-zinc-700 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
                              Zurückgeholt
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <span className="text-[14px] font-semibold text-zinc-900">{fmt(totalValue)}</span>
                        <button onClick={() => deleteConsignment(c.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ARTIKEL */}
      {tab === 'artikel' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowProduct(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Artikel anlegen
            </button>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
              <p className="text-[15px] font-medium text-zinc-900">Noch keine Artikel</p>
              <p className="text-[13px] text-zinc-400 mt-1">Leg zuerst deine Produkte an (z.B. Blütenhonig 500g)</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-zinc-900">{p.name}</p>
                    <p className="text-[12px] text-zinc-400">{p.unit}{p.description ? ` · ${p.description}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-semibold text-zinc-900">{fmt(p.price)}</span>
                    <button onClick={() => deleteProduct(p.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Neuer Verkauf */}
      {showSale && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Verkauf erfassen</h2>
              <button onClick={() => setShowSale(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={saveSale} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Kunde</label>
                  <input value={saleCustomer} onChange={e => setSaleCustomer(e.target.value)} placeholder="Name (optional)"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Datum</label>
                  <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium text-zinc-500">Positionen</label>
                  <button type="button" onClick={() => setSaleItems(i => [...i, { productId: '', quantity: 1, price: 0 }])}
                    className="text-[12px] text-amber-600 font-medium">+ Position</button>
                </div>
                <div className="space-y-2">
                  {saleItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <select value={item.productId} onChange={e => updateSaleItem(i, 'productId', e.target.value)} required
                        className="col-span-5 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">Artikel wählen</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min="0.1" step="0.1" value={item.quantity}
                        onChange={e => updateSaleItem(i, 'quantity', parseFloat(e.target.value))}
                        placeholder="Menge"
                        className="col-span-2 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <input type="number" min="0" step="0.01" value={item.price}
                        onChange={e => updateSaleItem(i, 'price', parseFloat(e.target.value))}
                        placeholder="€"
                        className="col-span-3 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <span className="col-span-1 text-[11px] text-zinc-500 text-right">{fmt(item.quantity * item.price)}</span>
                      {saleItems.length > 1 && (
                        <button type="button" onClick={() => setSaleItems(items => items.filter((_, idx) => idx !== i))}
                          className="col-span-1 text-zinc-300 hover:text-rose-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-2">
                  <span className="text-[13px] font-semibold text-zinc-900">
                    Gesamt: {fmt(saleItems.reduce((s, i) => s + i.quantity * i.price, 0))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Notiz</label>
                <input value={saleNotes} onChange={e => setSaleNotes(e.target.value)} placeholder="optional"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>

              <button type="submit" disabled={savingSale || saleItems.some(i => !i.productId)}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {savingSale ? 'Wird gespeichert…' : 'Verkauf speichern'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Neue Kommission */}
      {showConsignment && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Kommission anlegen</h2>
              <button onClick={() => setShowConsignment(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={saveConsignment} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Ort / Person *</label>
                  <input value={consLocation} onChange={e => setConsLocation(e.target.value)} required placeholder="z.B. Bäckerei Müller"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Datum</label>
                  <input type="date" value={consDate} onChange={e => setConsDate(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-medium text-zinc-500">Artikel</label>
                  <button type="button" onClick={() => setConsItems(i => [...i, { productId: '', quantity: 1, price: 0 }])}
                    className="text-[12px] text-amber-600 font-medium">+ Artikel</button>
                </div>
                <div className="space-y-2">
                  {consItems.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <select value={item.productId} onChange={e => updateConsItem(i, 'productId', e.target.value)} required
                        className="col-span-5 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">Artikel wählen</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min="1" step="1" value={item.quantity}
                        onChange={e => updateConsItem(i, 'quantity', parseInt(e.target.value))}
                        placeholder="Stück"
                        className="col-span-2 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <input type="number" min="0" step="0.01" value={item.price}
                        onChange={e => updateConsItem(i, 'price', parseFloat(e.target.value))}
                        placeholder="€"
                        className="col-span-3 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <span className="col-span-1 text-[11px] text-zinc-500 text-right">{fmt(item.quantity * item.price)}</span>
                      {consItems.length > 1 && (
                        <button type="button" onClick={() => setConsItems(items => items.filter((_, idx) => idx !== i))}
                          className="col-span-1 text-zinc-300 hover:text-rose-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Notiz</label>
                <input value={consNotes} onChange={e => setConsNotes(e.target.value)} placeholder="optional"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>

              <button type="submit" disabled={savingCons || consItems.some(i => !i.productId)}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {savingCons ? 'Wird gespeichert…' : 'Kommission speichern'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Neuer Artikel */}
      {showProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Artikel anlegen</h2>
              <button onClick={() => setShowProduct(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={saveProduct} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Name *</label>
                <input value={prodName} onChange={e => setProdName(e.target.value)} required placeholder="z.B. Blütenhonig 500g"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Einheit</label>
                  <select value={prodUnit} onChange={e => setProdUnit(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                    <option>Stück</option>
                    <option>kg</option>
                    <option>g</option>
                    <option>Glas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Preis (€) *</label>
                  <input type="number" min="0" step="0.01" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required placeholder="0.00"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Beschreibung</label>
                <input value={prodDesc} onChange={e => setProdDesc(e.target.value)} placeholder="optional"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
              </div>
              <button type="submit" disabled={savingProd || !prodName || !prodPrice}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-[14px] font-semibold transition-colors">
                {savingProd ? 'Wird gespeichert…' : 'Artikel speichern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
