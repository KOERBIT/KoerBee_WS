import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { path, referrer } = await req.json()
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const userAgent = req.headers.get('user-agent') ?? undefined
    const country = req.headers.get('x-vercel-ip-country') ?? undefined

    await prisma.shopPageView.create({
      data: {
        path: path.slice(0, 500),
        referrer: referrer ? String(referrer).slice(0, 1000) : undefined,
        userAgent: userAgent?.slice(0, 500),
        country: country?.slice(0, 10),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
