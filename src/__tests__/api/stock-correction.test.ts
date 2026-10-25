/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
import { getServerSession } from 'next-auth/next'

const tx = {
  product: { updateMany: jest.fn(), findUnique: jest.fn() },
  stockCorrection: { create: jest.fn() },
}
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: { findFirst: jest.fn() },
    stockCorrection: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))
import { prisma } from '@/lib/prisma'
import { POST } from '@/app/api/kassenbuch/products/[id]/stock-correction/route'

const mockSession = getServerSession as jest.Mock
const mockFindFirst = prisma.product.findFirst as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

const ctx = { params: Promise.resolve({ id: 'p1' }) }
const post = (body: unknown, raw?: string) =>
  POST(new NextRequest('http://x/api', { method: 'POST', body: raw ?? JSON.stringify(body) }), ctx)

beforeEach(() => {
  jest.resetAllMocks()
  mockSession.mockResolvedValue({ user: { id: 'u1' } })
  mockFindFirst.mockResolvedValue({ id: 'p1' })
  mockTransaction.mockImplementation(async (fn: (t: typeof tx) => unknown) => fn(tx))
  tx.product.updateMany.mockResolvedValue({ count: 1 })
  tx.product.findUnique.mockResolvedValue({ stockQuantity: 7 })
  tx.stockCorrection.create.mockResolvedValue({})
})

describe('POST stock-correction', () => {
  it('401 ohne Session', async () => {
    mockSession.mockResolvedValue(null)
    expect((await post({ quantity: 1, reason: 'x' })).status).toBe(401)
  })
  it('400 bei kaputtem JSON', async () => {
    expect((await post(null, '{bad')).status).toBe(400)
  })
  it('400 bei Body null', async () => {
    expect((await post(null)).status).toBe(400)
  })
  it.each([0, 1.5, NaN, '3', null])('400 bei ungültiger Menge %p', async (q) => {
    expect((await post({ quantity: q, reason: 'x' })).status).toBe(400)
  })
  it('400 ohne Grund und bei ungültigem MHD', async () => {
    expect((await post({ quantity: 1, reason: ' ' })).status).toBe(400)
    expect((await post({ quantity: 1, reason: 'x', expiryDate: 'kein-datum' })).status).toBe(400)
  })
  it('404 bei fremdem Artikel (Besitzprüfung per userId)', async () => {
    mockFindFirst.mockResolvedValue(null)
    expect((await post({ quantity: 1, reason: 'x' })).status).toBe(404)
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 'p1', userId: 'u1' } })
    expect(mockTransaction).not.toHaveBeenCalled()
  })
  it('positive Korrektur: atomar in Transaktion, ohne gte-Guard', async () => {
    const res = await post({ quantity: 5, reason: ' Fund ' })
    expect(res.status).toBe(200)
    expect((await res.json()).stockQuantity).toBe(7)
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1', userId: 'u1' },
      data: { stockQuantity: { increment: 5 } },
    })
    expect(tx.stockCorrection.create.mock.calls[0][0].data).toMatchObject({ quantity: 5, reason: 'Fund' })
  })
  it('negative Korrektur setzt gte-Guard', async () => {
    await post({ quantity: -3, reason: 'Bruch' })
    expect(tx.product.updateMany.mock.calls[0][0].where).toEqual({
      id: 'p1', userId: 'u1', stockQuantity: { gte: 3 },
    })
  })
  it('409 wenn Bestand unter 0 fiele; kein Protokolleintrag', async () => {
    tx.product.updateMany.mockResolvedValue({ count: 0 })
    const res = await post({ quantity: -100, reason: 'Bruch' })
    expect(res.status).toBe(409)
    expect(tx.stockCorrection.create).not.toHaveBeenCalled()
  })
  it('500 und Fehler propagiert aus Transaktion (Rollback), wenn Protokoll fehlschlägt', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    tx.stockCorrection.create.mockRejectedValue(new Error('db down'))
    const res = await post({ quantity: 2, reason: 'x' })
    expect(res.status).toBe(500)
  })
})
