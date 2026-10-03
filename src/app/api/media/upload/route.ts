import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { authOptions } from '@/lib/auth'

// Client-Upload: Der Browser lädt direkt zu Vercel Blob hoch, diese Route stellt
// nur das Token aus. Umgeht das 4,5-MB-Body-Limit von Serverless-Funktionen (Videos).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as HandleUploadBody

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/*', 'video/mp4', 'video/webm', 'video/quicktime'],
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    })
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
