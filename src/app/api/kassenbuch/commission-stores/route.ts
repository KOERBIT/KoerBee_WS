import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const stores = await prisma.commissionStore.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(stores)
  } catch (error) {
    console.error('Error fetching commission stores:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Läden' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Ladename erforderlich' },
        { status: 400 }
      )
    }

    const store = await prisma.commissionStore.create({
      data: {
        name: name.trim(),
        userId: session.user.id,
      },
    })

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error creating commission store:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Ladens' },
      { status: 500 }
    )
  }
}
