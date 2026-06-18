import { RawDetail } from './sync'

// PayPal REST API – Anbindung. Credentials/Base-URL nur serverseitig aus Env.
// Sandbox: https://api-m.sandbox.paypal.com · Live: https://api-m.paypal.com

interface PayPalConfig { base: string; clientId: string; secret: string }

function config(): PayPalConfig {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  const base = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'
  if (!clientId || !secret) throw new Error('paypal_not_configured')
  return { base: base.replace(/\/$/, ''), clientId, secret }
}

export function paypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}

let cachedToken: { token: string; expiresAt: number } | null = null

/** OAuth2 Client-Credentials-Token (mit kurzlebigem In-Memory-Cache). */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token
  const { base, clientId, secret } = config()
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('paypal_auth_failed')
  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3000) * 1000),
  }
  return cachedToken.token
}

/** Holt alle Transaktionen eines Zeitfensters (max. 31 Tage) inkl. Paginierung. */
export async function searchTransactions(start: Date, end: Date, token: string): Promise<RawDetail[]> {
  const { base } = config()
  const all: RawDetail[] = []
  let page = 1
  let totalPages = 1
  do {
    const params = new URLSearchParams({
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      fields: 'transaction_info,payer_info',
      page_size: '500',
      page: String(page),
    })
    const res = await fetch(`${base}/v1/reporting/transactions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('paypal_search_failed')
    const data = await res.json()
    all.push(...((data.transaction_details ?? []) as RawDetail[]))
    totalPages = data.total_pages ?? 1
    page++
  } while (page <= totalPages)
  return all
}
