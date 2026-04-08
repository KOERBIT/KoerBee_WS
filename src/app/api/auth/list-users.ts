// src/app/api/auth/list-users.ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return NextResponse.json(
      { success: false, error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Fehler beim Laden der Nutzer' },
      { status: 500 }
    )
  }
}
