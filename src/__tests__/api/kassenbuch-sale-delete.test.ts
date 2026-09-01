/**
 * @jest-environment node
 */
// src/__tests__/api/kassenbuch-sale-delete.test.ts
import { NextRequest } from 'next/server'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
import { getServerSession } from 'next-auth/next'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sale: { findFirst: jest.fn(), delete: jest.fn() },
    product: { update: jest.fn() },
    consignmentItem: { update: jest.fn() },
    consignment: { update: jest.fn() },
    $transaction: jest.fn(),
  },
}))
import { prisma } from '@/lib/prisma'

const { DELETE } = require('@/app/api/kassenbuch/sales/[id]/route')

const SESSION = { user: { id: 'user-1' } }
const mockSession = getServerSession as jest.Mock
const mockSale = prisma.sale as jest.Mocked<typeof prisma.sale>
const mockProduct = prisma.product as jest.Mocked<typeof prisma.product>
const mockConsItem = prisma.consignmentItem as jest.Mocked<typeof prisma.consignmentItem>
const mockCons = prisma.consignment as jest.Mocked<typeof prisma.consignment>
const mockTx = prisma.$transaction as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockSession.mockResolvedValue(SESSION)
  mockTx.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma as any))
  mockProduct.update.mockResolvedValue({} as any)
  mockConsItem.update.mockResolvedValue({} as any)
  mockCons.update.mockResolvedValue({} as any)
  mockSale.delete.mockResolvedValue({} as any)
})

const req = new NextRequest('http://localhost', { method: 'DELETE' })
const params = { params: Promise.resolve({ id: 's-1' }) }

it('returns 401 when not authenticated', async () => {
  mockSession.mockResolvedValueOnce(null)
  const res = await DELETE(req, params)
  expect(res.status).toBe(401)
})

it('returns 404 when the sale does not exist', async () => {
  mockSale.findFirst.mockResolvedValueOnce(null as any)
  const res = await DELETE(req, params)
  expect(res.status).toBe(404)
})

it('restores stock for a normal sale and deletes it', async () => {
  mockSale.findFirst.mockResolvedValueOnce({
    id: 's-1', consignmentId: null, consignment: null,
    items: [{ productId: 'p-1', quantity: 3 }, { productId: 'p-2', quantity: 2 }],
  } as any)

  const res = await DELETE(req, params)
  expect(res.status).toBe(200)
  expect(mockProduct.update).toHaveBeenCalledWith({ where: { id: 'p-1' }, data: { stockQuantity: { increment: 3 } } })
  expect(mockProduct.update).toHaveBeenCalledWith({ where: { id: 'p-2' }, data: { stockQuantity: { increment: 2 } } })
  expect(mockConsItem.update).not.toHaveBeenCalled()
  expect(mockSale.delete).toHaveBeenCalledWith({ where: { id: 's-1' } })
})

it('restores stock (rounded), frees soldQuantity and reactivates a settled consignment', async () => {
  mockSale.findFirst.mockResolvedValueOnce({
    id: 's-1', consignmentId: 'c-1',
    consignment: { id: 'c-1', status: 'settled', items: [{ id: 'ci-1', productId: 'p-1', soldQuantity: 4 }] },
    items: [{ productId: 'p-1', quantity: 4 }],
  } as any)

  const res = await DELETE(req, params)
  expect(res.status).toBe(200)
  expect(mockProduct.update).toHaveBeenCalledWith({ where: { id: 'p-1' }, data: { stockQuantity: { increment: 4 } } })
  expect(mockConsItem.update).toHaveBeenCalledWith({ where: { id: 'ci-1' }, data: { soldQuantity: 0 } })
  expect(mockCons.update).toHaveBeenCalledWith({ where: { id: 'c-1' }, data: { status: 'active' } })
  expect(mockSale.delete).toHaveBeenCalledWith({ where: { id: 's-1' } })
})
