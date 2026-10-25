import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requireAdminSession, hasOtherActiveAdmin, isRole } from '@/lib/user-admin'

type Ctx = { params: Promise<{ id: string }> }

const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status })

/** Rolle ändern, sperren/entsperren oder Passwort neu setzen. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const guard = await requireAdminSession()
  if ('error' in guard) return guard.error
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return fail('Ungültige Anfrage', 400)
  const { role, disabled, password } = body as { role?: unknown; disabled?: unknown; password?: unknown }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, disabled: true } })
  if (!target) return fail('Nutzer nicht gefunden', 404)

  const data: { role?: string; disabled?: boolean; passwordHash?: string } = {}

  if (role !== undefined) {
    if (!isRole(role)) return fail('Ungültige Rolle', 422)
    data.role = role
  }
  if (disabled !== undefined) {
    if (typeof disabled !== 'boolean') return fail('Ungültiger Status', 422)
    data.disabled = disabled
  }
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 8) return fail('Passwort: mindestens 8 Zeichen', 422)
    data.passwordHash = await bcrypt.hash(password, 10)
  }
  if (Object.keys(data).length === 0) return fail('Keine Änderung angegeben', 400)

  // Schutz vor Selbst-Aussperrung: eigene Rolle/Sperre nicht änderbar (Passwort über Einstellungen)
  const isSelf = id === guard.adminId
  if (isSelf && (data.role !== undefined || data.disabled !== undefined)) {
    return fail('Eigene Rolle oder Sperre kann nicht geändert werden', 409)
  }
  // Der letzte aktive Admin darf nicht degradiert oder gesperrt werden
  const loosesAdmin = target.role === 'admin' && !target.disabled && (data.role === 'user' || data.disabled === true)
  if (loosesAdmin && !(await hasOtherActiveAdmin(id))) {
    return fail('Es muss mindestens ein aktiver Administrator bleiben', 409)
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true, disabled: true, createdAt: true },
  })
  return NextResponse.json({ ok: true, user })
}

/** Nutzer samt allen seinen Daten löschen (Cascade). */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requireAdminSession()
  if ('error' in guard) return guard.error
  const { id } = await params

  if (id === guard.adminId) return fail('Das eigene Konto kann nicht gelöscht werden', 409)

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true, disabled: true } })
  if (!target) return fail('Nutzer nicht gefunden', 404)
  if (target.role === 'admin' && !target.disabled && !(await hasOtherActiveAdmin(id))) {
    return fail('Es muss mindestens ein aktiver Administrator bleiben', 409)
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
