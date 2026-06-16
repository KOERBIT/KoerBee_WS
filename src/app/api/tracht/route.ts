import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchWeather } from '@/lib/tracht/weather'
import { buildLocationForecast } from '@/lib/tracht/forecast'
import { getCurrentBloom } from '@/lib/tracht/bloom'
import { verifyBlooms } from '@/lib/tracht/inaturalist'
import { ForecastResult, LocationForecast } from '@/lib/tracht/types'

// Regionaler Regen-Bonus (Hessen ist niederschlagsreich; Linde profitiert).
const REGION_RAIN_BONUS = 0.1

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const [apiaries, reports] = await Promise.all([
    prisma.apiary.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.bloomReport.findMany({
      where: { userId: session.user.id, date: { gte: new Date(now.getTime() - 30 * 86400000) } },
      orderBy: { date: 'desc' },
    }),
  ])

  const withCoords = apiaries.filter(a => a.lat != null && a.lng != null)
  const currentBloomPlants = getCurrentBloom(now).map(c => c.plant)

  const locations: LocationForecast[] = []
  await Promise.all(withCoords.map(async (a) => {
    const lat = a.lat as number
    const lng = a.lng as number
    const weather = await fetchWeather(lat, lng)
    if (!weather) {
      locations.push(emptyLocation(a, lat, lng))
      return
    }
    const verified = await verifyBlooms(lat, lng, currentBloomPlants, a.flightRadius ?? 10)
    const locReports = reports
      .filter(r => !r.apiaryId || r.apiaryId === a.id)
      .map(r => ({ plantId: r.plantId, phase: r.phase, date: r.date.toISOString() }))

    locations.push(buildLocationForecast(
      { id: a.id, name: a.name, lat, lng, flightRadius: a.flightRadius ?? null },
      weather,
      { now, verifiedPlantIds: verified, bloomReports: locReports, regionRainBonus: REGION_RAIN_BONUS },
    ))
  }))

  // Reihenfolge der Apiaries beibehalten
  const order = new Map(withCoords.map((a, i) => [a.id, i]))
  locations.sort((x, y) => (order.get(x.locationId) ?? 0) - (order.get(y.locationId) ?? 0))

  const end = new Date(now.getTime() + 6 * 86400000)
  const result: ForecastResult = {
    generatedAt: now.toISOString(),
    forecastPeriod: { start: now.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
    locations,
    globalRecommendations: {
      weatherAlert: locations.find(l => l.warning)?.warning ?? null,
    },
  }
  return NextResponse.json(result)
}

function emptyLocation(a: { id: string; name: string; flightRadius: number | null }, lat: number, lng: number): LocationForecast {
  return {
    locationId: a.id,
    name: a.name,
    region: 'Hessen',
    coordinates: { lat, lon: lng },
    flightRadius: a.flightRadius ?? null,
    elevation: null,
    currentStatus: null,
    currentBloom: [],
    nextBloom: [],
    seasonalSummary: { currentSeason: '—', nextSeason: '—' },
    recommendations: { general: 'Keine Wetterdaten verfügbar.', shortTerm: '—', actionItems: [] },
    dataQuality: {
      weatherDataSource: 'nicht verfügbar', bloomReportsUsed: 0, inaturalistVerified: 0,
      confidence: 0, confidenceExplanation: 'Keine Wetterdaten – Prognose nicht möglich.',
    },
    warning: 'Wetterdaten aktuell nicht abrufbar.',
  }
}
