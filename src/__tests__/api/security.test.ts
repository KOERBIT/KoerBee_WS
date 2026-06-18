/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
import { getServerSession } from 'next-auth/next'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    product: { findMany: jest.fn() },
    customer: { findFirst: jest.fn() },
    commissionStore: { findFirst: jest.fn() },
    consignment: { create: jest.fn() },
  },
}))
import { prisma } from '@/lib/prisma'

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }))

const { POST: createUser } = require('@/app/api/account/create-user/route')
const { POST: createConsignment } = require('@/app/api/kassenbuch/consignments/route')

const mockSession = getServerSession as jest.Mock
const mockUser = prisma.user as jest.Mocked<typeof prisma.user>
const mockProduct = prisma.product as jest.Mocked<typeof prisma.product>

beforeEach(() => jest.clearAllMocks())

function req(body: unknown) {
  return new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}

describe('Admin-Gate: create-user', () => {
  const validBody = { email: 'neu@b.de', password: '12345678', confirmPassword: '12345678' }

  it('verweigert Nicht-Admins mit 403', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } })
    const res = await createUser(req(validBody))
    expect(res.status).toBe(403)
    expect(mockUser.create).not.toHaveBeenCalled()
  })

  it('erlaubt Admins', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1', role: 'admin' } })
    mockUser.findUnique.mockResolvedValueOnce(null)
    mockUser.create.mockResolvedValueOnce({ id: 'u2', email: 'neu@b.de', name: null } as any)
    const res = await createUser(req(validBody))
    expect(res.status).toBe(200)
    expect(mockUser.create).toHaveBeenCalled()
  })
})

describe('IDOR: consignment darf keine fremden Produkte referenzieren', () => {
  it('422 wenn Produkt nicht dem User gehört', async () => {
    mockSession.mockResolvedValue({ user: { id: 'u1', role: 'user' } })
    mockProduct.findMany.mockResolvedValueOnce([]) // kein eigenes Produkt gefunden
    const res = await createConsignment(req({ items: [{ productId: 'fremd', quantity: 1, price: 5 }] }))
    expect(res.status).toBe(422)
    expect((await res.json()).error).toBe('invalid_product')
  })
})
