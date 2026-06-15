/**
 * @jest-environment node
 */
// src/__tests__/api/kassenbuch-consignment-sell.test.ts
import { NextRequest } from 'next/server'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
import { getServerSession } from 'next-auth/next'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    consignment: { findFirst: jest.fn(), update: jest.fn() },
    consignmentItem: { update: jest.fn() },
    product: { findMany: jest.fn(), update: jest.fn() },
    sale: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))
import { prisma } from '@/lib/prisma'

const { POST } = require('@/app/api/kassenbuch/consignments/[id]/sell/route')

const SESSION = { user: { id: 'user-1' } }
const mockSession = getServerSession as jest.Mock
const mockCons = prisma.consignment as jest.Mocked<typeof prisma.consignment>
const mockConsItem = prisma.consignmentItem as jest.Mocked<typeof prisma.consignmentItem>
const mockProduct = prisma.product as jest.Mocked<typeof prisma.product>
const mockSale = prisma.sale as jest.Mocked<typeof prisma.sale>
const mockTx = prisma.$transaction as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(SESSION)
})

function makeReq(body: unknown) {
  return new NextRequest('http://localhost', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function consignment(overrides: Partial<any> = {}) {
  return {
    id: 'c-1',
    userId: 'user-1',
    customerId: null,
    locationName: 'Markt',
    commissionStoreId: 'store-1',
    commissionStore: { id: 'store-1', name: 'Hofladen' },
    status: 'active',
    items: [
      { id: 'ci-1', productId: 'p-1', quantity: 10, soldQuantity: 0, returnedQuantity: 0, price: 8, product: { id: 'p-1', name: 'Honig 500g', stockQuantity: 10 } },
    ],
    ...overrides,
  }
}

it('returns 401 when not authenticated', async () => {
  mockSession.mockResolvedValueOnce(null)
  const res = await POST(makeReq({ items: [] }), { params: Promise.resolve({ id: 'c-1' }) })
  expect(res.status).toBe(401)
})

it('returns 404 when consignment not found', async () => {
  mockCons.findFirst.mockResolvedValueOnce(null as any)
  const res = await POST(makeReq({ items: [{ id: 'ci-1', quantity: 1 }] }), { params: Promise.resolve({ id: 'c-1' }) })
  expect(res.status).toBe(404)
})

it('returns 409 exceeds_open when quantity exceeds the open amount', async () => {
  mockCons.findFirst.mockResolvedValueOnce(consignment({
    items: [{ id: 'ci-1', productId: 'p-1', quantity: 5, soldQuantity: 3, returnedQuantity: 0, price: 8, product: { id: 'p-1', name: 'Honig 500g', stockQuantity: 100 } }],
  }) as any)
  const res = await POST(makeReq({ items: [{ id: 'ci-1', quantity: 3, price: 8 }] }), { params: Promise.resolve({ id: 'c-1' }) })
  expect(res.status).toBe(409)
  const body = await res.json()
  expect(body.error).toBe('exceeds_open')
  expect(body.items[0].open).toBe(2)
})

it('returns 409 insufficient_stock when stock is too low', async () => {
  mockCons.findFirst.mockResolvedValueOnce(consignment({
    items: [{ id: 'ci-1', productId: 'p-1', quantity: 10, soldQuantity: 0, returnedQuantity: 0, price: 8, product: { id: 'p-1', name: 'Honig 500g', stockQuantity: 2 } }],
  }) as any)
  const res = await POST(makeReq({ items: [{ id: 'ci-1', quantity: 5, price: 8 }] }), { params: Promise.resolve({ id: 'c-1' }) })
  expect(res.status).toBe(409)
  const body = await res.json()
  expect(body.error).toBe('insufficient_stock')
})

it('books a partial sale: creates sale with store ref, increments soldQuantity, decrements stock', async () => {
  mockCons.findFirst.mockResolvedValueOnce(consignment() as any)
  mockTx.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
  mockProduct.findMany.mockResolvedValueOnce([{ id: 'p-1', stockQuantity: 10 }] as any)
  mockSale.create.mockResolvedValueOnce({ id: 's-1' } as any)
  mockConsItem.update.mockResolvedValue({} as any)
  mockProduct.update.mockResolvedValue({} as any)
  mockCons.update.mockResolvedValueOnce({ id: 'c-1', status: 'active' } as any)

  const res = await POST(makeReq({ customerName: 'Max', items: [{ id: 'ci-1', quantity: 4, price: 9 }] }), { params: Promise.resolve({ id: 'c-1' }) })
  expect(res.status).toBe(200)

  expect(mockSale.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      customerName: 'Max',
      commissionStoreId: 'store-1',
      consignmentId: 'c-1',
      total: 36,
    }),
  }))
  expect(mockConsItem.update).toHaveBeenCalledWith({ where: { id: 'ci-1' }, data: { soldQuantity: { increment: 4 } } })
  expect(mockProduct.update).toHaveBeenCalledWith({ where: { id: 'p-1' }, data: { stockQuantity: { decrement: 4 } } })
  // partial -> status stays active
  expect(mockCons.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'active' }) }))
})

it('marks consignment as settled when the sale closes all open quantity', async () => {
  mockCons.findFirst.mockResolvedValueOnce(consignment({
    items: [{ id: 'ci-1', productId: 'p-1', quantity: 4, soldQuantity: 0, returnedQuantity: 0, price: 8, product: { id: 'p-1', name: 'Honig 500g', stockQuantity: 10 } }],
  }) as any)
  mockTx.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
  mockProduct.findMany.mockResolvedValueOnce([{ id: 'p-1', stockQuantity: 10 }] as any)
  mockSale.create.mockResolvedValueOnce({ id: 's-1' } as any)
  mockConsItem.update.mockResolvedValue({} as any)
  mockProduct.update.mockResolvedValue({} as any)
  mockCons.update.mockResolvedValueOnce({ id: 'c-1', status: 'settled' } as any)

  const res = await POST(makeReq({ items: [{ id: 'ci-1', quantity: 4, price: 8 }] }), { params: Promise.resolve({ id: 'c-1' }) })
  expect(res.status).toBe(200)
  expect(mockCons.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'settled' }) }))
})
