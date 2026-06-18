process.env.NEXTAUTH_SECRET = 'test-secret-für-crypto'

import { encrypt, decrypt } from '@/lib/crypto'

describe('crypto (AES-256-GCM)', () => {
  it('verschlüsselt und entschlüsselt verlustfrei', () => {
    const secret = 'PayPal-Client-Secret-123!'
    expect(decrypt(encrypt(secret))).toBe(secret)
  })

  it('erzeugt bei jedem Aufruf anderen Ciphertext (zufälliger IV)', () => {
    expect(encrypt('gleich')).not.toBe(encrypt('gleich'))
  })

  it('wirft bei manipuliertem/ungültigem Payload', () => {
    expect(() => decrypt('kaputt')).toThrow()
    const enc = encrypt('x')
    const parts = enc.split('.')
    parts[2] = Buffer.from('manipuliert').toString('base64')
    expect(() => decrypt(parts.join('.'))).toThrow()
  })
})
