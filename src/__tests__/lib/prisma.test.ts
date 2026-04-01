/**
 * @jest-environment node
 */

// Mock @prisma/client so PrismaClient can be instantiated without a real DB
jest.mock('@prisma/client', () => {
  const mockFindMany = jest.fn()
  const MockPrismaClient = jest.fn().mockImplementation(() => ({
    user: { findMany: mockFindMany },
    apiary: { findMany: mockFindMany },
    colony: { findMany: mockFindMany },
  }))
  return { PrismaClient: MockPrismaClient }
})

import { prisma } from '@/lib/prisma'

describe('Prisma Client', () => {
  it('should export a PrismaClient instance', () => {
    expect(prisma).toBeDefined()
    expect(typeof prisma.user.findMany).toBe('function')
    expect(typeof prisma.apiary.findMany).toBe('function')
    expect(typeof prisma.colony.findMany).toBe('function')
  })
})
