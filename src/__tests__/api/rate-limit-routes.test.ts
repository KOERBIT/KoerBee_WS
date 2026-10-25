/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    rateLimit: { deleteMany: jest.fn().mockResolvedValue({}) },
    shopCustomer: { findUnique: jest.fn() },
    user: { findFirst: jest.fn() },
    shopPageView: { create: jest.fn() },
  },
}))
import { prisma } from '@/lib/prisma'

const { POST: shopLogin } = require('@/app/api/shop/auth/login/route')
const { POST: contact } = require('@/app/api/contact/route')
const { POST: analytics } = require('@/app/api/shop/analytics/route')
const { POST: reset } = require('@/app/api/shop/auth/reset-password/route')
const { authOptions } = require('@/lib/auth')

const q = prisma.$queryRaw as unknown as jest.Mock
const blocked = () => q.mockResolvedValue([{ count: 999, resetAt: new Date(Date.now() + 120_000) }])
const req = (body: unknown) =>
  new NextRequest('http://localhost', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
  })

beforeEach(() => jest.clearAllMocks())

describe('Rate-Limit greift in den Routen (429, keine weitere Verarbeitung)', () => {
  it('Shop-Login prüft das Passwort nicht mehr', async () => {
    blocked()
    const res = await shopLogin(req({ email: 'a@b.de', password: 'x' }))
    expect(res.status).toBe(429)
    expect(prisma.shopCustomer.findUnique).not.toHaveBeenCalled()
  })

  it('Kontaktformular versendet nichts', async () => {
    blocked()
    const res = await contact(req({ name: 'n', email: 'a@b.de', subject: 's', message: 'm' }))
    expect(res.status).toBe(429)
    expect(prisma.user.findFirst).not.toHaveBeenCalled()
  })

  it('Passwort-Reset und Analytics', async () => {
    blocked()
    expect((await reset(req({ email: 'a@b.de' }))).status).toBe(429)
    expect((await analytics(req({ path: '/shop' }))).status).toBe(429)
  })

  it('Admin-Login: authorize gibt bei Überschreitung null zurück, ohne die DB nach dem Nutzer zu fragen', async () => {
    blocked()
    const provider = authOptions.providers[0] as unknown as { options: { authorize: Function } }
    const out = await provider.options.authorize(
      { email: 'Admin@x.de', password: 'pw' },
      { headers: { 'x-forwarded-for': '9.9.9.9' } }
    )
    expect(out).toBeNull()
  })
})
