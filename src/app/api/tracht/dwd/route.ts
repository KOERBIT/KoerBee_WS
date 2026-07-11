import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getDwdPhenology } from '@/lib/tracht/dwd'
import { isValidLat, isValidLng } from '@/lib/geo'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Amtliche DWD-Blühbeginne der nächsten Station (aktuelles Jahr).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  if (!isValidLat(lat) || !isValidLng(lng)) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const year = new Date().getUTCFullYear()
  const data = await getDwdPhenology(lat, lng, year)
  return NextResponse.json({ year, phenology: data })
}
