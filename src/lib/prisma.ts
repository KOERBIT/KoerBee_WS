import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// The prisma+postgres:// URL is the local Prisma dev proxy.
// Prisma v7 requires a driver adapter for direct connections.
// We extract the direct TCP URL from the API key embedded in DATABASE_URL.
function getDirectUrl(): string {
  const dbUrl = process.env.DATABASE_URL ?? ''
  if (dbUrl.startsWith('prisma+postgres://')) {
    try {
      const apiKey = dbUrl.split('api_key=')[1]
      const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString('utf8'))
      return decoded.databaseUrl
    } catch {
      // fall through
    }
  }
  return dbUrl
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: getDirectUrl() }) })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
