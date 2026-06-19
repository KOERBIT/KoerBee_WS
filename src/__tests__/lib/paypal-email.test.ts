import { parsePayPalEmail } from '@/lib/paypal/email'

const SAMPLE = `Hallo Thomas Körbe!
PayPal
Nena Schneider hat dir 7,00 € EUR gesendet
Transaktionsdetails
Transaktionscode
69E292212J5065037    Transaktionsdatum
16. Juni 2026
Erhaltener Betrag    7,00 € EUR
Du siehst das Geld nicht in deinem Konto?
Keine Sorge – oft dauert das nur einige Minuten.
Mehr erfahren
PayPal
Copyright © 1999-2026 PayPal. Alle Rechte vorbehalten.`

describe('parsePayPalEmail', () => {
  it('liest Code, Sender, Betrag und Datum aus der echten PayPal-Mail', () => {
    const t = parsePayPalEmail(SAMPLE)
    expect(t).not.toBeNull()
    expect(t!.transactionId).toBe('69E292212J5065037')
    expect(t!.payerName).toBe('Nena Schneider')
    expect(t!.amount).toBeCloseTo(7)
    expect(t!.currency).toBe('EUR')
    expect(t!.date.toISOString().slice(0, 10)).toBe('2026-06-16')
  })

  it('funktioniert auch aus HTML-Mail (Tags werden entfernt)', () => {
    const html = `<html><body><p>Anna Bee hat dir 12,50 € EUR gesendet</p>
      <table><tr><td>Transaktionscode</td><td>ABC1234567890</td></tr>
      <tr><td>Transaktionsdatum</td><td>1. Juli 2026</td></tr></table></body></html>`
    const t = parsePayPalEmail(html)
    expect(t!.transactionId).toBe('ABC1234567890')
    expect(t!.payerName).toBe('Anna Bee')
    expect(t!.amount).toBeCloseTo(12.5)
    expect(t!.date.toISOString().slice(0, 10)).toBe('2026-07-01')
  })

  it('liefert null bei Nicht-Zahlungsmails', () => {
    expect(parsePayPalEmail('Newsletter: Neue Funktionen bei PayPal')).toBeNull()
  })
})
