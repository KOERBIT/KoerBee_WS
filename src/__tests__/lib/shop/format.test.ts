import { formatEur, formatDate, unitLabel } from '@/lib/shop/format'

describe('shop format', () => {
  it('Preise je Sprache', () => {
    expect(formatEur(12.5, 'de').replace(/\s/g, ' ')).toBe('12,50 €')
    expect(formatEur(12.5, 'en')).toBe('€12.50')
  })
  it('Datum je Sprache', () => {
    expect(formatDate('2026-10-12', 'de')).toBe('12.10.2026')
    expect(formatDate('2026-10-12', 'en')).toBe('12/10/2026')
  })
  it('Einheit nur auf Englisch übersetzt, Unbekanntes bleibt', () => {
    expect(unitLabel('Stück', 'en')).toBe('piece')
    expect(unitLabel('Stück', 'de')).toBe('Stück')
    expect(unitLabel('kg', 'en')).toBe('kg')
  })
})
