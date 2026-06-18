import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// TLS-Strategie:
// - DATABASE_SSL_CA gesetzt (PEM des Supabase-CA) → volle Zertifikatsprüfung mit dieser CA (empfohlen).
// - sonst DATABASE_SSL_STRICT="true" → Prüfung gegen die System-CAs.
// - sonst Fallback (verschlüsselt, aber ohne Zertifikatsprüfung) – verhindert
//   Verbindungsabbruch, falls (noch) keine CA hinterlegt ist.
function sslConfig() {
  const ca = process.env.DATABASE_SSL_CA
  if (ca) return { ca, rejectUnauthorized: true }
  if (process.env.DATABASE_SSL_STRICT === 'true') return { rejectUnauthorized: true }
  return { rejectUnauthorized: false }
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig(),
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
