import { MappedTransaction } from './sync'

// Parser für den PayPal-Aktivitäten-CSV-Export (funktioniert auch mit Privatkonten).
// Tolerant gegenüber deutschem/englischem Format, Komma/Semikolon-Trenner,
// deutschem Zahlenformat (1.234,56) und Anführungszeichen.

function detectDelimiter(headerLine: string): string {
  const semi = (headerLine.match(/;/g) || []).length
  const comma = (headerLine.match(/,/g) || []).length
  return semi > comma ? ';' : ','
}

/** Vollständiger CSV-Parser (berücksichtigt Anführungszeichen & Zeilenumbrüche in Feldern). */
function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === delim) { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (c === '\r') { /* \r\n → ignorieren */ }
    else cur += c
  }
  if (cur !== '' || row.length > 0) { row.push(cur); rows.push(row) }
  return rows
}

export function parseGermanNumber(raw: string): number {
  let s = (raw || '').trim().replace(/[\s ]/g, '').replace(/[^\d.,-]/g, '')
  if (!s) return NaN
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')
  if (hasDot && hasComma) {
    // Das zuletzt vorkommende Zeichen ist das Dezimaltrennzeichen
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (hasComma) {
    s = s.replace(',', '.')
  }
  return parseFloat(s)
}

function parseDate(dateStr: string, timeStr?: string): Date {
  const d = (dateStr || '').trim()
  const t = (timeStr || '').trim()
  const m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/) // DD.MM.YYYY
  if (m) {
    const [hh, mm, ss] = (t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/) ? t.split(':').map(Number) : [12, 0, 0])
    return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]), hh || 0, mm || 0, ss || 0))
  }
  const parsed = new Date(`${d} ${t}`.trim())
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

// Spalten anhand von Schlüsselwörtern finden (deutsch + englisch, case-insensitive)
const ALIASES = {
  date: ['datum', 'date'],
  time: ['uhrzeit', 'time'],
  name: ['name'],
  status: ['status'],
  currency: ['währung', 'waehrung', 'currency'],
  gross: ['brutto', 'gross'],
  email: ['absender', 'from email', 'von e-mail', 'sender'],
  txid: ['transaktionscode', 'transaktions-code', 'transaction id', 'transaktionsnummer', 'belegnummer'],
  type: ['typ', 'type'],
}

function indexFor(headers: string[], keys: string[]): number {
  return headers.findIndex(h => keys.some(k => h.includes(k)))
}

export interface CsvParseResult {
  transactions: MappedTransaction[]
  skipped: number
  total: number
}

/** Liest den PayPal-CSV-Export und liefert die Eingänge (Brutto > 0) als MappedTransaction. */
export function parsePayPalCsv(text: string): CsvParseResult {
  const clean = text.replace(/^﻿/, '') // BOM entfernen
  const firstLine = clean.slice(0, clean.indexOf('\n') >= 0 ? clean.indexOf('\n') : clean.length)
  const delim = detectDelimiter(firstLine)
  const rows = parseCsv(clean, delim)
  if (rows.length < 2) return { transactions: [], skipped: 0, total: 0 }

  const headers = rows[0].map(h => h.trim().toLowerCase())
  const idx = {
    date: indexFor(headers, ALIASES.date),
    time: indexFor(headers, ALIASES.time),
    name: indexFor(headers, ALIASES.name),
    status: indexFor(headers, ALIASES.status),
    currency: indexFor(headers, ALIASES.currency),
    gross: indexFor(headers, ALIASES.gross),
    email: indexFor(headers, ALIASES.email),
    txid: indexFor(headers, ALIASES.txid),
  }

  const seen = new Set<string>()
  const transactions: MappedTransaction[] = []
  let skipped = 0
  let total = 0

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.length === 1 && row[0].trim() === '') continue // Leerzeile
    total++
    const get = (i: number) => (i >= 0 && i < row.length ? row[i].trim() : '')
    const txid = get(idx.txid)
    const gross = parseGermanNumber(get(idx.gross))
    // Nur eindeutige Eingänge übernehmen (Brutto > 0)
    if (!txid || seen.has(txid) || !Number.isFinite(gross) || gross <= 0) { skipped++; continue }
    seen.add(txid)
    transactions.push({
      transactionId: txid,
      date: parseDate(get(idx.date), get(idx.time)),
      amount: gross,
      currency: get(idx.currency) || 'EUR',
      payerName: get(idx.name) || null,
      payerEmail: get(idx.email) || null,
      paypalStatus: get(idx.status) || null,
    })
  }
  return { transactions, skipped, total }
}
