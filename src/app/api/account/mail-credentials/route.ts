import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const c = await prisma.mailCredential.findUnique({
    where: { userId: session.user.id },
    select: { imapHost: true, imapPort: true, imapUser: true, imapPassword: true, updatedAt: true },
  })
  return NextResponse.json({
    imapHost: c?.imapHost ?? 'imap.gmx.net',
    imapPort: c?.imapPort ?? 993,
    imapUser: c?.imapUser ?? '',
    hasPassword: !!c?.imapPassword,
    updatedAt: c?.updatedAt ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: { imapHost?: unknown; imapPort?: unknown; imapUser?: unknown; imapPassword?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const imapHost = (typeof body.imapHost === 'string' && body.imapHost.trim()) || 'imap.gmx.net'
  const imapPort = Number(body.imapPort) || 993
  const imapUser = typeof body.imapUser === 'string' ? body.imapUser.trim() : ''
  const imapPassword = typeof body.imapPassword === 'string' ? body.imapPassword.trim() : ''

  if (!imapUser) return NextResponse.json({ error: 'user_required' }, { status: 400 })

  const existing = await prisma.mailCredential.findUnique({ where: { userId } })
  if (!imapPassword && !existing?.imapPassword) {
    return NextResponse.json({ error: 'password_required' }, { status: 400 })
  }
  const encryptedPw = imapPassword ? encrypt(imapPassword) : existing!.imapPassword

  await prisma.mailCredential.upsert({
    where: { userId },
    create: { userId, imapHost, imapPort, imapUser, imapPassword: encryptedPw },
    update: { imapHost, imapPort, imapUser, imapPassword: encryptedPw },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.mailCredential.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
