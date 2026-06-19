/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
import { getServerSession } from 'next-auth/next'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payPalTransaction: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), delete: jest.fn() },
  },
}))
import { prisma } from '@/lib/prisma'

const { PATCH, DELETE } = require('@/app/api/kassenbuch/paypal/[id]/route')
const { upsertPayPalTransactions } = require('@/lib/paypal/persist')

const mockSession = getServerSession as jest.Mock
const m = prisma.payPalTransaction as jest.Mocked<typeof prisma.payPalTransaction>

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue({ user: { id: 'u1' } })
})
const params = { params: Promise.resolve({ id: 't1' }) }
const jsonReq = (body: unknown) => new NextRequest('http://localhost', { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

describe('Soft-Delete', () => {
  it('markiert als deleted statt zu löschen', async () => {
    m.findFirst.mockResolvedValueOnce({ id: 't1', userId: 'u1', status: 'new' } as any)
    m.update.mockResolvedValueOnce({} as any)
    const res = await DELETE(new NextRequest('http://localhost', { method: 'DELETE' }), params)
    expect(res.status).toBe(200)
    expect(m.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { status: 'deleted' } })
    expect(m.delete).not.toHaveBeenCalled()
  })

  it('verweigert das Löschen einer verknüpften Zahlung (409)', async () => {
    m.findFirst.mockResolvedValueOnce({ id: 't1', userId: 'u1', status: 'linked' } as any)
    const res = await DELETE(new NextRequest('http://localhost', { method: 'DELETE' }), params)
    expect(res.status).toBe(409)
    expect(m.update).not.toHaveBeenCalled()
  })

  it('PATCH erlaubt Status deleted', async () => {
    m.findFirst.mockResolvedValueOnce({ id: 't1', userId: 'u1', status: 'ignored' } as any)
    m.update.mockResolvedValueOnce({ id: 't1', status: 'deleted' } as any)
    const res = await PATCH(jsonReq({ status: 'deleted' }), params)
    expect(res.status).toBe(200)
  })
})

describe('Dedup beim Wiederladen (upsertPayPalTransactions)', () => {
  const txn = { transactionId: 'TX1', date: new Date(), amount: 7, currency: 'EUR', payerName: 'Nena', payerEmail: null, paypalStatus: 'E-Mail' }

  it('legt vorhandene (z.B. gelöschte) NICHT neu an und behält den Status', async () => {
    m.findUnique.mockResolvedValueOnce({ id: 'x', status: 'deleted' } as any)
    m.update.mockResolvedValueOnce({} as any)
    const created = await upsertPayPalTransactions('u1', [txn])
    expect(created).toBe(0)
    expect(m.create).not.toHaveBeenCalled()
    // Update enthält keine status-Änderung
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ status: expect.anything() }) }))
  })

  it('legt unbekannte Transaktionen neu an', async () => {
    m.findUnique.mockResolvedValueOnce(null)
    m.create.mockResolvedValueOnce({} as any)
    const created = await upsertPayPalTransactions('u1', [txn])
    expect(created).toBe(1)
    expect(m.create).toHaveBeenCalled()
  })
})
