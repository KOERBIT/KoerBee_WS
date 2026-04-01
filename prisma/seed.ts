import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

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

const connectionString = getDirectUrl()
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await bcrypt.hash('imker123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@bee.local' },
    update: {},
    create: {
      email: 'admin@bee.local',
      passwordHash,
      name: 'Admin',
      plan: 'hobby',
    },
  })

  console.log('Seed-User erstellt:', user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
