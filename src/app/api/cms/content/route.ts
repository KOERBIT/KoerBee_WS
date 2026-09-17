import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cms/content
 * Query param: locale (optional, default "de")
 * Returns all CmsContent entries for that locale as a Record<string, string> map
 * No auth needed (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const locale = url.searchParams.get('locale') ?? 'de'

    const contents = await prisma.cmsContent.findMany({
      where: { locale },
      select: {
        key: true,
        value: true,
      },
    })

    const map: Record<string, string> = {}
    for (const content of contents) {
      map[content.key] = content.value
    }

    return NextResponse.json(map)
  } catch (error) {
    console.error('Error fetching CMS content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CMS content' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/cms/content
 * Body: { key: string, value: string, locale?: string }
 * Auth: requires NextAuth session
 * Upserts on compound unique [key, locale]
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { key, value, locale = 'de' } = body as {
      key: unknown
      value: unknown
      locale?: unknown
    }

    // Validation
    if (typeof key !== 'string' || typeof value !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body: key and value must be strings' },
        { status: 400 }
      )
    }

    if (!key.trim()) {
      return NextResponse.json(
        { error: 'Key cannot be empty' },
        { status: 400 }
      )
    }

    if (typeof locale !== 'string') {
      return NextResponse.json(
        { error: 'Invalid locale' },
        { status: 400 }
      )
    }

    // Upsert CmsContent
    const cmsContent = await prisma.cmsContent.upsert({
      where: {
        key_locale: {
          key,
          locale,
        },
      },
      update: {
        value,
        userId: session.user.id,
      },
      create: {
        key,
        value,
        locale,
        userId: session.user.id,
      },
    })

    return NextResponse.json(cmsContent, { status: 200 })
  } catch (error) {
    console.error('Error updating CMS content:', error)
    return NextResponse.json(
      { error: 'Failed to update CMS content' },
      { status: 500 }
    )
  }
}
