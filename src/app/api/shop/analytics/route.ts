import { NextRequest, NextResponse } from 'next/server'
import { clientIp, rateLimitAll, tooManyRequests } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { path, referrer } = await req.json()
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const rl = await rateLimitAll([[`shop-analytics-ip:${clientIp(req.headers)}`, 200, 10 * 60]])
    if (!rl.ok) return tooManyRequests(rl.retryAfter)

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
