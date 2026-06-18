// Reine, testbare Logik für den inkrementellen PayPal-Sync.
// (IO – Token, HTTP, DB – passiert in der Route bzw. im client.ts.)

const DAY = 86400000
export const MAX_WINDOW_DAYS = 31

export interface MappedTransaction {
  transactionId: string
  date: Date
  amount: number
  currency: string
  payerName: string | null
  payerEmail: string | null
  paypalStatus: string | null
}

/** Zeitraum für den nächsten Sync: ab letztem Sync, sonst Fallback-Zeitraum. */
export function resolveSyncRange(
  lastSyncedAt: Date | null, now: Date, fallbackDays: number,
): { start: Date; end: Date } {
  const start = lastSyncedAt ?? new Date(now.getTime() - fallbackDays * DAY)
  return { start, end: now }
}

/** Teilt einen Zeitraum in Blöcke von max. 31 Tagen (API-Limit der Transaction Search). */
export function chunkRange(start: Date, end: Date, maxDays = MAX_WINDOW_DAYS): { start: Date; end: Date }[] {
  const chunks: { start: Date; end: Date }[] = []
  let s = start
  while (s < end) {
    const e = new Date(Math.min(s.getTime() + maxDays * DAY, end.getTime()))
    chunks.push({ start: s, end: e })
    s = e
  }
  return chunks
}

export type RawDetail = {
  transaction_info?: {
    transaction_id?: string
    transaction_initiation_date?: string
    transaction_updated_date?: string
    transaction_amount?: { currency_code?: string; value?: string }
    transaction_status?: string
  }
  payer_info?: {
    email_address?: string
    payer_name?: { alternate_full_name?: string; given_name?: string; surname?: string }
  }
}

/** Mappt eine PayPal-Transaktion (transaction_details[]) auf unser Modell. */
export function mapTransaction(detail: RawDetail): MappedTransaction | null {
  const info = detail.transaction_info
  if (!info?.transaction_id) return null
  const name = detail.payer_info?.payer_name
  const payerName = name?.alternate_full_name
    || [name?.given_name, name?.surname].filter(Boolean).join(' ')
    || null
  return {
    transactionId: info.transaction_id,
    date: new Date(info.transaction_initiation_date ?? info.transaction_updated_date ?? Date.now()),
    amount: parseFloat(info.transaction_amount?.value ?? '0'),
    currency: info.transaction_amount?.currency_code ?? 'EUR',
    payerName,
    payerEmail: detail.payer_info?.email_address ?? null,
    paypalStatus: info.transaction_status ?? null,
  }
}

export interface SyncDeps {
  now: Date
  lastSyncedAt: Date | null
  fallbackDays: number
  /** Holt die gemappten Transaktionen für ein Zeitfenster (darf werfen). */
  fetchChunk: (start: Date, end: Date) => Promise<MappedTransaction[]>
  /** Persistiert (Upsert/Dedup) und liefert die Anzahl neu importierter zurück. */
  upsert: (txns: MappedTransaction[]) => Promise<number>
}

/**
 * Führt den inkrementellen Sync aus. Wirft `fetchChunk`, propagiert der Fehler –
 * dann darf der Aufrufer `lastSyncedAt` NICHT fortschreiben (nichts geht verloren).
 */
export async function performSync(deps: SyncDeps): Promise<{ imported: number; newLastSyncedAt: Date }> {
  const { start, end } = resolveSyncRange(deps.lastSyncedAt, deps.now, deps.fallbackDays)
  let imported = 0
  for (const c of chunkRange(start, end)) {
    const txns = await deps.fetchChunk(c.start, c.end)
    imported += await deps.upsert(txns)
  }
  return { imported, newLastSyncedAt: end }
}
