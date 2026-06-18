import { RawDetail } from './sync'

// PayPal REST API – Anbindung. Credentials/Base-URL werden übergeben
// (pro Nutzer aus der DB bzw. als Env-Fallback, siehe config.ts).
// Sandbox: https://api-m.sandbox.paypal.com · Live: https://api-m.paypal.com

export interface PayPalConfig { base: string; clientId: string; secret: string }

const tokenCache = new Map<string, { token: string; expiresAt: number }>()

/** OAuth2 Client-Credentials-Token (In-Memory-Cache pro clientId). */
export async function getAccessToken(cfg: PayPalConfig): Promise<string> {
  const cached = tokenCache.get(cfg.clientId)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  const auth = Buffer.from(`${cfg.clientId}:${cfg.secret}`).toString('base64')
  const res = await fetch(`${cfg.base}/v1/oauth2/token`, {
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
  tokenCache.set(cfg.clientId, {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3000) * 1000),
  })
  return data.access_token
}

/** Holt alle Transaktionen eines Zeitfensters (max. 31 Tage) inkl. Paginierung. */
export async function searchTransactions(base: string, start: Date, end: Date, token: string): Promise<RawDetail[]> {
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
