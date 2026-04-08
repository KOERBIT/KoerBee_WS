// src/app/api/auth/create-user.ts
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
    const { email, password, confirmPassword } = body as {
      email: unknown
      password: unknown
      confirmPassword: unknown
    }

    // Validation
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { ok: false, error: 'Alle Felder erforderlich' },
        { status: 400 }
      )
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Alle Felder erforderlich' },
        { status: 400 }
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { ok: false, error: 'Passwörter stimmen nicht überein' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Mindestens 8 Zeichen' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: 'E-Mail existiert bereits' },
        { status: 409 }
      )
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    return NextResponse.json({
      ok: true,
      user: newUser,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { ok: false, error: 'Fehler beim Erstellen des Benutzers' },
      { status: 500 }
    )
  }
}
