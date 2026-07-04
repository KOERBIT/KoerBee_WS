import { normalizeReceipt } from '@/lib/anthropic/receipt-normalize'

describe('normalizeReceipt', () => {
  it('rundet Zahlen-Betrag auf 2 Nachkommastellen', () => {
    expect(normalizeReceipt({ amount: 12.499, category: 'Material' }).amount).toBeCloseTo(12.5)
  })
  it('parst String-Betrag mit Komma', () => {
    expect(normalizeReceipt({ amount: '19,90', category: 'Material' }).amount).toBeCloseTo(19.9)
  })
  it('macht negative Beträge positiv', () => {
    expect(normalizeReceipt({ amount: -5, category: 'Fahrt' }).amount).toBe(5)
  })
  it('setzt unbekannte Kategorie auf Sonstiges', () => {
    expect(normalizeReceipt({ amount: 1, category: 'Quatsch' }).category).toBe('Sonstiges')
  })
  it('behält gültige Kategorie', () => {
    expect(normalizeReceipt({ amount: 1, category: 'Tierarzt' }).category).toBe('Tierarzt')
  })
  it('akzeptiert nur YYYY-MM-DD als Datum', () => {
    expect(normalizeReceipt({ amount: 1, category: 'Material', date: '2026-07-04' }).date).toBe('2026-07-04')
    expect(normalizeReceipt({ amount: 1, category: 'Material', date: '4.7.2026' }).date).toBeNull()
  })
  it('trimmt Beschreibung / default Währung EUR', () => {
    const r = normalizeReceipt({ amount: 1, category: 'Material', description: '  Imkershop  ' })
    expect(r.description).toBe('Imkershop')
    expect(r.currency).toBe('EUR')
  })
  it('liefert null-Betrag bei fehlendem/ungültigem Wert', () => {
    expect(normalizeReceipt({ category: 'Material' }).amount).toBeNull()
    expect(normalizeReceipt({ amount: 'abc', category: 'Material' }).amount).toBeNull()
  })
})
