import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const daysParam = req.nextUrl.searchParams.get('days') ?? '30'
  const days = Math.min(Math.max(parseInt(daysParam) || 30, 1), 365)
  const since = new Date()
  since.setDate(since.getDate() - days)

  const views = await prisma.shopPageView.findMany({
    where: { createdAt: { gte: since } },
    select: { path: true, referrer: true, country: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  // Aggregate by day
  const byDay: Record<string, number> = {}
  const byPage: Record<string, number> = {}
  const byCountry: Record<string, number> = {}
  const byReferrer: Record<string, number> = {}

  for (const v of views) {
    const day = v.createdAt.toISOString().slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
    byPage[v.path] = (byPage[v.path] ?? 0) + 1
    if (v.country) byCountry[v.country] = (byCountry[v.country] ?? 0) + 1
    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname
        byReferrer[host] = (byReferrer[host] ?? 0) + 1
      } catch {
        byReferrer[v.referrer] = (byReferrer[v.referrer] ?? 0) + 1
      }
    }
  }

  // Sort by count descending
  const sortDesc = (obj: Record<string, number>) =>
    Object.entries(obj).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }))

  // Fill missing days
  const dailyViews: Array<{ date: string; count: number }> = []
  const cursor = new Date(since)
  const today = new Date()
  while (cursor <= today) {
    const d = cursor.toISOString().slice(0, 10)
    dailyViews.push({ date: d, count: byDay[d] ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  return NextResponse.json({
    total: views.length,
    dailyViews,
    topPages: sortDesc(byPage).slice(0, 20),
    topCountries: sortDesc(byCountry).slice(0, 20),
    topReferrers: sortDesc(byReferrer).slice(0, 20),
  })
}
