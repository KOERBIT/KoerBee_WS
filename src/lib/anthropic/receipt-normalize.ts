// Reine, SDK-freie Beleg-Logik (Konstanten + Normalisierung) – leicht testbar.

export const RECEIPT_CATEGORIES = ['Material', 'Tierarzt', 'Ausrüstung', 'Fahrt', 'Sonstiges'] as const

export const ALLOWED_RECEIPT_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
]

export interface ExtractedReceipt {
  amount: number | null
  date: string | null // YYYY-MM-DD
  category: string
  description: string | null
  currency: string
}

/** Bereinigt die Roh-Ausgabe des Modells in eine sichere, konsistente Form. */
export function normalizeReceipt(raw: unknown): ExtractedReceipt {
  const r = (raw ?? {}) as Record<string, unknown>

  let amount: number | null = null
  if (typeof r.amount === 'number' && Number.isFinite(r.amount)) {
    amount = Math.round(r.amount * 100) / 100
  } else if (typeof r.amount === 'string') {
    const n = parseFloat(r.amount.replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(n)) amount = Math.round(n * 100) / 100
  }
  if (amount != null && amount < 0) amount = Math.abs(amount)

  const catRaw = typeof r.category === 'string' ? r.category : ''
  const category = (RECEIPT_CATEGORIES as readonly string[]).includes(catRaw) ? catRaw : 'Sonstiges'

  let date: string | null = null
  if (typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) date = r.date

  const description = typeof r.description === 'string' && r.description.trim() ? r.description.trim() : null
  const currency = typeof r.currency === 'string' && r.currency.trim() ? r.currency.trim() : 'EUR'

  return { amount, date, category, description, currency }
}
