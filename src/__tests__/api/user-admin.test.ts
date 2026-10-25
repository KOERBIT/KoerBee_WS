/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }))
import { getServerSession } from 'next-auth/next'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn(), create: jest.fn() },
  },
}))
import { prisma } from '@/lib/prisma'

jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() }))

const { PATCH, DELETE } = require('@/app/api/account/users/[id]/route')
const { POST: createUser } = require('@/app/api/account/create-user/route')
const { authOptions } = require('@/lib/auth')

const session = getServerSession as jest.Mock
const user = prisma.user as jest.Mocked<typeof prisma.user>

const ADMIN = { user: { id: 'admin-1', role: 'admin' } }
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const req = (body?: unknown) =>
  new NextRequest('http://localhost', {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })

beforeEach(() => {
  jest.clearAllMocks()
  session.mockResolvedValue(ADMIN)
})

describe('PATCH /api/account/users/[id]', () => {
  it('401 ohne Session, 403 für Nicht-Admin', async () => {
    session.mockResolvedValueOnce(null)
    expect((await PATCH(req({ role: 'user' }), ctx('u2'))).status).toBe(401)
    session.mockResolvedValueOnce({ user: { id: 'u1', role: 'user' } })
    expect((await PATCH(req({ role: 'admin' }), ctx('u2'))).status).toBe(403)
    expect(user.update).not.toHaveBeenCalled()
  })

  it('ändert die Rolle', async () => {
    user.findUnique.mockResolvedValue({ id: 'u2', role: 'user', disabled: false } as any)
    user.update.mockResolvedValue({ id: 'u2', role: 'admin' } as any)
    const res = await PATCH(req({ role: 'admin' }), ctx('u2'))
    expect(res.status).toBe(200)
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u2' }, data: { role: 'admin' } }))
  })

  it.each([['superuser'], [42], [null]])('lehnt ungültige Rolle %p ab', async (role) => {
    user.findUnique.mockResolvedValue({ id: 'u2', role: 'user', disabled: false } as any)
    expect((await PATCH(req({ role }), ctx('u2'))).status).toBe(422)
    expect(user.update).not.toHaveBeenCalled()
  })

  it('verweigert Änderung der eigenen Rolle/Sperre', async () => {
    user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'admin', disabled: false } as any)
    expect((await PATCH(req({ role: 'user' }), ctx('admin-1'))).status).toBe(409)
    expect((await PATCH(req({ disabled: true }), ctx('admin-1'))).status).toBe(409)
  })

  it('schützt den letzten aktiven Admin', async () => {
    user.findUnique.mockResolvedValue({ id: 'a2', role: 'admin', disabled: false } as any)
    user.count.mockResolvedValue(0)
    expect((await PATCH(req({ role: 'user' }), ctx('a2'))).status).toBe(409)
    expect((await PATCH(req({ disabled: true }), ctx('a2'))).status).toBe(409)
    expect(user.update).not.toHaveBeenCalled()
  })

  it('erlaubt Degradierung, wenn ein weiterer Admin existiert', async () => {
    user.findUnique.mockResolvedValue({ id: 'a2', role: 'admin', disabled: false } as any)
    user.count.mockResolvedValue(1)
    user.update.mockResolvedValue({ id: 'a2', role: 'user' } as any)
    expect((await PATCH(req({ role: 'user' }), ctx('a2'))).status).toBe(200)
  })

  it('sperrt und entsperrt', async () => {
    user.findUnique.mockResolvedValue({ id: 'u2', role: 'user', disabled: false } as any)
    user.update.mockResolvedValue({ id: 'u2', disabled: true } as any)
    expect((await PATCH(req({ disabled: true }), ctx('u2'))).status).toBe(200)
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { disabled: true } }))
  })

  it('setzt ein Passwort (gehasht), mindestens 8 Zeichen', async () => {
    user.findUnique.mockResolvedValue({ id: 'u2', role: 'user', disabled: false } as any)
    user.update.mockResolvedValue({ id: 'u2' } as any)
    expect((await PATCH(req({ password: 'kurz' }), ctx('u2'))).status).toBe(422)
    expect((await PATCH(req({ password: 'langesPasswort1' }), ctx('u2'))).status).toBe(200)
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { passwordHash: 'hashed' } }))
  })

  it('404 bei unbekanntem Nutzer, 400 ohne Änderung/Body', async () => {
    user.findUnique.mockResolvedValueOnce(null)
    expect((await PATCH(req({ role: 'user' }), ctx('x'))).status).toBe(404)
    user.findUnique.mockResolvedValue({ id: 'u2', role: 'user', disabled: false } as any)
    expect((await PATCH(req({}), ctx('u2'))).status).toBe(400)
    expect((await PATCH(req(), ctx('u2'))).status).toBe(400)
  })
})

describe('DELETE /api/account/users/[id]', () => {
  it('löscht einen Nutzer', async () => {
    user.findUnique.mockResolvedValue({ role: 'user', disabled: false } as any)
    expect((await DELETE(req(), ctx('u2'))).status).toBe(200)
    expect(user.delete).toHaveBeenCalledWith({ where: { id: 'u2' } })
  })

  it('verweigert Selbstlöschung und Löschen des letzten Admins', async () => {
    expect((await DELETE(req(), ctx('admin-1'))).status).toBe(409)
    user.findUnique.mockResolvedValue({ role: 'admin', disabled: false } as any)
    user.count.mockResolvedValue(0)
    expect((await DELETE(req(), ctx('a2'))).status).toBe(409)
    expect(user.delete).not.toHaveBeenCalled()
  })

  it('403 für Nicht-Admin', async () => {
    session.mockResolvedValueOnce({ user: { id: 'u1', role: 'user' } })
    expect((await DELETE(req(), ctx('u2'))).status).toBe(403)
  })
})

describe('create-user mit Rolle', () => {
  const body = (extra = {}) =>
    new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email: 'n@b.de', password: '12345678', confirmPassword: '12345678', ...extra }),
      headers: { 'Content-Type': 'application/json' },
    })

  it('Standard ist user, admin ist wählbar, Unsinn wird abgelehnt', async () => {
    user.findUnique.mockResolvedValue(null)
    user.create.mockResolvedValue({ id: 'n', email: 'n@b.de', name: null, role: 'user' } as any)
    expect((await createUser(body())).status).toBe(200)
    expect(user.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: 'user' }) }))
    expect((await createUser(body({ role: 'admin' }))).status).toBe(200)
    expect(user.create).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: 'admin' }) }))
    expect((await createUser(body({ role: 'root' }))).status).toBe(422)
  })
})

describe('auth: gesperrte Nutzer', () => {
  it('jwt-Callback beendet die Session für gesperrte/gelöschte Nutzer und lädt die Rolle frisch', async () => {
    const jwt = authOptions.callbacks!.jwt!
    user.findUnique.mockResolvedValueOnce({ role: 'admin', disabled: false } as any)
    const t = await jwt({ token: { id: 'u2', role: 'user' } } as any)
    expect(t.role).toBe('admin')
    user.findUnique.mockResolvedValueOnce({ role: 'user', disabled: true } as any)
    await expect(jwt({ token: { id: 'u2' } } as any)).rejects.toThrow('user_inactive')
    user.findUnique.mockResolvedValueOnce(null)
    await expect(jwt({ token: { id: 'u2' } } as any)).rejects.toThrow('user_inactive')
  })
})
