import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const ROLES = ['admin', 'user'] as const
export type Role = (typeof ROLES)[number]
export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as readonly string[]).includes(v)

/** Liefert die Admin-Session oder eine fertige 401/403-Antwort. */
export async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { error: NextResponse.json({ ok: false, error: 'Nicht autorisiert' }, { status: 401 }) }
  }
  if (session.user.role !== 'admin') {
    return { error: NextResponse.json({ ok: false, error: 'Nur Administratoren erlaubt' }, { status: 403 }) }
  }
  return { session, adminId: session.user.id }
}

/** Gibt es neben `exceptId` noch mindestens einen aktiven Admin? */
export async function hasOtherActiveAdmin(exceptId: string): Promise<boolean> {
  const n = await prisma.user.count({ where: { role: 'admin', disabled: false, id: { not: exceptId } } })
  return n > 0
}
