import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { DEFAULT_ANTHROPIC_MODEL } from '@/lib/anthropic/config'

const ALLOWED_MODELS = ['claude-haiku-4-5', 'claude-sonnet-4-6']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const c = await prisma.anthropicCredential.findUnique({
    where: { userId: session.user.id },
    select: { apiKey: true, model: true, updatedAt: true },
  })
  const envFallback = !!process.env.ANTHROPIC_API_KEY
  return NextResponse.json({
    hasKey: !!c?.apiKey,
    model: c?.model ?? DEFAULT_ANTHROPIC_MODEL,
    source: c?.apiKey ? 'db' : envFallback ? 'env' : 'none',
    updatedAt: c?.updatedAt ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  let body: { apiKey?: unknown; model?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const model = typeof body.model === 'string' && ALLOWED_MODELS.includes(body.model) ? body.model : DEFAULT_ANTHROPIC_MODEL

  const existing = await prisma.anthropicCredential.findUnique({ where: { userId } })
  if (!apiKey && !existing?.apiKey) {
    return NextResponse.json({ error: 'api_key_required' }, { status: 400 })
  }
  const encryptedKey = apiKey ? encrypt(apiKey) : existing!.apiKey

  await prisma.anthropicCredential.upsert({
    where: { userId },
    create: { userId, apiKey: encryptedKey, model },
    update: { apiKey: encryptedKey, model },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.anthropicCredential.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
