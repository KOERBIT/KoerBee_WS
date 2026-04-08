import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const { id } = await params

    const store = await prisma.commissionStore.findUnique({
      where: { id },
    })

    if (!store) {
      return NextResponse.json(
        { error: 'Laden nicht gefunden' },
        { status: 404 }
      )
    }

    if (store.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      )
    }

    await prisma.commissionStore.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting commission store:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Ladens' },
      { status: 500 }
    )
  }
}
