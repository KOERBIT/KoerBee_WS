import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return NextResponse.json(
      { ok: false, error: 'Nicht autorisiert' },
      { status: 401 }
    )
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword: unknown
      newPassword: unknown
      confirmPassword: unknown
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: 'Alle Felder erforderlich' },
        { status: 400 }
      )
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: 'Passwörter stimmen nicht überein' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Mindestens 8 Zeichen' },
        { status: 400 }
      )
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { ok: false, error: 'Aktuelles Passwort falsch' },
        { status: 401 }
      )
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json(
        { ok: false, error: 'Aktuelles Passwort falsch' },
        { status: 401 }
      )
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hashedPassword },
    })

    return NextResponse.json({
      ok: true,
      message: 'Passwort geändert',
    })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json(
      { ok: false, error: 'Fehler beim Ändern des Passworts' },
      { status: 500 }
    )
  }
}
