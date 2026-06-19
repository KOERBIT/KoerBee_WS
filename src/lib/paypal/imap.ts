import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { parsePayPalEmail } from './email'
import { MappedTransaction } from './sync'

export interface MailConfig { host: string; port: number; user: string; password: string }

function makeClient(cfg: MailConfig): ImapFlow {
  return new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: true, // IMAPS (993)
    auth: { user: cfg.user, pass: cfg.password },
    logger: false,
  })
}

/** Prüft nur, ob Verbindung + Login klappen. */
export async function testMailConnection(cfg: MailConfig): Promise<boolean> {
  const client = makeClient(cfg)
  try {
    await client.connect()
    await client.logout()
    return true
  } catch {
    try { await client.logout() } catch { /* ignore */ }
    return false
  }
}

/** Liest PayPal-Eingangsmails der letzten `sinceDays` Tage und parst sie. */
export async function fetchPayPalEmails(
  cfg: MailConfig, sinceDays = 90,
): Promise<{ transactions: MappedTransaction[]; scanned: number }> {
  const client = makeClient(cfg)
  const transactions: MappedTransaction[] = []
  let scanned = 0

  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const since = new Date(Date.now() - sinceDays * 86400000)
      const uids = await client.search({ since, from: 'paypal' }, { uid: true })
      if (Array.isArray(uids) && uids.length > 0) {
        for await (const msg of client.fetch(uids, { source: true }, { uid: true })) {
          scanned++
          if (!msg.source) continue
          const parsed = await simpleParser(msg.source)
          const body = parsed.text || (typeof parsed.html === 'string' ? parsed.html : '') || ''
          const t = parsePayPalEmail(body)
          if (t) transactions.push(t)
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => { /* ignore */ })
  }
  return { transactions, scanned }
}
