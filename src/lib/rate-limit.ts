import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export type RateLimitResult = { ok: boolean; retryAfter: number }

/** Client-IP hinter dem Vercel-Proxy (erster Eintrag von x-forwarded-for). */
export function clientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (name: string) => {
    if (headers instanceof Headers) return headers.get(name) ?? undefined
    const v = headers[name]
    return Array.isArray(v) ? v[0] : v
  }
  const xff = get('x-forwarded-for')
  return xff?.split(',')[0]?.trim() || get('x-real-ip') || 'unknown'
}

/**
 * Festes Zeitfenster: erlaubt `limit` Aufrufe je `windowSec` pro Schlüssel.
 * Atomar in einer SQL-Anweisung (upsert), daher auch bei parallelen Anfragen korrekt.
 * Fällt der Zähler aus (DB-Fehler), wird NICHT blockiert, damit Login nicht an ihm hängt.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const now = new Date()
  const nowIso = now.toISOString()
  const resetIso = new Date(now.getTime() + windowSec * 1000).toISOString()
  try {
    const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetIso}::timestamp)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= ${nowIso}::timestamp THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${nowIso}::timestamp THEN ${resetIso}::timestamp ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`
    const row = rows[0]
    const count = Number(row.count)
    // abgelaufene Einträge gelegentlich aufräumen
    if (Math.random() < 0.01) {
      prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => {})
    }
    if (count <= limit) return { ok: true, retryAfter: 0 }
    // resetAt liegt als UTC-Zeitstempel ohne Zone in der DB; Prisma liefert es als UTC-Date
    const retryAfter = Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000))
    return { ok: false, retryAfter }
  } catch (err) {
    console.error('rateLimit error (fail-open):', err)
    return { ok: true, retryAfter: 0 }
  }
}

export function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: 'too_many_requests', retryAfter },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}

/** Mehrere Limits nacheinander prüfen; liefert das erste überschrittene (oder ok). */
export async function rateLimitAll(
  checks: ReadonlyArray<readonly [key: string, limit: number, windowSec: number]>
): Promise<RateLimitResult> {
  for (const [key, limit, windowSec] of checks) {
    const r = await rateLimit(key, limit, windowSec)
    if (!r.ok) return r
  }
  return { ok: true, retryAfter: 0 }
}
