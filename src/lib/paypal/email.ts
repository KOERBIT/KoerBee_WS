import { MappedTransaction } from './sync'
import { parseGermanNumber } from './csv'

// Parser für PayPal-„Zahlungseingang"-Benachrichtigungsmails (deutsch).
// Beispiel: „Nena Schneider hat dir 7,00 € EUR gesendet", „Transaktionscode 69E…",
// „Transaktionsdatum 16. Juni 2026", „Erhaltener Betrag 7,00 € EUR".

const MONTHS: Record<string, number> = {
  januar: 0, februar: 1, märz: 2, maerz: 2, april: 3, mai: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
}

export function stripHtml(s: string): string {
  if (!/<[a-z!/]/i.test(s)) return s
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&euro;/gi, '€')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

/**
 * Liest eine einzelne PayPal-Eingangsmail aus. Liefert null, wenn es keine
 * erkennbare Zahlungseingangsmail ist (z.B. fehlt Code oder Betrag).
 */
export function parsePayPalEmail(raw: string): MappedTransaction | null {
  const flat = stripHtml(raw).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()

  const codeM = flat.match(/Transaktions(?:code|nummer)\s+([0-9A-Z]{8,30})/i)
  const amountM = flat.match(/Erhaltener Betrag\s+([\d.,]+)\s*(?:€|EUR)/i)
    || flat.match(/hat dir\s+([\d.,]+)\s*(?:€|EUR)/i)
  if (!codeM || !amountM) return null

  const amount = parseGermanNumber(amountM[1])
  if (!Number.isFinite(amount) || amount <= 0) return null

  // Datum: „Transaktionsdatum 16. Juni 2026"
  let date = new Date()
  const dateM = flat.match(/Transaktionsdatum\s+(\d{1,2})\.\s*([A-Za-zäöüÄÖÜ]+)\s+(\d{4})/)
  if (dateM) {
    const month = MONTHS[dateM[2].toLowerCase()]
    if (month !== undefined) date = new Date(Date.UTC(Number(dateM[3]), month, Number(dateM[1]), 12, 0, 0))
  }

  // Sender: „<Name> hat dir … gesendet" – Name = großgeschriebene Wörter vor „hat dir"
  let payerName: string | null = null
  const nameM = flat.match(/([A-ZÄÖÜ][\p{L}.\-]*(?:\s+[A-ZÄÖÜ][\p{L}.\-]*){0,3})\s+hat dir\b/u)
  if (nameM) {
    const cleaned = nameM[1].split(' ').filter(w => w && w !== 'PayPal').join(' ').trim()
    payerName = cleaned || null
  }

  return {
    transactionId: codeM[1],
    date,
    amount,
    currency: 'EUR',
    payerName,
    payerEmail: null,
    paypalStatus: 'E-Mail',
  }
}
