import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import slugify from 'slugify'

/**
 * GET /api/cms/blog
 * Query params: status, category, limit (default 50)
 * Without auth: only PUBLISHED posts
 * With auth: all posts (optionally filtered by status)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const url = new URL(request.url)

    const status = url.searchParams.get('status')
    const category = url.searchParams.get('category')
    const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {}

    if (!session?.user?.id) {
      // Public: only published posts
      where.status = 'PUBLISHED'
    } else if (status) {
      // Authenticated with status filter
      where.status = status
    }

    if (category) {
      where.category = category
    }

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cms/blog
 * Auth required.
 * Body: { title, content, excerpt, coverImage, category, tags, status, seoTitle, seoDescription }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json()) as Record<string, unknown>
    const {
      title,
      content,
      excerpt,
      coverImage,
      category,
      tags,
      status,
      seoTitle,
      seoDescription,
    } = body as {
      title: string
      content: unknown
      excerpt?: string
      coverImage?: string
      category?: string
      tags?: string[]
      status?: string
      seoTitle?: string
      seoDescription?: string
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    // Generate slug from title
    let slug = slugify(title, { lower: true, strict: true, locale: 'de' })

    const existing = await prisma.blogPost.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    const publishedAt =
      status === 'PUBLISHED' ? new Date() : undefined

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content: content ?? {},
        excerpt: excerpt ?? null,
        coverImage: coverImage ?? null,
        category: (category as 'NEWS' | 'SAISON' | 'REZEPT' | 'TIPP') ?? 'NEWS',
        tags: tags ?? [],
        status: (status as 'DRAFT' | 'PUBLISHED') ?? 'DRAFT',
        seoTitle: seoTitle ?? null,
        seoDescription: seoDescription ?? null,
        publishedAt: publishedAt ?? null,
        userId: session.user.id,
      },
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating blog post:', error)
    return NextResponse.json(
      { error: 'Failed to create blog post' },
      { status: 500 }
    )
  }
}
