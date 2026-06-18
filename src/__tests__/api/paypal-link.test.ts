/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
import { getServerSession } from 'next-auth/next'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payPalTransaction: { findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    product: { findMany: jest.fn(), update: jest.fn() },
    consignment: { findFirst: jest.fn(), update: jest.fn() },
    consignmentItem: { update: jest.fn() },
    sale: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))
import { prisma } from '@/lib/prisma'

const { POST } = require('@/app/api/kassenbuch/paypal/[id]/link/route')

const mockSession = getServerSession as jest.Mock
const mockTxn = prisma.payPalTransaction as jest.Mocked<typeof prisma.payPalTransaction>
const mockProduct = prisma.product as jest.Mocked<typeof prisma.product>
const mockCons = prisma.consignment as jest.Mocked<typeof prisma.consignment>
const mockConsItem = prisma.consignmentItem as jest.Mocked<typeof prisma.consignmentItem>
const mockSale = prisma.sale as jest.Mocked<typeof prisma.sale>
const mockTx = prisma.$transaction as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue({ user: { id: 'u1' } })
  ;(mockTxn.updateMany as jest.Mock).mockResolvedValue({ count: 1 }) // Status-Claim erfolgreich
})

function req(body: unknown) {
  return new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}
const params = { params: Promise.resolve({ id: 'tx1' }) }

it('returns 409 insufficient_stock for a direct sale exceeding stock', async () => {
  mockTxn.findFirst.mockResolvedValueOnce({ id: 'tx1', userId: 'u1', amount: 50, status: 'new', payerName: 'Max', date: new Date(), transactionId: 'T1' } as any)
  mockProduct.findMany.mockResolvedValueOnce([{ id: 'p1', name: 'Honig', price: 8, stockQuantity: 2, userId: 'u1' }] as any)
  const res = await POST(req({ mode: 'sale', items: [{ productId: 'p1', quantity: 5 }] }), params)
  expect(res.status).toBe(409)
  expect((await res.json()).error).toBe('insufficient_stock')
})

it('links a direct sale: creates Sale with PayPal amount, decrements stock, flags mismatch', async () => {
  mockTxn.findFirst.mockResolvedValueOnce({ id: 'tx1', userId: 'u1', amount: 50, status: 'new', payerName: 'Max', date: new Date(), transactionId: 'T1' } as any)
  mockProduct.findMany.mockResolvedValue([{ id: 'p1', name: 'Honig', price: 8, stockQuantity: 10, userId: 'u1' }] as any)
  mockTx.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
  mockSale.create.mockResolvedValueOnce({ id: 's1' } as any)
  mockProduct.update.mockResolvedValue({} as any)
  mockTxn.update.mockResolvedValue({} as any)

  const res = await POST(req({ mode: 'sale', items: [{ productId: 'p1', quantity: 4 }] }), params)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.mismatch).toBe(true)       // 4×8=32 ≠ 50
  expect(body.paid).toBe(50)
  expect(mockSale.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total: 50 }) }))
  expect(mockProduct.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stockQuantity: { decrement: 4 } } })
  expect(mockTxn.update).toHaveBeenCalledWith({ where: { id: 'tx1' }, data: { saleId: 's1' } })
  expect(mockTxn.updateMany).toHaveBeenCalledWith({ where: { id: 'tx1', userId: 'u1', status: { not: 'linked' } }, data: { status: 'linked' } })
})

it('links to a consignment: books soldQuantity and references the store', async () => {
  mockTxn.findFirst.mockResolvedValueOnce({ id: 'tx1', userId: 'u1', amount: 24, status: 'new', payerName: 'Max', date: new Date(), transactionId: 'T1' } as any)
  mockProduct.findMany.mockResolvedValue([{ id: 'p1', name: 'Honig', price: 8, stockQuantity: 10, userId: 'u1' }] as any)
  mockCons.findFirst.mockResolvedValueOnce({
    id: 'c1', userId: 'u1', commissionStoreId: 'st1', locationName: null, commissionStore: { id: 'st1', name: 'Hofladen' },
    items: [{ id: 'ci1', productId: 'p1', quantity: 10, soldQuantity: 0, returnedQuantity: 0, price: 8, product: { id: 'p1', name: 'Honig', stockQuantity: 10 } }],
  } as any)
  mockTx.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
  mockSale.create.mockResolvedValueOnce({ id: 's2' } as any)
  mockConsItem.update.mockResolvedValue({} as any)
  mockProduct.update.mockResolvedValue({} as any)
  mockCons.update.mockResolvedValue({} as any)
  mockTxn.update.mockResolvedValue({} as any)

  const res = await POST(req({ mode: 'consignment', consignmentId: 'c1', items: [{ productId: 'p1', quantity: 3 }] }), params)
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.mismatch).toBe(false)      // 3×8=24 = 24
  expect(mockConsItem.update).toHaveBeenCalledWith({ where: { id: 'ci1' }, data: { soldQuantity: { increment: 3 } } })
  expect(mockSale.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ total: 24, commissionStoreId: 'st1', consignmentId: 'c1' }) }))
  expect(mockTxn.update).toHaveBeenCalledWith({ where: { id: 'tx1' }, data: { saleId: 's2', consignmentId: 'c1' } })
})

it('rejects fractional quantity (invalid_quantity)', async () => {
  mockTxn.findFirst.mockResolvedValueOnce({ id: 'tx1', userId: 'u1', amount: 50, status: 'new', payerName: 'Max', date: new Date(), transactionId: 'T1' } as any)
  const res = await POST(req({ mode: 'sale', items: [{ productId: 'p1', quantity: 1.5 }] }), params)
  expect(res.status).toBe(400)
  expect((await res.json()).error).toBe('invalid_quantity')
})

it('rejects linking a non-positive amount (refund)', async () => {
  mockTxn.findFirst.mockResolvedValueOnce({ id: 'tx1', userId: 'u1', amount: -10, status: 'new', payerName: 'Max', date: new Date(), transactionId: 'T1' } as any)
  const res = await POST(req({ mode: 'sale', items: [{ productId: 'p1', quantity: 1 }] }), params)
  expect(res.status).toBe(422)
  expect((await res.json()).error).toBe('invalid_amount')
})

it('rolls back with 409 when the status claim loses the race', async () => {
  mockTxn.findFirst.mockResolvedValueOnce({ id: 'tx1', userId: 'u1', amount: 8, status: 'new', payerName: 'Max', date: new Date(), transactionId: 'T1' } as any)
  mockProduct.findMany.mockResolvedValue([{ id: 'p1', name: 'Honig', price: 8, stockQuantity: 10, userId: 'u1' }] as any)
  mockTx.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
  ;(mockTxn.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 }) // bereits verknüpft (Race)
  const res = await POST(req({ mode: 'sale', items: [{ productId: 'p1', quantity: 1 }] }), params)
  expect(res.status).toBe(409)
  expect((await res.json()).error).toBe('already_linked')
  expect(mockSale.create).not.toHaveBeenCalled()
})

it('rejects linking an already linked transaction', async () => {
  mockTxn.findFirst.mockResolvedValueOnce({ id: 'tx1', userId: 'u1', amount: 50, status: 'linked' } as any)
  const res = await POST(req({ mode: 'sale', items: [{ productId: 'p1', quantity: 1 }] }), params)
  expect(res.status).toBe(409)
  expect((await res.json()).error).toBe('already_linked')
})
