import crypto from 'crypto'

// Symmetrische Verschlüsselung für sensible Werte (z.B. PayPal Client Secret).
// Schlüssel wird aus NEXTAUTH_SECRET abgeleitet (kein zusätzliches Env nötig).
// Format: base64(iv).base64(authTag).base64(ciphertext)

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET fehlt – Verschlüsselung nicht möglich')
  return crypto.createHash('sha256').update(secret).digest() // 32 Byte
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Ungültiges verschlüsseltes Format')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8')
}
