import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { PayPalConfig } from './client'

export const PAYPAL_SANDBOX = 'https://api-m.sandbox.paypal.com'
export const PAYPAL_LIVE = 'https://api-m.paypal.com'

export function normalizeBase(b?: string | null): string {
  return (b || PAYPAL_SANDBOX).replace(/\/$/, '')
}

/**
 * Liefert die PayPal-Konfiguration für einen Nutzer: bevorzugt die in den
 * Einstellungen hinterlegten (verschlüsselten) Credentials, sonst die
 * Env-Variablen als Fallback. Null, wenn nichts konfiguriert ist.
 */
export async function getPayPalConfigForUser(userId: string): Promise<PayPalConfig | null> {
  const cred = await prisma.payPalCredential.findUnique({ where: { userId } })
  if (cred?.clientId && cred?.clientSecret) {
    try {
      return { clientId: cred.clientId, secret: decrypt(cred.clientSecret), base: normalizeBase(cred.apiBase) }
    } catch {
      // Entschlüsselung fehlgeschlagen (z.B. Schlüssel geändert) → Env-Fallback prüfen
    }
  }
  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    return {
      clientId: process.env.PAYPAL_CLIENT_ID,
      secret: process.env.PAYPAL_CLIENT_SECRET,
      base: normalizeBase(process.env.PAYPAL_API_BASE),
    }
  }
  return null
}
