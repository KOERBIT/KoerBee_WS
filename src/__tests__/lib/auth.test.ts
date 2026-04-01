/**
 * @jest-environment node
 */

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}))

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import type { CredentialsConfig } from 'next-auth/providers/credentials'

const credentialsProvider = authOptions.providers[0] as CredentialsConfig
const authorize = (credentialsProvider as any).options?.authorize ?? credentialsProvider.authorize!

describe('authOptions.authorize', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null if no credentials provided', async () => {
    const result = await authorize(null as any, {} as any)
    expect(result).toBeNull()
  })

  it('returns null if credentials are incomplete', async () => {
    const result = await authorize(
      { email: 'test@example.com', password: '' },
      {} as any
    )
    expect(result).toBeNull()
  })

  it('returns null if user not found', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    const result = await authorize(
      { email: 'notfound@example.com', password: 'secret' },
      {} as any
    )
    expect(result).toBeNull()
  })

  it('returns null if password does not match', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      passwordHash: '$2a$12$hashedpassword',
      name: 'Test',
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    const result = await authorize(
      { email: 'test@example.com', password: 'wrongpassword' },
      {} as any
    )
    expect(result).toBeNull()
  })

  it('returns user object if credentials are valid', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '42',
      email: 'test@example.com',
      passwordHash: '$2a$12$hashedpassword',
      name: 'Max Mustermann',
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    const result = await authorize(
      { email: 'test@example.com', password: 'correctpassword' },
      {} as any
    )
    expect(result).toEqual({
      id: '42',
      email: 'test@example.com',
      name: 'Max Mustermann',
    })
  })
})
