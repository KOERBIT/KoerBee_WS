import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@bee.local' },
      select: { id: true, email: true, passwordHash: true },
    })
    return NextResponse.json({
      ok: true,
      found: !!user,
      hasHash: !!user?.passwordHash,
      hashPrefix: user?.passwordHash?.substring(0, 7) ?? null,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
