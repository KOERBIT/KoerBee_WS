'use client'

import { useState, useEffect, useCallback } from 'react'

type Tab = 'verkauf' | 'kommission' | 'artikel' | 'ausgaben' | 'laeden' | 'uebersicht'

interface CommissionStore { id: string; name: string; createdAt: string }
interface Product { id: string; name: string; unit: string; price: number; description: string | null; fillAmount: number | null; fillUnit: string | null; stockQuantity: number }
interface SaleItem { id: string; product: Product; quantity: number; price: number; total: number }
interface Sale { id: string; date: string; customerName: string | null; total: number; notes: string | null; items: SaleItem[] }
interface ConsignmentItem { id: string; product: Product; quantity: number; price: number; soldQuantity: number; returnedQuantity: number }
interface Consignment { id: string; date: string; locationName: string | null; status: string; notes: string | null; items: ConsignmentItem[]; commissionStore?: CommissionStore | null }
interface Expense { id: string; date: string; amount: number; category: string; description: string | null }

function fmt(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

const EXPENSE_CATEGORIES = ['Material', 'Tierarzt', 'Ausrüstung', 'Fahrt', 'Sonstiges']

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
  const [commissionStores, setCommissionStores] = useState<CommissionStore[]>([])
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [newStoreName, setNewStoreName] = useState('')
  const [savingStore, setSavingStore] = useState(false)

  // Expense form
  const [showExpense, setShowExpense] = useState(false)
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10))
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('Sonstiges')
  const [expDesc, setExpDesc] = useState('')
  const [savingExp, setSavingExp] = useState(false)

  // Export modal
  const [showExport, setShowExport] = useState(false)
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1)
  const [exportYear, setExportYear] = useState(new Date().getFullYear())

  // Sale form
  const [showSale, setShowSale] = useState(false)
  const [saleCustomer, setSaleCustomer] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10))
  const [saleNotes, setSaleNotes] = useState('')
  const [saleItems, setSaleItems] = useState([{ productId: '', quantity: 1, price: 0 }])
  const [savingSale, setSavingSale] = useState(false)
  const [saleStockError, setSaleStockError] = useState<{ productName: string; requested: number; available: number }[]>([])

  // Consignment form
  const [showConsignment, setShowConsignment] = useState(false)
  const [consLocation, setConsLocation] = useState('')
  const [consDate, setConsDate] = useState(new Date().toISOString().slice(0, 10))
  const [consNotes, setConsNotes] = useState('')
  const [consItems, setConsItems] = useState([{ productId: '', quantity: 1, price: 0 }])
  const [savingCons, setSavingCons] = useState(false)
  const [consStoreId, setConsStoreId] = useState<string | null>(null)
  const [settleConsignment, setSettleConsignment] = useState<Consignment | null>(null)
  const [settleSoldQtys, setSettleSoldQtys] = useState<Record<string, number>>({})
  const [settlingCons, setSettlingCons] = useState(false)
  const [settleStockError, setSettleStockError] = useState<{ productName: string; requested: number; available: number }[]>([])

  // Product form
  const [showProduct, setShowProduct] = useState(false)
  const [prodName, setProdName] = useState('')
  const [prodUnit, setProdUnit] = useState('Stück')
  const [prodPrice, setProdPrice] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [savingProd, setSavingProd] = useState(false)

  // Einbuchen
  const [stockProductId, setStockProductId] = useState<string | null>(null)
  const [stockAmount, setStockAmount] = useState(1)
  const [savingStock, setSavingStock] = useState(false)

  // Produkt Füllmenge
  const [prodFillAmount, setProdFillAmount] = useState('')
  const [prodFillUnit, setProdFillUnit] = useState('g')

  const load = useCallback(async () => {
    const [p, s, c, e, stores] = await Promise.all([
      fetch('/api/kassenbuch/products').then(r => r.json()),
      fetch('/api/kassenbuch/sales').then(r => r.json()),
      fetch('/api/kassenbuch/consignments').then(r => r.json()),
      fetch('/api/kassenbuch/expenses').then(r => r.json()),
      fetch('/api/kassenbuch/commission-stores').then(r => r.json()),
    ])
    setProducts(p)
    setSales(s)
    setConsignments(c)
    setExpenses(e)
    setCommissionStores(stores)
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
    setSaleStockError([])
    const res = await fetch('/api/kassenbuch/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: saleCustomer, date: saleDate, notes: saleNotes, items: saleItems }),
    })
    setSavingSale(false)
    if (res.status === 409) {
      const body = await res.json()
      setSaleStockError(body.items ?? [])
      return
    }
    setShowSale(false)
    setSaleStockError([])
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
      body: JSON.stringify({ locationName: consLocation || null, commissionStoreId: consStoreId || null, date: consDate, notes: consNotes, items: consItems }),
    })
    setSavingCons(false)
    setShowConsignment(false)
    setConsLocation(''); setConsNotes(''); setConsItems([{ productId: '', quantity: 1, price: 0 }]); setConsStoreId(null)
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

  function openSettle(c: Consignment) {
    const initial: Record<string, number> = {}
    c.items.forEach(item => { initial[item.id] = item.soldQuantity })
    setSettleSoldQtys(initial)
    setSettleStockError([])
    setSettleConsignment(c)
  }

  async function confirmSettle() {
    if (!settleConsignment) return
    setSettlingCons(true)
    setSettleStockError([])
    const items = settleConsignment.items.map(item => ({
      id: item.id,
      soldQuantity: settleSoldQtys[item.id] ?? 0,
      returnedQuantity: item.quantity - (settleSoldQtys[item.id] ?? 0),
    }))
    const res = await fetch(`/api/kassenbuch/consignments/${settleConsignment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'settled', items }),
    })
    setSettlingCons(false)
    if (res.status === 409) {
      const body = await res.json()
      setSettleStockError(body.items ?? [])
      return
    }
    setSettleConsignment(null)
    load()
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSavingProd(true)
    const res = await fetch('/api/kassenbuch/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prodName,
        unit: prodUnit,
        price: parseFloat(prodPrice),
        description: prodDesc,
        fillAmount: prodFillAmount ? parseFloat(prodFillAmount) : null,
        fillUnit: prodFillAmount ? prodFillUnit : null,
      }),
    })
    setSavingProd(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      alert(`Fehler beim Speichern: ${body.error ?? res.status}`)
      return
    }
    setShowProduct(false)
    setProdName(''); setProdPrice(''); setProdDesc(''); setProdFillAmount(''); setProdFillUnit('g')
    load()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Artikel löschen?')) return
    await fetch(`/api/kassenbuch/products/${id}`, { method: 'DELETE' })
    load()
  }

  async function stockIn(productId: string) {
    setSavingStock(true)
    await fetch(`/api/kassenbuch/products/${productId}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: stockAmount }),
    })
    setSavingStock(false)
    setStockProductId(null)
    setStockAmount(1)
    load()
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault()
    setSavingExp(true)
    await fetch('/api/kassenbuch/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: expDate, amount: parseFloat(expAmount), category: expCategory, description: expDesc || null }),
    })
    setSavingExp(false)
    setShowExpense(false)
    setExpAmount(''); setExpDesc(''); setExpCategory('Sonstiges')
    load()
  }

  async function deleteExpense(id: string) {
    if (!confirm('Ausgabe löschen?')) return
    await fetch(`/api/kassenbuch/expenses/${id}`, { method: 'DELETE' })
    load()
  }

  const saveStore = async () => {
    if (!newStoreName.trim()) return
    setSavingStore(true)
    try {
      const res = await fetch('/api/kassenbuch/commission-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStoreName }),
      })
      if (!res.ok) {
        alert((await res.json()).error || 'Fehler beim Erstellen des Ladens')
        return
      }
      setNewStoreName('')
      load()
    } catch (err) {
      console.error(err)
      alert('Fehler beim Erstellen des Ladens')
    } finally {
      setSavingStore(false)
    }
  }

  const deleteStore = async (storeId: string) => {
    if (!confirm('Sicher, dass du diesen Laden löschen möchtest?')) return
    try {
      const res = await fetch(`/api/kassenbuch/commission-stores/${storeId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      load()
    } catch (err) {
      console.error(err)
      alert('Fehler beim Löschen des Ladens')
    }
  }

  function getExportData() {
    const start = new Date(exportYear, exportMonth - 1, 1)
    const end = new Date(exportYear, exportMonth, 0, 23, 59, 59)
    const filteredSales = sales.filter(s => { const d = new Date(s.date); return d >= start && d <= end })
    const filteredExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= start && d <= end })
    const totalIncome = filteredSales.reduce((s, sale) => s + sale.total, 0)
    const totalExpenses = filteredExpenses.reduce((s, exp) => s + exp.amount, 0)
    return { filteredSales, filteredExpenses, totalIncome, totalExpenses, saldo: totalIncome - totalExpenses }
  }

  function downloadCsv() {
    const { filteredSales, filteredExpenses, totalIncome, totalExpenses, saldo } = getExportData()
    const monthName = new Date(exportYear, exportMonth - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const rows: string[] = [
      'Datum;Typ;Beschreibung;Betrag',
      ...filteredSales.map(s =>
        `${new Date(s.date).toLocaleDateString('de-DE')};Einnahme;${s.notes ?? s.customerName ?? 'Direktverkauf'};${s.total.toFixed(2)}`
      ),
      ...filteredExpenses.map(e =>
        `${new Date(e.date).toLocaleDateString('de-DE')};Ausgabe;${e.category}${e.description ? ' — ' + e.description : ''};-${e.amount.toFixed(2)}`
      ),
      ';;',
      `;;Einnahmen gesamt;${totalIncome.toFixed(2)}`,
      `;;Ausgaben gesamt;-${totalExpenses.toFixed(2)}`,
      `;;Saldo;${saldo.toFixed(2)}`,
    ]
    const csv = rows.join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Kassenbuch-${monthName}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadPdf() {
    const { filteredSales, filteredExpenses, totalIncome, totalExpenses, saldo } = getExportData()
    const monthName = new Date(exportYear, exportMonth - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text(`Kassenbuch — ${monthName}`, 14, 18)

    doc.setFontSize(11)
    doc.text('Einnahmen', 14, 30)
    autoTable(doc, {
      startY: 33,
      head: [['Datum', 'Beschreibung', 'Betrag']],
      body: filteredSales.map(s => [
        new Date(s.date).toLocaleDateString('de-DE'),
        s.notes ?? s.customerName ?? 'Direktverkauf',
        `${s.total.toFixed(2)} €`,
      ]),
      foot: [['', 'Gesamt', `${totalIncome.toFixed(2)} €`]],
      theme: 'striped',
      headStyles: { fillColor: [251, 191, 36] },
    })

    // @ts-ignore
    const afterSales = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(11)
    doc.text('Ausgaben', 14, afterSales)
    autoTable(doc, {
      startY: afterSales + 3,
      head: [['Datum', 'Kategorie', 'Beschreibung', 'Betrag']],
      body: filteredExpenses.map(e => [
        new Date(e.date).toLocaleDateString('de-DE'),
        e.category,
        e.description ?? '',
        `${e.amount.toFixed(2)} €`,
      ]),
      foot: [['', '', 'Gesamt', `${totalExpenses.toFixed(2)} €`]],
      theme: 'striped',
      headStyles: { fillColor: [244, 63, 94] },
    })

    // @ts-ignore
    const afterExp = (doc as any).lastAutoTable.finalY + 10
    autoTable(doc, {
      startY: afterExp,
      body: [
        ['Einnahmen', `${totalIncome.toFixed(2)} €`],
        ['Ausgaben', `-${totalExpenses.toFixed(2)} €`],
        ['Saldo', `${saldo.toFixed(2)} €`],
      ],
      theme: 'plain',
      styles: { fontStyle: 'bold' },
    })

    doc.save(`Kassenbuch-${monthName}.pdf`)
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
        <button onClick={() => setShowExport(true)}
          className="flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-medium transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Ausgaben (Monat)</p>
          <p className="text-xl font-semibold text-zinc-900">{fmt(expenses.filter(e => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear()).reduce((s, e) => s + e.amount, 0))}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {(['verkauf', 'kommission', 'artikel', 'ausgaben', 'laeden', 'uebersicht'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize whitespace-nowrap ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'verkauf' ? 'Verkäufe' : t === 'kommission' ? 'Kommission' : t === 'artikel' ? 'Artikel' : t === 'ausgaben' ? 'Ausgaben' : t === 'laeden' ? 'Läden' : 'Übersicht'}
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
                            <button onClick={() => openSettle(c)}
                              className="text-[12px] font-medium text-green-600 hover:text-green-700 px-3 py-1 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              Abrechnen
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
            <div className="space-y-3">
              {products.map(p => {
                const stockColor = p.stockQuantity === 0
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : p.stockQuantity <= 5
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                const isExpanded = stockProductId === p.id
                return (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-[14px] font-semibold text-zinc-900">{p.name}</p>
                        <p className="text-[12px] text-zinc-400">
                          {p.fillAmount && p.fillUnit ? `${p.fillAmount} ${p.fillUnit} · ` : ''}{fmt(p.price)}
                          {p.description ? ` · ${p.description}` : ''}
                        </p>
                      </div>
                      <div className={`border rounded-xl px-3 py-2 text-center min-w-[64px] ${stockColor}`}>
                        <p className="text-[18px] font-bold leading-none">{p.stockQuantity}</p>
                        <p className="text-[10px] font-medium mt-0.5">im Lager</p>
                      </div>
                    </div>
                    <div className="px-5 pb-4 flex gap-2">
                      <button
                        onClick={() => { setStockProductId(isExpanded ? null : p.id); setStockAmount(1) }}
                        className="flex-1 text-[12px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg py-2 transition-colors"
                      >
                        + Einbuchen
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="text-[12px] text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-3 py-2 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-green-100 bg-green-50 px-5 py-4">
                        <p className="text-[12px] font-semibold text-green-800 mb-3">Einbuchen: {p.name}</p>
                        <div className="flex items-center gap-4 mb-3">
                          <button type="button"
                            onClick={() => setStockAmount(a => Math.max(1, a - 1))}
                            className="w-10 h-10 bg-white border border-green-200 rounded-xl text-zinc-700 text-xl font-light hover:bg-green-100 transition-colors">
                            −
                          </button>
                          <div className="text-center min-w-[48px]">
                            <p className="text-2xl font-bold text-zinc-900">{stockAmount}</p>
                          </div>
                          <button type="button"
                            onClick={() => setStockAmount(a => a + 1)}
                            className="w-10 h-10 bg-white border border-green-200 rounded-xl text-zinc-700 text-xl font-light hover:bg-green-100 transition-colors">
                            +
                          </button>
                          <p className="text-[12px] text-zinc-500">→ Neuer Bestand: <span className="font-bold text-green-700">{p.stockQuantity + stockAmount}</span></p>
                        </div>
                        <button
                          onClick={() => stockIn(p.id)}
                          disabled={savingStock}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors"
                        >
                          {savingStock ? 'Wird eingebucht…' : 'Einbuchen bestätigen'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* AUSGABEN */}
      {tab === 'ausgaben' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowExpense(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ausgabe erfassen
            </button>
          </div>

          {showExpense && (
            <form onSubmit={saveExpense} className="bg-white rounded-2xl shadow-sm p-5 mb-4 space-y-3">
              <p className="text-[14px] font-semibold text-zinc-900">Neue Ausgabe</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Datum</label>
                  <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Betrag (€)</label>
                  <input type="number" step="0.01" min="0.01" value={expAmount} onChange={e => setExpAmount(e.target.value)} required placeholder="0.00"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Kategorie</label>
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Beschreibung (optional)</label>
                <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="z.B. Bienenwachs, 2kg"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={savingExp}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2 text-[13px] font-semibold transition-colors">
                  {savingExp ? 'Wird gespeichert…' : 'Speichern'}
                </button>
                <button type="button" onClick={() => setShowExpense(false)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {expenses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
              <p className="text-[15px] font-medium text-zinc-900">Noch keine Ausgaben</p>
              <p className="text-[13px] text-zinc-400 mt-1">Erfasse deine erste Ausgabe</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map(exp => (
                <div key={exp.id} className="bg-white rounded-2xl shadow-sm px-5 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{exp.category}</span>
                      {exp.description && <span className="text-[13px] text-zinc-700">{exp.description}</span>}
                    </div>
                    <p className="text-[12px] text-zinc-400 mt-0.5">{fmtDate(exp.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[15px] font-semibold text-rose-600">−{fmt(exp.amount)}</p>
                    <button onClick={() => deleteExpense(exp.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-zinc-300 hover:text-rose-500 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              <div className="bg-zinc-50 rounded-2xl px-5 py-3 flex justify-between items-center">
                <span className="text-[13px] font-medium text-zinc-500">Gesamt</span>
                <span className="text-[15px] font-semibold text-rose-600">−{fmt(expenses.reduce((s, e) => s + e.amount, 0))}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LÄDEN */}
      {tab === 'laeden' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-[17px] font-semibold text-zinc-900 mb-4">Kommissionsläden</h2>
            <div className="space-y-2 mb-4">
              {commissionStores.map(store => (
                <div key={store.id} className="flex items-center justify-between px-4 py-3 bg-zinc-50 rounded-lg">
                  <span className="text-[14px] text-zinc-900">{store.name}</span>
                  <button
                    onClick={() => deleteStore(store.id)}
                    className="text-[12px] text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Löschen
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && saveStore()}
                placeholder="Neuer Laden (z.B. Bäckerei Müller)"
                className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={savingStore}
              />
              <button
                onClick={saveStore}
                disabled={!newStoreName.trim() || savingStore}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-[14px] font-medium transition-colors"
              >
                {savingStore ? 'Wird erstellt...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ÜBERSICHT */}
      {tab === 'uebersicht' && (
        <div className="space-y-4">
          {/* Kommission nach Laden */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-[17px] font-semibold text-zinc-900 mb-4">Kommission nach Laden</h2>
            {(() => {
              const storeMap: Record<string, { name: string; count: number; total: number }> = {}
              consignments
                .filter(c => c.status === 'settled')
                .forEach(c => {
                  const name = c.commissionStore?.name || c.locationName || '—'
                  if (!storeMap[name]) storeMap[name] = { name, count: 0, total: 0 }
                  storeMap[name].count += 1
                  storeMap[name].total += c.items.reduce((sum, item) => sum + item.soldQuantity * item.price, 0)
                })
              return Object.values(storeMap).length === 0 ? (
                <p className="text-[13px] text-zinc-400">Keine abgerechneten Kommissionen</p>
              ) : (
                <div className="space-y-2">
                  {Object.values(storeMap).map(entry => (
                    <div key={entry.name} className="flex items-center justify-between px-4 py-3 bg-zinc-50 rounded-lg">
                      <div>
                        <p className="text-[14px] font-medium text-zinc-900">{entry.name}</p>
                        <p className="text-[12px] text-zinc-400">{entry.count} Kommissionen</p>
                      </div>
                      <p className="text-[14px] font-semibold text-zinc-900">{fmt(entry.total)}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Einzelverkäufe nach Kunde */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-[17px] font-semibold text-zinc-900 mb-4">Einzelverkäufe nach Kunde</h2>
            {(() => {
              const customerMap: Record<string, { name: string; count: number; total: number }> = {}
              sales.forEach(s => {
                const name = s.customerName || 'Laufkundschaft'
                if (!customerMap[name]) customerMap[name] = { name, count: 0, total: 0 }
                customerMap[name].count += 1
                customerMap[name].total += s.total
              })
              return Object.values(customerMap).length === 0 ? (
                <p className="text-[13px] text-zinc-400">Keine Verkäufe</p>
              ) : (
                <div className="space-y-2">
                  {Object.values(customerMap).map(entry => (
                    <div key={entry.name} className="flex items-center justify-between px-4 py-3 bg-zinc-50 rounded-lg">
                      <div>
                        <p className="text-[14px] font-medium text-zinc-900">{entry.name}</p>
                        <p className="text-[12px] text-zinc-400">{entry.count} Verkäufe</p>
                      </div>
                      <p className="text-[14px] font-semibold text-zinc-900">{fmt(entry.total)}</p>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
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
                      {item.productId && (() => {
                        const prod = products.find(p => p.id === item.productId)
                        if (!prod) return null
                        const ok = item.quantity <= prod.stockQuantity
                        return (
                          <div className={`col-span-12 flex items-center gap-1.5 mt-1 ${ok ? 'text-green-600' : 'text-rose-600'}`}>
                            <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-rose-500'}`} />
                            <span className="text-[11px] font-medium">
                              {ok
                                ? `Lager: ${prod.stockQuantity} verfügbar`
                                : `Nur ${prod.stockQuantity} im Lager`}
                            </span>
                          </div>
                        )
                      })()}
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

              {saleStockError.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {saleStockError.map(e => (
                    <p key={e.productName} className="text-[12px] text-rose-700 font-medium">
                      ⚠ {e.productName}: nur {e.available} im Lager, {e.requested} angefragt
                    </p>
                  ))}
                </div>
              )}
              <button type="submit" disabled={savingSale || saleItems.some(item => {
                const prod = products.find(p => p.id === item.productId)
                return prod ? item.quantity > prod.stockQuantity : false
              })}
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
              <button onClick={() => { setShowConsignment(false); setConsStoreId(null) }} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={saveConsignment} className="px-6 py-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-[12px] font-medium text-zinc-500">Laden *</label>
                <select
                  value={consStoreId || ''}
                  onChange={(e) => setConsStoreId(e.target.value || null)}
                  disabled={savingCons}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">-- Laden auswählen --</option>
                  {commissionStores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
                <label className="block text-[12px] text-zinc-600 mt-2">oder freier Text:</label>
                <input
                  type="text"
                  value={consLocation}
                  onChange={(e) => setConsLocation(e.target.value)}
                  disabled={savingCons}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent disabled:opacity-50"
                  placeholder="z.B. Marktstand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Datum</label>
                <input type="date" value={consDate} onChange={e => setConsDate(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Füllmenge (optional)</label>
                  <input type="number" min="0" step="any" value={prodFillAmount} onChange={e => setProdFillAmount(e.target.value)}
                    placeholder="z.B. 500"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Einheit</label>
                  <select value={prodFillUnit} onChange={e => setProdFillUnit(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent">
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="kg">kg</option>
                  </select>
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
      {/* Export-Modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-zinc-900">Kassenbuch exportieren</h2>
              <button onClick={() => setShowExport(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Monat</label>
                <select value={exportMonth} onChange={e => setExportMonth(Number(e.target.value))}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('de-DE', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Jahr</label>
                <select value={exportYear} onChange={e => setExportYear(Number(e.target.value))}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {[exportYear - 1, exportYear, exportYear + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadCsv}
                className="flex-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl py-2.5 text-[13px] font-medium transition-colors">
                CSV
              </button>
              <button onClick={downloadPdf}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-[13px] font-semibold transition-colors">
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kommission abrechnen */}
      {settleConsignment && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Kommission abrechnen</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">{settleConsignment.locationName}</p>
              </div>
              <button onClick={() => setSettleConsignment(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {settleConsignment.items.map(item => {
                const sold = settleSoldQtys[item.id] ?? 0
                const prod = products.find(p => p.id === item.product.id)
                const stockOk = !prod || sold <= prod.stockQuantity
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${stockOk ? 'border-zinc-200' : 'border-rose-200 bg-rose-50'}`}>
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-900">{item.product.name}</p>
                        <p className="text-[11px] text-zinc-400">Platziert: {item.quantity} · {fmt(item.price)}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-green-700">{fmt(sold * item.price)}</p>
                    </div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase mb-2">Wie viele verkauft?</p>
                    <div className="flex items-center gap-3">
                      <button type="button"
                        onClick={() => setSettleSoldQtys(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))}
                        className="w-9 h-9 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-lg transition-colors">−</button>
                      <span className="text-xl font-bold text-zinc-900 min-w-[32px] text-center">{sold}</span>
                      <button type="button"
                        onClick={() => setSettleSoldQtys(q => ({ ...q, [item.id]: Math.min(item.quantity, (q[item.id] ?? 0) + 1) }))}
                        className="w-9 h-9 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-lg transition-colors">+</button>
                      {!stockOk && prod && (
                        <span className="text-[11px] text-rose-600 font-medium">Nur {prod.stockQuantity} im Lager</span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Erlös-Zusammenfassung */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex justify-between">
                  <p className="text-[13px] font-semibold text-zinc-700">Erlös gesamt</p>
                  <p className="text-[15px] font-bold text-green-700">
                    {fmt(settleConsignment.items.reduce((s, item) => s + (settleSoldQtys[item.id] ?? 0) * item.price, 0))}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Erstellt Verkauf + bucht Lager ab</p>
              </div>

              {settleStockError.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {settleStockError.map(e => (
                    <p key={e.productName} className="text-[12px] text-rose-700 font-medium">
                      ⚠ {e.productName}: nur {e.available} im Lager
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={confirmSettle} disabled={settlingCons}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors">
                  {settlingCons ? 'Wird gebucht…' : 'Abrechnen & Verkauf buchen'}
                </button>
                <button onClick={() => setSettleConsignment(null)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
