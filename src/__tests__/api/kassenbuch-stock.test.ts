/**
 * @jest-environment node
 */
// src/__tests__/api/kassenbuch-stock.test.ts
import { NextRequest } from 'next/server'

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))
import { getServerSession } from 'next-auth/next'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    sale: { create: jest.fn() },
    consignment: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}))
import { prisma } from '@/lib/prisma'

const SESSION = { user: { id: 'user-1' } }
const mockSession = getServerSession as jest.Mock
const mockProduct = prisma.product as jest.Mocked<typeof prisma.product>
const mockSale = prisma.sale as jest.Mocked<typeof prisma.sale>
const mockTx = prisma.$transaction as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(SESSION)
})

function makeReq(body: unknown, method = 'POST') {
  return new NextRequest('http://localhost', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Stock endpoint ────────────────────────────────────────────────
describe('POST /api/kassenbuch/products/[id]/stock', () => {
  const { POST } = require('@/app/api/kassenbuch/products/[id]/stock/route')

  it('returns 401 when not authenticated', async () => {
    mockSession.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ quantity: 5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 for non-positive quantity', async () => {
    const res = await POST(makeReq({ quantity: 0 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-integer quantity', async () => {
    const res = await POST(makeReq({ quantity: 1.5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 404 when product not found', async () => {
    mockProduct.findFirst.mockResolvedValueOnce(null)
    const res = await POST(makeReq({ quantity: 5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(404)
  })

  it('increments stockQuantity and returns new value', async () => {
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 10 })
    mockProduct.update.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 15 })
    const res = await POST(makeReq({ quantity: 5 }), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.stockQuantity).toBe(15)
    expect(mockProduct.findFirst).toHaveBeenCalledWith({
      where: { id: 'p-1', userId: 'user-1' },
    })
    expect(mockProduct.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { stockQuantity: { increment: 5 } },
    })
  })
})

// ── Sales stock check ─────────────────────────────────────────────
describe('POST /api/kassenbuch/sales — stock check', () => {
  const { POST } = require('@/app/api/kassenbuch/sales/route')

  it('returns 409 with insufficient_stock when quantity exceeds stock', async () => {
    mockProduct.findMany.mockResolvedValueOnce([
      { id: 'p-1', name: 'Honig 500g', stockQuantity: 2 },
    ])
    const res = await POST(makeReq({
      items: [{ productId: 'p-1', quantity: 5, price: 8.5 }],
    }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('insufficient_stock')
    expect(body.items[0].productId).toBe('p-1')
    expect(body.items[0].requested).toBe(5)
    expect(body.items[0].available).toBe(2)
    expect(mockProduct.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['p-1'] }, userId: 'user-1' },
    })
  })

  it('creates sale and deducts stock when stock is sufficient', async () => {
    mockProduct.findMany.mockResolvedValueOnce([
      { id: 'p-1', name: 'Honig 500g', stockQuantity: 10 },
    ])
    const fakeSale = { id: 's-1', total: 42.5, items: [], customer: null }
    mockTx.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
    mockSale.create.mockResolvedValueOnce(fakeSale)
    mockProduct.update.mockResolvedValue({ id: 'p-1', stockQuantity: 5 })

    const res = await POST(makeReq({
      items: [{ productId: 'p-1', quantity: 5, price: 8.5 }],
      customerName: 'Max',
    }))
    expect(res.status).toBe(201)
    expect(mockProduct.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { stockQuantity: { decrement: 5 } },
    })
  })
})

// ── Product delete guard ──────────────────────────────────────────
describe('DELETE /api/kassenbuch/products/[id] — stock guard', () => {
  const { DELETE } = require('@/app/api/kassenbuch/products/[id]/route')

  it('returns 409 when stockQuantity > 0', async () => {
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 5 })
    const res = await DELETE(makeReq({}), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(409)
  })

  it('deletes when stockQuantity === 0', async () => {
    mockProduct.findFirst.mockResolvedValueOnce({ id: 'p-1', stockQuantity: 0 })
    ;(prisma.product.delete as jest.Mock).mockResolvedValueOnce({ id: 'p-1' })
    const res = await DELETE(makeReq({}), { params: Promise.resolve({ id: 'p-1' }) })
    expect(res.status).toBe(200)
  })
})
