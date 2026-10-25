/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: jest.fn(), rateLimit: { deleteMany: jest.fn().mockResolvedValue({}) } },
}))
import { prisma } from '@/lib/prisma'
import { rateLimit, rateLimitAll, clientIp, tooManyRequests } from '@/lib/rate-limit'

const q = prisma.$queryRaw as unknown as jest.Mock
const future = (s: number) => new Date(Date.now() + s * 1000)

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('rateLimit', () => {
  it('erlaubt bis zum Limit und blockiert danach mit retryAfter', async () => {
    q.mockResolvedValueOnce([{ count: 10, resetAt: future(600) }])
    expect(await rateLimit('k', 10, 900)).toEqual({ ok: true, retryAfter: 0 })
    q.mockResolvedValueOnce([{ count: 11, resetAt: future(600) }])
    const r = await rateLimit('k', 10, 900)
    expect(r.ok).toBe(false)
    expect(r.retryAfter).toBeGreaterThan(590)
    expect(r.retryAfter).toBeLessThanOrEqual(600)
  })

  it('count kommt als bigint aus der DB', async () => {
    q.mockResolvedValueOnce([{ count: BigInt(3), resetAt: future(60) }])
    expect((await rateLimit('k', 5, 60)).ok).toBe(true)
  })

  it('fällt bei DB-Fehler offen aus (blockiert nicht)', async () => {
    q.mockRejectedValueOnce(new Error('db down'))
    expect(await rateLimit('k', 1, 60)).toEqual({ ok: true, retryAfter: 0 })
  })
})

describe('rateLimitAll', () => {
  it('liefert das erste überschrittene Limit und stoppt', async () => {
    q.mockResolvedValueOnce([{ count: 99, resetAt: future(30) }])
    const r = await rateLimitAll([['a', 10, 60], ['b', 10, 60]])
    expect(r.ok).toBe(false)
    expect(q).toHaveBeenCalledTimes(1)
  })
  it('ok, wenn alle durchgehen', async () => {
    q.mockResolvedValue([{ count: 1, resetAt: future(30) }])
    expect((await rateLimitAll([['a', 10, 60], ['b', 10, 60]])).ok).toBe(true)
    expect(q).toHaveBeenCalledTimes(2)
  })
})

describe('Helfer', () => {
  it('clientIp nimmt den ersten x-forwarded-for-Eintrag', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
    expect(clientIp({ 'x-forwarded-for': '5.6.7.8' })).toBe('5.6.7.8')
    expect(clientIp(new Headers())).toBe('unknown')
  })
  it('tooManyRequests setzt 429 und Retry-After', async () => {
    const res = tooManyRequests(42)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('42')
  })
})
