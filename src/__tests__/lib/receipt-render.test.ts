jest.mock('@/lib/receipt/assets', () => ({ LOGO_DATA_URI: '', SIGNATURE_DATA_URI: '' }))
import { formatReceiptNumber, renderSaleReceipt } from '@/lib/receipt/render'

describe('Quittung: Zeitzone Europe/Berlin', () => {
  it('31.12. 23:30 UTC ist in Berlin bereits 2027', () => {
    expect(formatReceiptNumber(7, new Date('2026-12-31T23:30:00Z'))).toBe('2027-0007')
  })
  it('Jahreswechsel in Winterzeit: 31.12. 22:59 UTC bleibt 2026', () => {
    expect(formatReceiptNumber(1, new Date('2026-12-31T22:59:00Z'))).toBe('2026-0001')
  })
  it('zeigt das Berliner Datum 01.01.2027 an', () => {
    const html = renderSaleReceipt({
      number: 7, date: new Date('2026-12-31T23:30:00Z'), items: [], total: 0, paymentMethod: 'bar',
    })
    expect(html).toContain('01.01.2027')
    expect(html).toContain('2027-0007')
  })
})
