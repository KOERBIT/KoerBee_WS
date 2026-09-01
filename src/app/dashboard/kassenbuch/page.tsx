'use client'

import { useState, useEffect, useCallback } from 'react'

type Tab = 'verkauf' | 'kommission' | 'paypal' | 'artikel' | 'ausgaben' | 'laeden' | 'uebersicht' | 'lagerkorrektionen'

interface CommissionStore { id: string; name: string; createdAt: string }
interface Product { id: string; name: string; unit: string; price: number; description: string | null; fillAmount: number | null; fillUnit: string | null; stockQuantity: number }
interface SaleItem { id: string; product: Product; quantity: number; price: number; total: number }
interface Sale { id: string; date: string; customerName: string | null; customerEmail?: string | null; total: number; notes: string | null; items: SaleItem[]; commissionStore?: CommissionStore | null; customer?: { email: string | null } | null; receipt?: { number: number; paymentMethod: string; emailedAt: string | null } | null }
interface ConsignmentItem { id: string; product: Product; quantity: number; price: number; soldQuantity: number; returnedQuantity: number }
interface Consignment { id: string; date: string; locationName: string | null; status: string; notes: string | null; items: ConsignmentItem[]; commissionStore?: CommissionStore | null }
interface Expense { id: string; date: string; amount: number; category: string; description: string | null; receipt?: { id: string; mimeType: string } | null }
interface StockCorrection { id: string; productId: string; quantity: number; reason: string; batchNumber: string | null; expiryDate: string | null; createdAt: string }
interface PayPalTxn { id: string; transactionId: string; date: string; amount: number; currency: string; payerName: string | null; payerEmail: string | null; paypalStatus: string | null; status: string; saleId: string | null; consignmentId: string | null }

function fmt(n: number) { return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }

// Akzeptiert Punkt UND Komma als Dezimaltrennzeichen (Euro,Cent) und liefert eine Zahl.
function parseDecimal(s: string): number {
  const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}
function numToText(v: number): string {
  return !Number.isFinite(v) || v === 0 ? '' : String(v).replace('.', ',')
}

// Zahlen-Eingabefeld, das sowohl "6,50" als auch "6.50" versteht. Hält beim
// Tippen den Rohtext, damit Zwischenstände wie "6," nicht zurückspringen.
function DecimalInput({
  value, onChange, className, placeholder, min = 0,
}: {
  value: number
  onChange: (n: number) => void
  className?: string
  placeholder?: string
  min?: number
}) {
  const [text, setText] = useState(() => numToText(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused && parseDecimal(text || '0') !== value) setText(numToText(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      className={className}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setText(numToText(value)) }}
      onChange={e => {
        const raw = e.target.value
        if (/[^0-9.,\s]/.test(raw)) return
        setText(raw)
        const trimmed = raw.trim()
        if (trimmed === '' || trimmed === ',' || trimmed === '.') { onChange(min); return }
        const n = parseDecimal(trimmed)
        if (Number.isFinite(n)) onChange(n)
      }}
    />
  )
}

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
  const [expReceipt, setExpReceipt] = useState<{ base64: string; mimeType: string; fileName: string } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState<string | null>(null)

  // Export modal
  const [showExport, setShowExport] = useState(false)
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1)
  const [exportYear, setExportYear] = useState(new Date().getFullYear())

  // Sale form
  const [showSale, setShowSale] = useState(false)
  const [saleCustomer, setSaleCustomer] = useState('')
  const [saleEmail, setSaleEmail] = useState('')
  const [saleEmailError, setSaleEmailError] = useState(false)
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
  const [sellConsignment, setSellConsignment] = useState<Consignment | null>(null)
  const [sellQtys, setSellQtys] = useState<Record<string, number>>({})
  const [sellPrices, setSellPrices] = useState<Record<string, number>>({})
  const [sellName, setSellName] = useState('')
  const [sellDate, setSellDate] = useState(new Date().toISOString().slice(0, 10))
  const [sellingCons, setSellingCons] = useState(false)
  const [sellStockError, setSellStockError] = useState<{ productName: string; requested: number; available: number }[]>([])

  // Kommission korrigieren
  const [correctCons, setCorrectCons] = useState<Consignment | null>(null)
  const [corrRows, setCorrRows] = useState<Record<string, { quantity: number; soldQuantity: number; returnedQuantity: number; price: number }>>({})
  const [correcting, setCorrecting] = useState(false)
  const [correctMsg, setCorrectMsg] = useState<string | null>(null)

  // Quittung
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null)
  const [receiptMeta, setReceiptMeta] = useState<{ number: number; formatted: string; paymentMethod: string; emailedAt: string | null; recipient: string | null } | null>(null)
  const [receiptPayment, setReceiptPayment] = useState<'bar' | 'ueberweisung'>('bar')
  const [receiptEmail, setReceiptEmail] = useState('')
  const [receiptBusy, setReceiptBusy] = useState(false)
  const [receiptVersion, setReceiptVersion] = useState(0)
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null)

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

  // Stock Corrections
  const [stockCorrections, setStockCorrections] = useState<StockCorrection[]>([])
  const [showStockCorrection, setShowStockCorrection] = useState(false)
  const [corrProductId, setCorrProductId] = useState<string | null>(null)
  const [corrQuantity, setCorrQuantity] = useState('')
  const [corrReason, setCorrReason] = useState('')
  const [corrBatch, setCorrBatch] = useState('')
  const [corrExpiry, setCorrExpiry] = useState('')
  const [savingCorr, setSavingCorr] = useState(false)

  // PayPal
  const [paypalTxns, setPaypalTxns] = useState<PayPalTxn[]>([])
  const [ppFilter, setPpFilter] = useState<'new' | 'ignored' | 'linked' | 'deleted'>('new')
  const [ppSyncing, setPpSyncing] = useState(false)
  const [ppImporting, setPpImporting] = useState(false)
  const [ppEmailFetching, setPpEmailFetching] = useState(false)
  const [ppMsg, setPpMsg] = useState<string | null>(null)
  const [linkTxn, setLinkTxn] = useState<PayPalTxn | null>(null)
  const [linkMode, setLinkMode] = useState<'sale' | 'consignment'>('sale')
  const [linkItems, setLinkItems] = useState([{ productId: '', quantity: 1 }])
  const [linkName, setLinkName] = useState('')
  const [linkConsignmentId, setLinkConsignmentId] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

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

  const loadStockCorrections = useCallback(async () => {
    const allCorrections: StockCorrection[] = []
    for (const product of products) {
      try {
        const corr = await fetch(`/api/kassenbuch/products/${product.id}/stock-correction`).then(r => r.json())
        allCorrections.push(...(Array.isArray(corr) ? corr : []))
      } catch {
        // Silently skip
      }
    }
    setStockCorrections(allCorrections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
  }, [products])

  useEffect(() => {
    if (tab === 'lagerkorrektionen') {
      loadStockCorrections()
    }
  }, [tab, loadStockCorrections])

  const loadPaypal = useCallback(async () => {
    const res = await fetch(`/api/kassenbuch/paypal?status=${ppFilter}`)
    if (res.ok) setPaypalTxns(await res.json())
  }, [ppFilter])

  useEffect(() => { if (tab === 'paypal') loadPaypal() }, [tab, loadPaypal])

  async function syncPaypal() {
    setPpSyncing(true); setPpMsg(null)
    const res = await fetch('/api/kassenbuch/paypal/sync', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setPpSyncing(false)
    if (!res.ok) {
      if (data.error === 'paypal_not_configured') {
        setPpMsg('PayPal ist nicht konfiguriert – bitte Credentials in den Einstellungen hinterlegen.')
      } else if (data.error === 'transaction_search_not_enabled') {
        setPpMsg(`PayPal verweigert den Zugriff (403). Meist: „Transaction Search" ist nicht (auf dieser App / in dieser Umgebung) aktiv, oder das Konto ist dafür nicht berechtigt (Reporting-API benötigt ein Geschäftskonto).${data.detail ? ` PayPal-Detail: ${data.detail}` : ''}`)
      } else if (data.error === 'auth_failed') {
        setPpMsg(`Anmeldung bei PayPal fehlgeschlagen – Client ID/Secret passen nicht zur gewählten Umgebung (Sandbox-Schlüssel funktionieren nur mit „Sandbox", Live-Schlüssel nur mit „Live").${data.detail ? ` PayPal-Detail: ${data.detail}` : ''}`)
      } else {
        setPpMsg(`Abruf fehlgeschlagen${data.detail ? ` (${data.detail})` : ''}. Bitte später erneut versuchen.`)
      }
      return
    }
    setPpMsg(`${data.imported} neue Zahlung(en) abgerufen.`)
    loadPaypal()
  }

  async function fetchPaypalEmails() {
    setPpEmailFetching(true); setPpMsg(null)
    const res = await fetch('/api/kassenbuch/paypal/fetch-emails', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setPpEmailFetching(false)
    if (!res.ok) {
      setPpMsg(data.error === 'mail_not_configured'
        ? 'Kein Postfach hinterlegt – in den Einstellungen unter „E-Mail-Postfach" eintragen.'
        : 'E-Mail-Abruf fehlgeschlagen. Bitte später erneut versuchen.')
      return
    }
    setPpMsg(`${data.imported} neue Zahlung(en) aus E-Mails übernommen (${data.scanned} PayPal-Mails geprüft).`)
    loadPaypal()
  }

  async function importPaypalCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // erlaubt erneutes Hochladen derselben Datei
    if (!file) return
    setPpImporting(true); setPpMsg(null)
    const text = await file.text()
    const res = await fetch('/api/kassenbuch/paypal/import', {
      method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text,
    })
    const data = await res.json().catch(() => ({}))
    setPpImporting(false)
    if (!res.ok) {
      setPpMsg(data.error === 'no_rows'
        ? 'CSV nicht erkannt – bitte den PayPal-Aktivitäten-Export (CSV) hochladen.'
        : data.error === 'empty_file' ? 'Datei ist leer.' : 'Import fehlgeschlagen.')
      return
    }
    setPpMsg(`${data.imported} neue Zahlung(en) importiert (${data.recognized} Eingänge erkannt, ${data.skipped} übersprungen).`)
    loadPaypal()
  }

  async function setPaypalStatus(id: string, status: 'new' | 'ignored' | 'deleted') {
    await fetch(`/api/kassenbuch/paypal/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    loadPaypal()
  }

  async function deletePaypal(id: string) {
    if (!confirm('Als gelöscht markieren? Der Eintrag verschwindet aus der Liste und wird beim erneuten Abruf nicht neu angelegt (unter „Gelöscht" wiederherstellbar).')) return
    await fetch(`/api/kassenbuch/paypal/${id}`, { method: 'DELETE' })
    loadPaypal()
  }

  function openLink(txn: PayPalTxn) {
    setLinkTxn(txn)
    setLinkMode('sale')
    setLinkItems([{ productId: products[0]?.id ?? '', quantity: 1 }])
    setLinkName(txn.payerName ?? '')
    setLinkConsignmentId('')
    setLinkError(null)
  }

  async function confirmLink() {
    if (!linkTxn) return
    setLinking(true); setLinkError(null)
    const items = linkItems.filter(i => i.productId && i.quantity > 0)
    if (items.length === 0) { setLinking(false); setLinkError('Bitte mindestens einen Artikel wählen.'); return }
    const res = await fetch(`/api/kassenbuch/paypal/${linkTxn.id}/link`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: linkMode, items, customerName: linkName || null, consignmentId: linkConsignmentId || null }),
    })
    const data = await res.json().catch(() => ({}))
    setLinking(false)
    if (!res.ok) {
      if (data.error === 'insufficient_stock') setLinkError('Nicht genug Lagerbestand für die gewählte Menge.')
      else if (data.error === 'exceeds_open') setLinkError('Mehr als die offene Kommissionsmenge gewählt.')
      else if (data.error === 'consignment_required') setLinkError('Bitte eine Kommission auswählen.')
      else if (data.error === 'not_in_consignment') setLinkError('Artikel ist nicht Teil dieser Kommission.')
      else setLinkError('Verknüpfung fehlgeschlagen.')
      return
    }
    setLinkTxn(null)
    await Promise.all([loadPaypal(), load()])
    if (data.mismatch) {
      alert(`Hinweis: PayPal-Betrag (${fmt(data.paid)}) weicht vom Artikelwert (${fmt(data.expected)}) ab – der PayPal-Betrag wurde als Verkaufssumme übernommen.`)
    }
  }

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
    setSaleEmailError(false)
    const res = await fetch('/api/kassenbuch/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: saleCustomer, customerEmail: saleEmail, date: saleDate, notes: saleNotes, items: saleItems }),
    })
    setSavingSale(false)
    if (res.status === 409) {
      const body = await res.json()
      setSaleStockError(body.items ?? [])
      return
    }
    if (res.status === 422) {
      const body = await res.json().catch(() => ({}))
      if (body.error === 'invalid_email') { setSaleEmailError(true); return }
    }
    setShowSale(false)
    setSaleStockError([])
    setSaleCustomer(''); setSaleEmail(''); setSaleNotes(''); setSaleItems([{ productId: '', quantity: 1, price: 0 }])
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

  function openSell(c: Consignment) {
    const qtys: Record<string, number> = {}
    const prices: Record<string, number> = {}
    c.items.forEach(item => { qtys[item.id] = 0; prices[item.id] = item.price })
    setSellQtys(qtys)
    setSellPrices(prices)
    setSellName('')
    setSellDate(new Date().toISOString().slice(0, 10))
    setSellStockError([])
    setSellConsignment(c)
  }

  async function confirmSell() {
    if (!sellConsignment) return
    setSellingCons(true)
    setSellStockError([])
    const items = sellConsignment.items
      .map(item => ({
        id: item.id,
        quantity: sellQtys[item.id] ?? 0,
        price: sellPrices[item.id] ?? item.price,
      }))
      .filter(i => i.quantity > 0)
    if (items.length === 0) { setSellingCons(false); return }
    const res = await fetch(`/api/kassenbuch/consignments/${sellConsignment.id}/sell`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: sellName || null, date: sellDate, items }),
    })
    setSellingCons(false)
    if (res.status === 409) {
      const body = await res.json()
      if (body.error === 'exceeds_open') {
        setSellStockError((body.items ?? []).map((e: { productName: string; requested: number; open: number }) =>
          ({ productName: e.productName, requested: e.requested, available: e.open })))
      } else {
        setSellStockError(body.items ?? [])
      }
      return
    }
    setSellConsignment(null)
    load()
  }

  function openCorrect(c: Consignment) {
    const rows: Record<string, { quantity: number; soldQuantity: number; returnedQuantity: number; price: number }> = {}
    c.items.forEach(item => {
      rows[item.id] = { quantity: item.quantity, soldQuantity: item.soldQuantity, returnedQuantity: item.returnedQuantity, price: item.price }
    })
    setCorrRows(rows)
    setCorrectMsg(null)
    setCorrectCons(c)
  }

  async function saveCorrect() {
    if (!correctCons) return
    setCorrecting(true)
    setCorrectMsg(null)
    const items = correctCons.items.map(item => ({ id: item.id, ...corrRows[item.id] }))
    const res = await fetch(`/api/kassenbuch/consignments/${correctCons.id}/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    setCorrecting(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setCorrectMsg(body.error === 'exceeds_quantity'
        ? 'Verkauft + Zurück darf die platzierte Menge nicht überschreiten.'
        : body.error === 'invalid_values' ? 'Ungültige Werte (nur Zahlen ≥ 0).'
        : 'Korrektur fehlgeschlagen.')
      return
    }
    setCorrectCons(null)
    load()
  }

  async function openReceipt(sale: Sale) {
    setReceiptSale(sale)
    setReceiptMsg(null)
    setReceiptMeta(null)
    const initialPayment = (sale.receipt?.paymentMethod === 'ueberweisung' ? 'ueberweisung' : 'bar') as 'bar' | 'ueberweisung'
    setReceiptPayment(initialPayment)
    setReceiptEmail(sale.customerEmail ?? sale.customer?.email ?? '')
    setReceiptBusy(true)
    const res = await fetch(`/api/kassenbuch/sales/${sale.id}/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: initialPayment }),
    })
    setReceiptBusy(false)
    if (res.ok) {
      const meta = await res.json()
      setReceiptMeta(meta)
      if (meta.recipient) setReceiptEmail(meta.recipient)
      setReceiptVersion(v => v + 1)
    } else {
      setReceiptMsg('Quittung konnte nicht erstellt werden.')
    }
  }

  async function setReceiptPaymentMethod(method: 'bar' | 'ueberweisung') {
    setReceiptPayment(method)
    if (!receiptSale) return
    const res = await fetch(`/api/kassenbuch/sales/${receiptSale.id}/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: method }),
    })
    if (res.ok) { setReceiptMeta(await res.json()); setReceiptVersion(v => v + 1) }
  }

  async function emailReceipt() {
    if (!receiptSale) return
    setReceiptBusy(true)
    setReceiptMsg(null)
    const res = await fetch(`/api/kassenbuch/sales/${receiptSale.id}/receipt/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: receiptEmail || null, paymentMethod: receiptPayment }),
    })
    setReceiptBusy(false)
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      setReceiptMsg(`✓ Quittung an ${body.to} gesendet.`)
      load()
    } else {
      setReceiptMsg(
        body.error === 'no_recipient' ? 'Bitte eine gültige E-Mail-Adresse angeben.'
        : body.error === 'smtp_not_configured' ? 'Kein Mail-Zugang hinterlegt (Einstellungen → E-Mail).'
        : body.error === 'send_failed' ? 'Versand fehlgeschlagen – Zugangsdaten prüfen.'
        : 'Versand fehlgeschlagen.',
      )
    }
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
        price: parseDecimal(prodPrice),
        description: prodDesc,
        fillAmount: prodFillAmount ? parseDecimal(prodFillAmount) : null,
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
      body: JSON.stringify({ date: expDate, amount: parseDecimal(expAmount), category: expCategory, description: expDesc || null, receipt: expReceipt }),
    })
    setSavingExp(false)
    setShowExpense(false)
    setExpAmount(''); setExpDesc(''); setExpCategory('Sonstiges'); setExpReceipt(null); setScanMsg(null)
    load()
  }

  // Beleg-Datei vorbereiten: Bilder werden clientseitig verkleinert (Upload-Limit + günstiger)
  async function prepareReceiptFile(file: File): Promise<{ base64: string; mimeType: string; fileName: string }> {
    if (file.type === 'application/pdf') {
      const buf = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return { base64: btoa(binary), mimeType: 'application/pdf', fileName: file.name }
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        const max = 1600
        let { width, height } = img
        if (width > max || height > max) {
          const s = max / Math.max(width, height)
          width = Math.round(width * s); height = Math.round(height * s)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
        URL.revokeObjectURL(img.src)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
    return { base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', fileName: file.name }
  }

  async function scanReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setScanning(true); setScanMsg(null)
    try {
      const prepared = await prepareReceiptFile(file)
      const res = await fetch('/api/kassenbuch/expenses/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64: prepared.base64, mimeType: prepared.mimeType }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setScanMsg(data.error === 'anthropic_not_configured'
          ? 'Kein Anthropic-Key hinterlegt – in den Einstellungen unter „Beleg-Erkennung" eintragen.'
          : 'Beleg konnte nicht ausgelesen werden. Bitte manuell erfassen.')
        return
      }
      if (data.amount != null) setExpAmount(String(data.amount))
      if (data.date) setExpDate(data.date)
      if (data.category) setExpCategory(data.category)
      if (data.description) setExpDesc(data.description)
      setExpReceipt(prepared)
      setShowExpense(true)
      setScanMsg('Beleg ausgelesen – bitte Werte prüfen und speichern.')
    } catch {
      setScanMsg('Beleg konnte nicht verarbeitet werden.')
    } finally {
      setScanning(false)
    }
  }

  const saveStockCorrection = async () => {
    if (!corrProductId || !corrQuantity || !corrReason.trim()) {
      alert('Artikel, Menge und Grund erforderlich')
      return
    }

    setSavingCorr(true)
    try {
      const response = await fetch(`/api/kassenbuch/products/${corrProductId}/stock-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: parseInt(corrQuantity),
          reason: corrReason.trim(),
          batchNumber: corrBatch.trim() || null,
          expiryDate: corrExpiry || null,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Fehler beim Speichern')
      }

      // Clear form and reload
      setCorrProductId(null)
      setCorrQuantity('')
      setCorrReason('')
      setCorrBatch('')
      setCorrExpiry('')
      setShowStockCorrection(false)

      // Reload products to update stock quantities and corrections
      load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSavingCorr(false)
    }
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
    // Kommissionsverkäufe sind echte Verkäufe (mit commissionStore) und stecken
    // bereits in `sales` — daher zählt die Einnahme allein aus den Verkäufen.
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
      ...filteredSales.map(s => {
        const typ = s.commissionStore ? 'Kommission' : 'Verkauf'
        const beschreibung = s.commissionStore ? `${s.commissionStore.name}${s.customerName ? ' — ' + s.customerName : ''}` : (s.customerName || 'Laufkundschaft')
        return `${new Date(s.date).toLocaleDateString('de-DE')};${typ};${beschreibung};${s.total.toFixed(2)}`
      }),
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

    // Verkäufe (inkl. Kommissionsverkäufe, gekennzeichnet über den Laden)
    const einnahmenData = filteredSales.map(s => [
      new Date(s.date).toLocaleDateString('de-DE'),
      s.commissionStore ? 'Kommission' : 'Verkauf',
      s.commissionStore ? `${s.commissionStore.name}${s.customerName ? ' — ' + s.customerName : ''}` : (s.customerName || 'Laufkundschaft'),
      `${s.total.toFixed(2)} €`,
    ])

    autoTable(doc, {
      startY: 33,
      head: [['Datum', 'Typ', 'Name', 'Betrag']],
      body: einnahmenData,
      foot: [['', '', 'Gesamt', `${totalIncome.toFixed(2)} €`]],
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
  // Nur der offene Warenwert: bereits verkaufte/zurückgegebene Mengen werden
  // zum Artikelpreis (Platzierungspreis) abgezogen – auch wenn der tatsächliche
  // Verkaufspreis abweicht (z.B. 0 € verschenkt).
  const consignmentValue = activeConsignments.reduce((s, c) =>
    s + c.items.reduce((si, i) => si + (i.quantity - i.soldQuantity - i.returnedQuantity) * i.price, 0), 0)

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
        {(['verkauf', 'kommission', 'paypal', 'artikel', 'ausgaben', 'laeden', 'lagerkorrektionen', 'uebersicht'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize whitespace-nowrap ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {t === 'verkauf' ? 'Verkäufe' : t === 'kommission' ? 'Kommission' : t === 'paypal' ? 'PayPal' : t === 'artikel' ? 'Artikel' : t === 'ausgaben' ? 'Ausgaben' : t === 'laeden' ? 'Läden' : t === 'lagerkorrektionen' ? 'Lagerkorrektionen' : 'Übersicht'}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-zinc-900">
                          {sale.customerName || 'Laufkundschaft'}
                        </span>
                        {sale.commissionStore && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Kommission · {sale.commissionStore.name}
                          </span>
                        )}
                        {(sale.customerEmail || sale.customer?.email) && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400" title={sale.customerEmail || sale.customer?.email || ''}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
                            {sale.customerEmail || sale.customer?.email}
                          </span>
                        )}
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
                      <div className="mt-2">
                        <button onClick={() => openReceipt(sale)}
                          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700 hover:text-amber-800 px-3 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                          Quittung
                          {sale.receipt && <span className="text-amber-500">· Nr. {String(sale.receipt.number).padStart(4, '0')}</span>}
                          {sale.receipt?.emailedAt && <span className="text-green-600">· gesendet</span>}
                        </button>
                      </div>
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
                const openValue = c.items.reduce((s, i) => s + (i.quantity - i.soldQuantity - i.returnedQuantity) * i.price, 0)
                const hasOpen = c.items.some(i => i.quantity - i.soldQuantity - i.returnedQuantity > 0)
                return (
                  <div key={c.id} className="bg-white rounded-2xl shadow-sm px-5 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-zinc-900">{c.commissionStore?.name || c.locationName || '—'}</span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          <span className="text-[12px] text-zinc-400">{fmtDate(c.date)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {c.items.map(item => {
                            const open = item.quantity - item.soldQuantity - item.returnedQuantity
                            return (
                              <span key={item.id} className="text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                                {item.quantity}× {item.product.name}
                                {item.soldQuantity > 0 && ` · ${item.soldQuantity} verk.`}
                                {item.returnedQuantity > 0 && ` · ${item.returnedQuantity} zurück`}
                                {open > 0 && ` · ${open} offen`}
                              </span>
                            )
                          })}
                        </div>
                        {c.notes && <p className="text-[12px] text-zinc-400 mt-1">{c.notes}</p>}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {hasOpen && (
                            <>
                              <button onClick={() => openSell(c)}
                                className="text-[12px] font-medium text-green-600 hover:text-green-700 px-3 py-1 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                                Verkauf buchen
                              </button>
                              <button onClick={() => updateConsignmentStatus(c.id, 'returned')}
                                className="text-[12px] font-medium text-zinc-600 hover:text-zinc-700 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
                                Zurückgeholt
                              </button>
                            </>
                          )}
                          <button onClick={() => openCorrect(c)}
                            className="text-[12px] font-medium text-amber-700 hover:text-amber-800 px-3 py-1 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
                            Korrigieren
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[14px] font-semibold text-zinc-900 block">{fmt(totalValue)}</span>
                          {hasOpen && openValue !== totalValue && (
                            <span className="text-[11px] text-zinc-400">{fmt(openValue)} offen</span>
                          )}
                        </div>
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

      {/* PAYPAL */}
      {tab === 'paypal' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
              {(['new', 'ignored', 'linked', 'deleted'] as const).map(f => (
                <button key={f} onClick={() => setPpFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${ppFilter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                  {f === 'new' ? 'Offen' : f === 'ignored' ? 'Ignoriert' : f === 'linked' ? 'Verknüpft' : 'Gelöscht'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={fetchPaypalEmails} disabled={ppEmailFetching}
                className="flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 text-zinc-700 rounded-xl text-[13px] font-medium transition-colors">
                {ppEmailFetching ? 'E-Mails…' : 'E-Mails abrufen'}
              </button>
              <label className={`flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${ppImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                {ppImporting ? 'Importiert…' : 'CSV importieren'}
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={importPaypalCsv} />
              </label>
              <button onClick={syncPaypal} disabled={ppSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors">
                {ppSyncing ? 'Wird abgerufen…' : 'API-Abruf'}
              </button>
            </div>
          </div>
          {ppMsg && <p className="text-[12px] text-zinc-500 mb-3">{ppMsg}</p>}
          {paypalTxns.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
              <p className="text-[15px] font-medium text-zinc-900">Keine Zahlungen</p>
              <p className="text-[13px] text-zinc-400 mt-1">Über „Zahlungen abrufen" holst du eingegangene PayPal-Zahlungen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paypalTxns.map(t => (
                <div key={t.id} className={`bg-white rounded-2xl shadow-sm px-5 py-4 ${t.status === 'ignored' || t.status === 'deleted' ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-semibold text-zinc-900">{t.payerName || 'Unbekannt'}</span>
                        {t.status === 'linked' && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">verknüpft</span>}
                        {t.status === 'ignored' && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">ignoriert</span>}
                        {t.status === 'deleted' && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">gelöscht</span>}
                        <span className="text-[12px] text-zinc-400">{fmtDate(t.date)}</span>
                      </div>
                      {t.payerEmail && <p className="text-[12px] text-zinc-400 mt-0.5 truncate">{t.payerEmail}</p>}
                      <p className="text-[11px] text-zinc-400 truncate">ID {t.transactionId}</p>
                    </div>
                    <span className="text-[15px] font-semibold text-zinc-900 shrink-0">{fmt(t.amount)}</span>
                  </div>
                  {t.status === 'deleted' ? (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setPaypalStatus(t.id, 'new')} className="text-[12px] font-medium text-zinc-600 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Wiederherstellen</button>
                    </div>
                  ) : t.status !== 'linked' ? (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button onClick={() => openLink(t)}
                        className="text-[12px] font-medium text-green-600 hover:text-green-700 px-3 py-1 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                        Mit Verkauf verknüpfen
                      </button>
                      {t.status === 'new'
                        ? <button onClick={() => setPaypalStatus(t.id, 'ignored')} className="text-[12px] font-medium text-zinc-600 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Nicht relevant</button>
                        : <button onClick={() => setPaypalStatus(t.id, 'new')} className="text-[12px] font-medium text-zinc-600 px-3 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">Zurück zu offen</button>}
                      <button onClick={() => deletePaypal(t.id)} className="text-[12px] font-medium text-rose-600 px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">Löschen</button>
                    </div>
                  ) : null}
                </div>
              ))}
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
          <div className="mb-4">
            <div className="flex justify-end gap-2 flex-wrap">
              <label className={`flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl text-[13px] font-medium cursor-pointer transition-colors ${scanning ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                {scanning ? 'Beleg wird gelesen…' : 'Beleg scannen'}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={scanReceipt} />
              </label>
              <button onClick={() => { setExpReceipt(null); setScanMsg(null); setShowExpense(true) }}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Ausgabe erfassen
              </button>
            </div>
            {scanMsg && <p className="text-[12px] text-zinc-500 mt-2 text-right">{scanMsg}</p>}
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
                  <input type="text" inputMode="decimal" value={expAmount} onChange={e => setExpAmount(e.target.value)} required placeholder="0,00"
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
              {expReceipt && <p className="text-[12px] text-green-600 font-medium">📎 Beleg angehängt{expReceipt.fileName ? ` (${expReceipt.fileName})` : ''}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={savingExp}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2 text-[13px] font-semibold transition-colors">
                  {savingExp ? 'Wird gespeichert…' : 'Speichern'}
                </button>
                <button type="button" onClick={() => { setShowExpense(false); setExpReceipt(null); setScanMsg(null) }}
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
                    <p className="text-[12px] text-zinc-400 mt-0.5">{fmtDate(exp.date)}
                      {exp.receipt && <> · <a href={`/api/kassenbuch/expenses/${exp.id}/receipt`} target="_blank" rel="noreferrer" className="text-amber-600 hover:text-amber-700 font-medium">Beleg ansehen</a></>}
                    </p>
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

      {/* LAGERKORREKTIONEN */}
      {tab === 'lagerkorrektionen' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-zinc-900">Lagerkorrektionen</h3>
            <button
              onClick={() => setShowStockCorrection(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[13px] font-semibold transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Neue Korrektur
            </button>
          </div>

          {stockCorrections.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
              <p className="text-[15px] font-medium text-zinc-900">Noch keine Korrektionen</p>
              <p className="text-[13px] text-zinc-400 mt-1">Erfasse deine erste Lagerkorrektur</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-zinc-600 uppercase tracking-wider">Produkt</th>
                    <th className="px-4 py-3 text-right text-[12px] font-medium text-zinc-600 uppercase tracking-wider">Menge</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-zinc-600 uppercase tracking-wider">Grund</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-zinc-600 uppercase tracking-wider">Charge</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-zinc-600 uppercase tracking-wider">MHD</th>
                    <th className="px-4 py-3 text-left text-[12px] font-medium text-zinc-600 uppercase tracking-wider">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {stockCorrections.map(corr => {
                    const prod = products.find(p => p.id === corr.productId)
                    return (
                      <tr key={corr.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3 text-[13px] text-zinc-900 font-medium">{prod?.name || 'Unbekannt'}</td>
                        <td className={`px-4 py-3 text-right text-[13px] font-semibold ${corr.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {corr.quantity > 0 ? '+' : ''}{corr.quantity}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-zinc-600">{corr.reason}</td>
                        <td className="px-4 py-3 text-[13px] text-zinc-600">{corr.batchNumber || '—'}</td>
                        <td className="px-4 py-3 text-[13px] text-zinc-600">{corr.expiryDate ? fmtDate(corr.expiryDate) : '—'}</td>
                        <td className="px-4 py-3 text-[13px] text-zinc-600">{fmtDate(corr.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">E-Mail (optional)</label>
                <input type="email" value={saleEmail} onChange={e => { setSaleEmail(e.target.value); setSaleEmailError(false) }}
                  placeholder="kunde@example.de – für Quittung & spätere Mailings"
                  className={`w-full border rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent ${saleEmailError ? 'border-rose-300' : 'border-zinc-200'}`} />
                {saleEmailError && <p className="text-[11px] text-rose-600 mt-1">Bitte eine gültige E-Mail-Adresse eingeben.</p>}
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
                      <DecimalInput value={item.quantity} min={0} onChange={n => updateSaleItem(i, 'quantity', n)}
                        placeholder="Menge"
                        className="col-span-2 border border-zinc-200 rounded-lg px-2 py-2 text-[12px] bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      <DecimalInput value={item.price} min={0} onChange={n => updateSaleItem(i, 'price', n)}
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
                      <DecimalInput value={item.price} min={0} onChange={n => updateConsItem(i, 'price', n)}
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
                  <input type="text" inputMode="decimal" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required placeholder="0,00"
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Füllmenge (optional)</label>
                  <input type="text" inputMode="decimal" value={prodFillAmount} onChange={e => setProdFillAmount(e.target.value)}
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
      {sellConsignment && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Verkauf aus Kommission</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">{sellConsignment.commissionStore?.name || sellConsignment.locationName || '—'}</p>
              </div>
              <button onClick={() => setSellConsignment(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase block mb-1">Name / Käufer</label>
                  <input value={sellName} onChange={e => setSellName(e.target.value)} placeholder="z.B. Hofladen Müller"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-200" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase block mb-1">Datum</label>
                  <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-200" />
                </div>
              </div>

              {sellConsignment.items.map(item => {
                const open = item.quantity - item.soldQuantity - item.returnedQuantity
                if (open <= 0) return null
                const qty = sellQtys[item.id] ?? 0
                const price = sellPrices[item.id] ?? item.price
                const prod = products.find(p => p.id === item.product.id)
                const stockOk = !prod || Math.round(qty) <= prod.stockQuantity
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${stockOk ? 'border-zinc-200' : 'border-rose-200 bg-rose-50'}`}>
                    <div className="flex justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-900">{item.product.name}</p>
                        <p className="text-[11px] text-zinc-400">Offen: {open} · platziert zu {fmt(item.price)}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-green-700">{fmt(qty * price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <button type="button"
                          onClick={() => setSellQtys(q => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))}
                          className="w-9 h-9 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-lg transition-colors">−</button>
                        <span className="text-xl font-bold text-zinc-900 min-w-[32px] text-center">{qty}</span>
                        <button type="button"
                          onClick={() => setSellQtys(q => ({ ...q, [item.id]: Math.min(open, (q[item.id] ?? 0) + 1) }))}
                          className="w-9 h-9 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 text-lg transition-colors">+</button>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <DecimalInput value={price} min={0}
                          onChange={n => setSellPrices(p => ({ ...p, [item.id]: n }))}
                          className="w-20 border border-zinc-200 rounded-lg px-2 py-1.5 text-[13px] text-right focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        <span className="text-[12px] text-zinc-400">€/St.</span>
                      </div>
                    </div>
                    {!stockOk && prod && (
                      <p className="text-[11px] text-rose-600 font-medium mt-2">Nur {prod.stockQuantity} im Lager</p>
                    )}
                  </div>
                )
              })}

              {/* Erlös-Zusammenfassung */}
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex justify-between">
                  <p className="text-[13px] font-semibold text-zinc-700">Erlös</p>
                  <p className="text-[15px] font-bold text-green-700">
                    {fmt(sellConsignment.items.reduce((s, item) => s + (sellQtys[item.id] ?? 0) * (sellPrices[item.id] ?? item.price), 0))}
                  </p>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Erstellt Verkauf + bucht Lager ab</p>
              </div>

              {sellStockError.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {sellStockError.map(e => (
                    <p key={e.productName} className="text-[12px] text-rose-700 font-medium">
                      ⚠ {e.productName}: {e.requested} angefragt, nur {e.available} verfügbar
                    </p>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={confirmSell} disabled={sellingCons}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors">
                  {sellingCons ? 'Wird gebucht…' : 'Verkauf buchen'}
                </button>
                <button onClick={() => setSellConsignment(null)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kommission korrigieren */}
      {correctCons && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Kommission korrigieren</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">{correctCons.commissionStore?.name || correctCons.locationName || '—'}</p>
              </div>
              <button onClick={() => setCorrectCons(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {correctCons.items.map(item => {
                const row = corrRows[item.id] ?? { quantity: item.quantity, soldQuantity: item.soldQuantity, returnedQuantity: item.returnedQuantity, price: item.price }
                const open = row.quantity - row.soldQuantity - row.returnedQuantity
                const invalid = row.soldQuantity + row.returnedQuantity > row.quantity + 1e-9
                const set = (key: 'quantity' | 'soldQuantity' | 'returnedQuantity' | 'price', n: number) =>
                  setCorrRows(r => ({ ...r, [item.id]: { ...(r[item.id] ?? row), [key]: n } }))
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${invalid ? 'border-rose-200 bg-rose-50' : 'border-zinc-200'}`}>
                    <p className="text-[13px] font-semibold text-zinc-900 mb-2">{item.product.name}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-400 uppercase mb-1">Platziert</label>
                        <DecimalInput value={row.quantity} onChange={n => set('quantity', n)}
                          className="w-full border border-zinc-200 rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-400 uppercase mb-1">Verkauft</label>
                        <DecimalInput value={row.soldQuantity} onChange={n => set('soldQuantity', n)}
                          className="w-full border border-zinc-200 rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-zinc-400 uppercase mb-1">Zurück</label>
                        <DecimalInput value={row.returnedQuantity} onChange={n => set('returnedQuantity', n)}
                          className="w-full border border-zinc-200 rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-zinc-400">Preis</span>
                        <DecimalInput value={row.price} onChange={n => set('price', n)}
                          className="w-20 border border-zinc-200 rounded-lg px-2 py-1 text-[12px] text-right focus:outline-none focus:ring-2 focus:ring-amber-200" />
                        <span className="text-[11px] text-zinc-400">€</span>
                      </div>
                      <span className={`text-[11px] font-medium ${invalid ? 'text-rose-600' : 'text-zinc-400'}`}>
                        {invalid ? 'Verk.+Zurück > Platziert' : `${open} offen`}
                      </span>
                    </div>
                  </div>
                )
              })}
              <p className="text-[11px] text-zinc-400">Korrigiert nur die Kommissions-Buchführung – es wird kein Lager bewegt.</p>
              {correctMsg && <p className="text-[12px] text-rose-600 font-medium">{correctMsg}</p>}
              <div className="flex gap-3">
                <button onClick={saveCorrect} disabled={correcting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors">
                  {correcting ? 'Wird gespeichert…' : 'Korrektur speichern'}
                </button>
                <button onClick={() => setCorrectCons(null)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quittung */}
      {receiptSale && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Quittung</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  {receiptMeta ? `Nr. ${receiptMeta.formatted}` : 'Wird erstellt…'} · {receiptSale.customerName || 'Laufkundschaft'}
                </p>
              </div>
              <button onClick={() => setReceiptSale(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase mb-1.5">Zahlart</label>
                <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
                  {(['bar', 'ueberweisung'] as const).map(m => (
                    <button key={m} onClick={() => setReceiptPaymentMethod(m)}
                      className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${receiptPayment === m ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                      {m === 'bar' ? 'Bar' : 'Überweisung'}
                    </button>
                  ))}
                </div>
              </div>

              {receiptMeta ? (
                <div className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100">
                  <iframe key={receiptVersion} title="Quittung-Vorschau"
                    src={`/api/kassenbuch/sales/${receiptSale.id}/receipt?v=${receiptVersion}`}
                    className="w-full bg-white" style={{ height: 460 }} />
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-[13px] text-zinc-400">
                  {receiptBusy ? 'Quittung wird erstellt…' : (receiptMsg || 'Keine Vorschau')}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <a href={`/api/kassenbuch/sales/${receiptSale.id}/receipt?dl=1`} download
                  className="flex-1 text-center border border-zinc-200 hover:bg-zinc-50 rounded-xl py-2.5 text-[13px] font-medium text-zinc-700 transition-colors">
                  Herunterladen
                </a>
                <a href={`/api/kassenbuch/sales/${receiptSale.id}/receipt?v=${receiptVersion}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-center border border-zinc-200 hover:bg-zinc-50 rounded-xl py-2.5 text-[13px] font-medium text-zinc-700 transition-colors">
                  Öffnen / Drucken
                </a>
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase mb-1.5">Per E-Mail senden</label>
                <div className="flex gap-2">
                  <input type="email" value={receiptEmail} onChange={e => setReceiptEmail(e.target.value)} placeholder="kunde@example.de"
                    className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
                  <button onClick={emailReceipt} disabled={receiptBusy}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl px-5 text-[13px] font-semibold transition-colors">
                    {receiptBusy ? '…' : 'Senden'}
                  </button>
                </div>
                {receiptMsg && <p className={`text-[12px] mt-2 font-medium ${receiptMsg.startsWith('✓') ? 'text-green-600' : 'text-rose-600'}`}>{receiptMsg}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: PayPal-Zahlung verknüpfen */}
      {linkTxn && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-[15px] font-semibold text-zinc-900">Zahlung verknüpfen</h2>
                <p className="text-[12px] text-zinc-400 mt-0.5">Betrag: {fmt(linkTxn.amount)} (aus PayPal)</p>
              </div>
              <button onClick={() => setLinkTxn(null)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Käufer</label>
                <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Name aus Zahlung"
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>

              <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
                <button type="button" onClick={() => setLinkMode('sale')}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium ${linkMode === 'sale' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>Direktverkauf</button>
                <button type="button" onClick={() => setLinkMode('consignment')}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-medium ${linkMode === 'consignment' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>Kommission</button>
              </div>

              {linkMode === 'consignment' && (
                <div>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1">Kommission</label>
                  <select value={linkConsignmentId} onChange={e => setLinkConsignmentId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                    <option value="">Bitte wählen…</option>
                    {consignments.filter(c => c.items.some(i => i.quantity - i.soldQuantity - i.returnedQuantity > 0)).map(c => (
                      <option key={c.id} value={c.id}>{(c.commissionStore?.name || c.locationName || '—')} · {fmtDate(c.date)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Artikel & Menge</label>
                <div className="space-y-2">
                  {linkItems.map((row, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select value={row.productId}
                        onChange={e => setLinkItems(rows => rows.map((r, i) => i === idx ? { ...r, productId: e.target.value } : r))}
                        className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400">
                        <option value="">Artikel…</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min="1" value={row.quantity}
                        onChange={e => setLinkItems(rows => rows.map((r, i) => i === idx ? { ...r, quantity: parseInt(e.target.value) || 1 } : r))}
                        className="w-20 border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      {linkItems.length > 1 && (
                        <button type="button" onClick={() => setLinkItems(rows => rows.filter((_, i) => i !== idx))}
                          className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-400 hover:text-rose-500">−</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setLinkItems(rows => [...rows, { productId: '', quantity: 1 }])}
                    className="text-[12px] font-medium text-amber-600 hover:text-amber-700">+ Artikel hinzufügen</button>
                </div>
              </div>

              {linkError && <p className="text-[12px] text-rose-600 font-medium">{linkError}</p>}

              <div className="flex gap-3">
                <button onClick={confirmLink} disabled={linking}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors">
                  {linking ? 'Wird verknüpft…' : 'Verknüpfen & Verkauf buchen'}
                </button>
                <button onClick={() => setLinkTxn(null)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors">Abbrechen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Neue Lagerkorrektur */}
      {showStockCorrection && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="text-[15px] font-semibold text-zinc-900">Neue Lagerkorrektur</h2>
              <button onClick={() => setShowStockCorrection(false)} className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Artikel</label>
                <select
                  value={corrProductId || ''}
                  onChange={e => setCorrProductId(e.target.value || null)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                >
                  <option value="">-- Wählen --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit}) - Bestand: {p.stockQuantity}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Menge</label>
                <input
                  type="number"
                  value={corrQuantity}
                  onChange={e => setCorrQuantity(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  placeholder="z.B. 5 oder -3"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Grund</label>
                <input
                  type="text"
                  value={corrReason}
                  onChange={e => setCorrReason(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  placeholder="z.B. Abweichung Inventur"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Chargennummer (optional)</label>
                <input
                  type="text"
                  value={corrBatch}
                  onChange={e => setCorrBatch(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                  placeholder="z.B. 2025-HONIG-003"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-zinc-500 mb-1">Mindesthaltbarkeitsdatum (optional)</label>
                <input
                  type="date"
                  value={corrExpiry}
                  onChange={e => setCorrExpiry(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-[13px] bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveStockCorrection}
                  disabled={savingCorr}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl py-3 text-[13px] font-semibold transition-colors"
                >
                  {savingCorr ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  onClick={() => setShowStockCorrection(false)}
                  className="px-4 border border-zinc-200 rounded-xl text-[13px] text-zinc-500 hover:bg-zinc-50 transition-colors"
                >
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
