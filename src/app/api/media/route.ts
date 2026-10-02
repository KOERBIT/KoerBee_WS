import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { put, list, del } from '@vercel/blob'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { blobs } = await list()
  const media = blobs.map(b => ({
    url: b.url,
    pathname: b.pathname,
    size: b.size,
    uploadedAt: b.uploadedAt,
  }))
  return NextResponse.json(media)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Keine Datei' }, { status: 400 })

  // Max 50MB for videos, 10MB for other files
  const isVideo = /\.(mp4|webm|mov|avi)$/i.test(file.name)
  const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: `Datei zu groß (max ${isVideo ? '50' : '10'}MB)` }, { status: 400 })
  }

  const folder = (formData.get('folder') as string) || 'media'
  const pathname = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const blob = await put(pathname, file, { access: 'public' })

  return NextResponse.json({ url: blob.url, pathname: blob.pathname }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL fehlt' }, { status: 400 })

  await del(url)
  return NextResponse.json({ ok: true })
}
