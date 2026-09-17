import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cms/blog/[id]
 * Lookup by id OR slug.
 * Without auth: only PUBLISHED posts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      OR: [{ id }, { slug: id }],
    }

    if (!session?.user?.id) {
      where.status = 'PUBLISHED'
    }

    const post = await prisma.blogPost.findFirst({
      where,
      include: {
        user: {
          select: { name: true },
        },
      },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/cms/blog/[id]
 * Auth required.
 * Updates post fields. Sets publishedAt when transitioning DRAFT → PUBLISHED.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const existing = await prisma.blogPost.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

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
      title?: string
      content?: unknown
      excerpt?: string
      coverImage?: string
      category?: string
      tags?: string[]
      status?: string
      seoTitle?: string
      seoDescription?: string
    }

    // Set publishedAt when transitioning DRAFT → PUBLISHED
    let publishedAt: Date | undefined
    if (status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      publishedAt = new Date()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {}
    if (title !== undefined) data.title = title
    if (content !== undefined) data.content = content
    if (excerpt !== undefined) data.excerpt = excerpt
    if (coverImage !== undefined) data.coverImage = coverImage
    if (category !== undefined) data.category = category
    if (tags !== undefined) data.tags = tags
    if (status !== undefined) data.status = status
    if (seoTitle !== undefined) data.seoTitle = seoTitle
    if (seoDescription !== undefined) data.seoDescription = seoDescription
    if (publishedAt !== undefined) data.publishedAt = publishedAt

    const updated = await prisma.blogPost.update({
      where: { id: existing.id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating blog post:', error)
    return NextResponse.json(
      { error: 'Failed to update blog post' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cms/blog/[id]
 * Auth required.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const existing = await prisma.blogPost.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    await prisma.blogPost.delete({ where: { id: existing.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return NextResponse.json(
      { error: 'Failed to delete blog post' },
      { status: 500 }
    )
  }
}
