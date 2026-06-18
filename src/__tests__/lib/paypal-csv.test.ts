import { parsePayPalCsv, parseGermanNumber } from '@/lib/paypal/csv'

describe('parseGermanNumber', () => {
  it('deutsches Format mit Tausenderpunkt', () => expect(parseGermanNumber('1.234,56')).toBeCloseTo(1234.56))
  it('Komma-Dezimal', () => expect(parseGermanNumber('12,50')).toBeCloseTo(12.5))
  it('Punkt-Dezimal (englisch)', () => expect(parseGermanNumber('1234.56')).toBeCloseTo(1234.56))
  it('negativ', () => expect(parseGermanNumber('-5,00')).toBeCloseTo(-5))
})

describe('parsePayPalCsv (komma-getrennt, deutsch)', () => {
  const csv = [
    '"Datum","Uhrzeit","Zeitzone","Name","Typ","Status","Währung","Brutto","Gebühr","Netto","Absender E-Mail-Adresse","Transaktionscode"',
    '"01.06.2026","10:15:00","CEST","Max Muster","Allgemeine Zahlung","Abgeschlossen","EUR","12,50","-0,55","11,95","max@example.com","TX123"',
    '"02.06.2026","11:00:00","CEST","Erika Beispiel","Zahlung","Abgeschlossen","EUR","-5,00","0,00","-5,00","erika@example.com","TXOUT"',
    '"01.06.2026","10:15:00","CEST","Max Muster","Allgemeine Zahlung","Abgeschlossen","EUR","12,50","-0,55","11,95","max@example.com","TX123"',
  ].join('\n')

  it('übernimmt nur eindeutige Eingänge (Brutto > 0)', () => {
    const r = parsePayPalCsv(csv)
    expect(r.total).toBe(3)
    expect(r.transactions).toHaveLength(1) // Ausgang + Duplikat fallen weg
    expect(r.skipped).toBe(2)
  })

  it('mappt die Felder korrekt', () => {
    const t = parsePayPalCsv(csv).transactions[0]
    expect(t.transactionId).toBe('TX123')
    expect(t.amount).toBeCloseTo(12.5)
    expect(t.currency).toBe('EUR')
    expect(t.payerName).toBe('Max Muster')
    expect(t.payerEmail).toBe('max@example.com')
    expect(t.paypalStatus).toBe('Abgeschlossen')
    expect(t.date.toISOString().slice(0, 10)).toBe('2026-06-01')
  })
})

describe('parsePayPalCsv (semikolon-getrennt)', () => {
  it('erkennt Semikolon-Trenner und Komma-Dezimal', () => {
    const csv = 'Datum;Name;Status;Währung;Brutto;Transaktionscode\n01.06.2026;Max;Abgeschlossen;EUR;12,50;TXS1'
    const r = parsePayPalCsv(csv)
    expect(r.transactions).toHaveLength(1)
    expect(r.transactions[0].amount).toBeCloseTo(12.5)
    expect(r.transactions[0].transactionId).toBe('TXS1')
  })

  it('ignoriert BOM und leere Zeilen', () => {
    const csv = '﻿Datum;Name;Status;Brutto;Transaktionscode\n01.06.2026;Max;OK;9,99;T1\n\n'
    expect(parsePayPalCsv(csv).transactions).toHaveLength(1)
  })
})
