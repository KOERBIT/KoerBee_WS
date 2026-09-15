/**
 * @jest-environment node
 */
import { signShopToken, verifyShopToken } from '@/lib/shop/auth'

// jose needs SHOP_JWT_SECRET env var
beforeAll(() => {
  process.env.SHOP_JWT_SECRET = 'test-secret-that-is-at-least-32-chars-long!!'
})

describe('Shop JWT', () => {
  it('signs and verifies a valid token', async () => {
    const token = await signShopToken('cust_123')
    const payload = await verifyShopToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('cust_123')
  })

  it('returns null for an invalid token', async () => {
    const payload = await verifyShopToken('garbage.token.here')
    expect(payload).toBeNull()
  })

  it('returns null for an empty string', async () => {
    const payload = await verifyShopToken('')
    expect(payload).toBeNull()
  })
})
