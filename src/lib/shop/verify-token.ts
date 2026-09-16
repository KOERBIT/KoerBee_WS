import { jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.SHOP_JWT_SECRET
  if (!secret) throw new Error('SHOP_JWT_SECRET env var is missing')
  return new TextEncoder().encode(secret)
}

export async function verifyShopToken(
  token: string
): Promise<{ sub: string } | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.sub !== 'string') return null
    if (payload.purpose) return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}
