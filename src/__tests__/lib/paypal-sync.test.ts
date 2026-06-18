import {
  resolveSyncRange, chunkRange, mapTransaction, performSync, MappedTransaction,
} from '@/lib/paypal/sync'

const DAY = 86400000

describe('resolveSyncRange', () => {
  const now = new Date('2026-06-18T00:00:00Z')
  it('startet beim Erstabruf am Fallback-Zeitraum', () => {
    const { start, end } = resolveSyncRange(null, now, 31)
    expect(end).toEqual(now)
    expect(start).toEqual(new Date(now.getTime() - 31 * DAY))
  })
  it('startet inkrementell ab lastSyncedAt', () => {
    const last = new Date('2026-06-10T00:00:00Z')
    expect(resolveSyncRange(last, now, 31).start).toEqual(last)
  })
})

describe('chunkRange', () => {
  it('teilt 70 Tage in drei Blöcke à max. 31 Tage', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const end = new Date(start.getTime() + 70 * DAY)
    const chunks = chunkRange(start, end)
    expect(chunks).toHaveLength(3)
    chunks.forEach(c => expect((c.end.getTime() - c.start.getTime()) / DAY).toBeLessThanOrEqual(31))
    expect(chunks[0].start).toEqual(start)
    expect(chunks[2].end).toEqual(end)
  })
  it('ein Block bei kurzem Zeitraum', () => {
    const start = new Date('2026-06-01T00:00:00Z')
    expect(chunkRange(start, new Date(start.getTime() + 9 * DAY))).toHaveLength(1)
  })
})

describe('mapTransaction', () => {
  it('mappt Felder und setzt den Namen zusammen', () => {
    const r = mapTransaction({
      transaction_info: {
        transaction_id: 'T1',
        transaction_initiation_date: '2026-06-01T10:00:00Z',
        transaction_amount: { currency_code: 'EUR', value: '12.50' },
        transaction_status: 'S',
      },
      payer_info: { email_address: 'a@b.de', payer_name: { given_name: 'Max', surname: 'Muster' } },
    })
    expect(r).toMatchObject({
      transactionId: 'T1', amount: 12.5, currency: 'EUR',
      payerName: 'Max Muster', payerEmail: 'a@b.de', paypalStatus: 'S',
    })
  })
  it('bevorzugt alternate_full_name', () => {
    const r = mapTransaction({ transaction_info: { transaction_id: 'T2' }, payer_info: { payer_name: { alternate_full_name: 'Imkerei Müller', given_name: 'X' } } })
    expect(r?.payerName).toBe('Imkerei Müller')
  })
  it('liefert null ohne Transaktions-ID', () => {
    expect(mapTransaction({ transaction_info: {} })).toBeNull()
  })
})

describe('performSync', () => {
  const now = new Date('2026-06-18T00:00:00Z')
  const txn: MappedTransaction = {
    transactionId: 'T1', date: now, amount: 10, currency: 'EUR',
    payerName: 'Max', payerEmail: null, paypalStatus: 'S',
  }

  it('nutzt lastSyncedAt als Start und schreibt newLastSyncedAt = end', async () => {
    const fetchChunk = jest.fn().mockResolvedValue([txn])
    const upsert = jest.fn().mockResolvedValue(1)
    const last = new Date('2026-06-10T00:00:00Z')
    const r = await performSync({ now, lastSyncedAt: last, fallbackDays: 31, fetchChunk, upsert })
    expect(fetchChunk).toHaveBeenCalledTimes(1)
    expect(fetchChunk.mock.calls[0][0]).toEqual(last)
    expect(r.newLastSyncedAt).toEqual(now)
    expect(r.imported).toBe(1)
  })

  it('ruft fetchChunk pro 31-Tage-Block (großer Zeitraum)', async () => {
    const fetchChunk = jest.fn().mockResolvedValue([])
    const upsert = jest.fn().mockResolvedValue(0)
    const last = new Date(now.getTime() - 70 * DAY)
    await performSync({ now, lastSyncedAt: last, fallbackDays: 31, fetchChunk, upsert })
    expect(fetchChunk).toHaveBeenCalledTimes(3)
  })

  it('propagiert Fehler, damit lastSyncedAt nicht fortgeschrieben wird', async () => {
    const fetchChunk = jest.fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('boom'))
    const upsert = jest.fn().mockResolvedValue(0)
    const last = new Date(now.getTime() - 70 * DAY)
    await expect(performSync({ now, lastSyncedAt: last, fallbackDays: 31, fetchChunk, upsert })).rejects.toThrow('boom')
  })

  it('summiert importierte (Dedup über upsert-Rückgabe)', async () => {
    const fetchChunk = jest.fn().mockResolvedValue([txn, txn])
    const upsert = jest.fn().mockResolvedValue(2)
    const r = await performSync({ now, lastSyncedAt: new Date(now.getTime() - 5 * DAY), fallbackDays: 31, fetchChunk, upsert })
    expect(r.imported).toBe(2)
    expect(upsert).toHaveBeenCalledWith([txn, txn])
  })
})
