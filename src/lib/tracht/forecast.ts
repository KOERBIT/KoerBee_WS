import { nektarIndex, rating, reasonFor } from './nektar'
import { getNextBloom, seasonLabel, isBlooming, bloomWindow } from './bloom'
import { PLANTS, PLANTS_BY_ID } from './plants'
import { wmoLabel, weekday } from './wmo'
import { heatBloomEnd, DailyMax } from './heat'
import {
  CurrentBloomPlant, DayForecast, LocationForecast, Plant, WeatherDay,
} from './types'
import { WeatherResult } from './weather'

const DAY = 86400000

export interface BloomReportInput {
  plantId: string
  phase?: string | null
  date: string
}

export interface LocationInput {
  id: string
  name: string
  lat: number
  lng: number
  flightRadius: number | null
  region?: string
}

export interface BuildOptions {
  now?: Date
  /** Pflanzen-IDs, die per iNaturalist in der Nähe verifiziert wurden */
  verifiedPlantIds?: Set<string>
  /** Imkermeldungen für diesen Standort/Region */
  bloomReports?: BloomReportInput[]
  /** Regionaler Regen-Bonus (Hessen ~0.1) */
  regionRainBonus?: number
  /** Phänologische Verschiebung der Blühzeiten in Tagen (aus GTS abgeleitet) */
  bloomShiftDays?: number
  /** Grünlandtemperatursumme °C */
  gts?: number | null
  /** Datum des Vegetationsbeginns (GTS ≥ 200) */
  vegetationStart?: string | null
  /** Kumulierter GTS-Verlauf (für die Grafik) */
  gtsSeries?: { date: string; gts: number }[]
  /** Vom Imker gemeldeter Trachtbeginn/-ende (überschreibt das Modell), aktuelles Jahr */
  bloomRecords?: BloomRecordInput[]
  /** Tageshöchstwerte des Jahres (für hitzegetriebenes Trachtende) */
  dailyMax?: DailyMax[]
  /** Amtliche DWD-Blühbeginne (fließen automatisch als Start ein) */
  dwdStarts?: { plantId: string; bloomStart: string }[]
}

export interface BloomRecordInput {
  plantId: string
  startDate: string | null
  endDate: string | null
}

function buildDayForecast(day: WeatherDay, plant: Plant, regionRainBonus: number): DayForecast {
  const idx = nektarIndex(day, plant, { regionRainBonus })
  return {
    date: day.date,
    dayOfWeek: weekday(day.date),
    temperature: Math.round(day.tempMean),
    humidity: Math.round(day.humidity),
    clouds: Math.round(day.clouds),
    precipitation: Math.round(day.precipitation * 10) / 10,
    wind: Math.round(day.wind),
    weather: wmoLabel(day.weathercode),
    nectarIndex: idx,
    rating: rating(idx),
    reason: reasonFor(day, plant),
  }
}

function pickBestDays(days: DayForecast[]): { dates: string[]; explanation: string } {
  const good = days.filter(d => d.nectarIndex >= 75).map(d => d.date)
  if (good.length >= 3) {
    return { dates: good.slice(0, 5), explanation: 'Tage mit sehr guten bis hervorragenden Trachtbedingungen.' }
  }
  const top = [...days].sort((a, b) => b.nectarIndex - a.nectarIndex).slice(0, 3)
    .sort((a, b) => a.date.localeCompare(b.date)).map(d => d.date)
  return { dates: top, explanation: 'Die relativ besten Tage im Prognosezeitraum (keine herausragenden Bedingungen).' }
}

function plantWarning(plant: Plant, days: WeatherDay[], daysLeft: number): string | null {
  if (daysLeft <= 3) return `Blüte endet in ca. ${daysLeft} Tag(en) – jetzt nutzen.`
  if (days.some(d => d.tempMax >= 32)) return 'Hitze erwartet – Wasserversorgung der Völker sichern.'
  if (plant.rainBeneficial === false && days.slice(0, 3).every(d => d.precipitation > 4)) {
    return 'Anhaltender Regen – schwacher Nektareintrag in den nächsten Tagen.'
  }
  return null
}

export function buildLocationForecast(
  loc: LocationInput,
  weather: WeatherResult,
  opts: BuildOptions = {},
): LocationForecast {
  const now = opts.now ?? new Date()
  const verified = opts.verifiedPlantIds ?? new Set<string>()
  const reports = opts.bloomReports ?? []
  const regionRainBonus = opts.regionRainBonus ?? 0
  const region = loc.region ?? 'Hessen'
  const shiftDays = opts.bloomShiftDays ?? 0

  const days = weather.days
  const today = days[0]

  const nowIso = now.toISOString().slice(0, 10)
  const dailyMax = opts.dailyMax ?? []
  const reportPlantIds = new Set(reports.map(r => r.plantId))

  // Signalquellen für Beginn/Ende – Priorität: eigene Meldung > DWD > Modell
  const recMap = new Map<string, { start: string | null; end: string | null }>()
  for (const r of opts.bloomRecords ?? []) {
    recMap.set(r.plantId, { start: r.startDate ? r.startDate.slice(0, 10) : null, end: r.endDate ? r.endDate.slice(0, 10) : null })
  }
  const dwdMap = new Map<string, string>()
  for (const d of opts.dwdStarts ?? []) dwdMap.set(d.plantId, d.bloomStart.slice(0, 10))

  // Kandidaten: alles, was Modell/Meldung/DWD/Report als relevant sieht
  const candidateIds = new Set<string>()
  for (const p of PLANTS) if (isBlooming(p, now, shiftDays)) candidateIds.add(p.id)
  for (const id of recMap.keys()) candidateIds.add(id)
  for (const id of dwdMap.keys()) candidateIds.add(id)
  for (const r of reports) candidateIds.add(r.plantId)

  function phaseLabel(plantId: string, startIso: string, endIso: string): string {
    const s = new Date(startIso + 'T12:00:00Z').getTime()
    const e = new Date(endIso + 'T12:00:00Z').getTime()
    const ratio = e > s ? (now.getTime() - s) / (e - s) : 0
    const ht = plantId === 'honigtau'
    if (ratio < 0.34) return ht ? 'Einsetzend' : 'Blühbeginn'
    if (ratio < 0.67) return ht ? 'Ergiebig' : 'Hochblüte'
    return ht ? 'Nachlassend' : 'Abblühend'
  }

  const currentBloom: CurrentBloomPlant[] = []
  const currentIds = new Set<string>()
  for (const id of candidateIds) {
    const plant = PLANTS_BY_ID[id]
    if (!plant) continue
    const win = bloomWindow(plant, now, shiftDays)
    const modelEnd = win.end.toISOString().slice(0, 10)
    const rec = recMap.get(id)
    const dwdStart = dwdMap.get(id) ?? null

    // Effektiver Beginn (Meldung > DWD > Modell) und Ende (Meldung > Hitze > Modell)
    const startDate = rec?.start ?? dwdStart ?? win.start.toISOString().slice(0, 10)
    const heatEnd = rec?.end ? null : heatBloomEnd(id, startDate, modelEnd, dailyMax, nowIso)
    const endDate = rec?.end ?? heatEnd ?? modelEnd

    if (!(startDate <= nowIso && nowIso <= endDate)) continue // aktuell nicht blühend

    const daysLeft = Math.max(0, Math.ceil((new Date(endDate + 'T12:00:00Z').getTime() - now.getTime()) / DAY))
    const viaRecord = !!(rec && (rec.start || rec.end))
    const viaDwd = !viaRecord && !!dwdStart && startDate === dwdStart
    const phase = phaseLabel(id, startDate, endDate)
    const forecast7days = days.map(d => buildDayForecast(d, plant, regionRainBonus))
    const todayFc = forecast7days[0]
    const best = pickBestDays(forecast7days)
    const isVerified = verified.has(id) || reportPlantIds.has(id)
    const heatWarning = heatEnd
      ? `Hitze verkürzt die Tracht – Ende voraussichtlich um den ${endDate.slice(8, 10)}.${endDate.slice(5, 7)}.`
      : null
    currentBloom.push({
      plantId: id,
      plantName: plant.name,
      bloomPhase: phase,
      bloomStartDate: startDate,
      estimatedEndDate: endDate,
      bloomDaysLeft: daysLeft,
      nectarAmountExpected: plant.nectar,
      pollenAmountExpected: plant.pollen,
      nectarIndexToday: todayFc.nectarIndex,
      nectarRatingToday: todayFc.rating,
      explanation: `${phase}: ${todayFc.reason}.`,
      recommendation: todayFc.nectarIndex >= 75
        ? 'Top-Bedingungen – auf ausreichend Wabenfläche/Honigraum achten.'
        : todayFc.nectarIndex >= 50
          ? 'Solide Bedingungen – Völker beobachten.'
          : 'Schwache Tracht – ggf. Futterkontrolle, bessere Tage abwarten.',
      forecast7days,
      bestDaysAhead: best.dates,
      bestDaysExplanation: best.explanation,
      verified: isVerified,
      viaRecord,
      viaDwd,
      warning: heatWarning ?? plantWarning(plant, days, daysLeft),
    })
    currentIds.add(id)
  }
  currentBloom.sort((a, b) => a.bloomDaysLeft - b.bloomDaysLeft)

  const nextBloom = getNextBloom(now, 90, shiftDays)
    .filter(n => !currentIds.has(n.plant.id))
    .map(n => ({
    plantId: n.plant.id,
    plantName: n.plant.name,
    estimatedStartDate: n.startDate,
    daysUntilStart: n.daysUntilStart,
    estimatedEndDate: n.endDate,
    expectedNectarLevel: n.plant.nectar,
    description: n.plant.description,
  }))

  // Empfehlungen
  const topPlant = [...currentBloom].sort((a, b) => b.nectarIndexToday - a.nectarIndexToday)[0]
  const bestUpcoming = topPlant?.bestDaysAhead ?? []
  const heat = days.some(d => d.tempMax >= 32)
  const actionItems: string[] = []
  if (topPlant && topPlant.nectarIndexToday >= 75) actionItems.push('Honigräume/Zargen kontrollieren – genug Platz für Eintrag?')
  if (heat) actionItems.push('Wasserversorgung sicherstellen (Hitze)')
  if (currentBloom.some(c => c.bloomDaysLeft <= 5)) actionItems.push('Endende Trachten nutzen, Ernte planen')
  actionItems.push('Völker auf Schwarmstimmung / Varroa prüfen')

  const weatherAlert = heat ? 'Hitzephase erwartet – auf Wasser & Durchlüftung achten.' : null

  // Konfidenz
  let confidence = 0.7
  if (weather.source === 'Open-Meteo') confidence += 0.1
  if (reports.length > 0) confidence += Math.min(0.1, reports.length * 0.03)
  if (verified.size > 0) confidence += Math.min(0.1, verified.size * 0.03)
  confidence = Math.min(0.97, Math.round(confidence * 100) / 100)

  return {
    locationId: loc.id,
    name: loc.name,
    region,
    coordinates: { lat: loc.lat, lon: loc.lng },
    flightRadius: loc.flightRadius,
    elevation: weather.elevation,
    // Live-Messung „jetzt" bevorzugen; Tagesmittel nur als Rückfall
    currentStatus: weather.current ? {
      date: today?.date ?? now.toISOString().slice(0, 10),
      temperature: Math.round(weather.current.temperature),
      humidity: Math.round(weather.current.humidity),
      weather: wmoLabel(weather.current.weathercode),
      wind: Math.round(weather.current.wind),
      clouds: Math.round(weather.current.clouds),
      precipitation: Math.round(weather.current.precipitation * 10) / 10,
    } : today ? {
      date: today.date,
      temperature: Math.round(today.tempMean),
      humidity: Math.round(today.humidity),
      weather: wmoLabel(today.weathercode),
      wind: Math.round(today.wind),
      clouds: Math.round(today.clouds),
      precipitation: Math.round(today.precipitation * 10) / 10,
    } : null,
    currentBloom,
    nextBloom,
    seasonalSummary: {
      currentSeason: seasonLabel(now),
      nextSeason: nextBloom[0] ? `${nextBloom[0].plantName} (in ${nextBloom[0].daysUntilStart} Tagen)` : '—',
    },
    phenology: {
      gts: opts.gts ?? null,
      vegetationStart: opts.vegetationStart ?? null,
      bloomShiftDays: shiftDays,
      gtsSeries: opts.gtsSeries ?? [],
    },
    recommendations: {
      general: topPlant
        ? `Aktuelle Haupttracht: ${topPlant.plantName} (${topPlant.bloomPhase}, noch ca. ${topPlant.bloomDaysLeft} Tage).`
        : 'Aktuell keine nennenswerte Tracht – Völker- und Futterkontrolle.',
      shortTerm: bestUpcoming.length
        ? `Beste Tage: ${bestUpcoming.map(d => d.slice(8, 10) + '.' + d.slice(5, 7) + '.').join(', ')} – starke Einträge möglich.`
        : 'In den nächsten 7 Tagen keine herausragenden Trachttage.',
      actionItems,
    },
    dataQuality: {
      weatherDataSource: weather.source,
      bloomReportsUsed: reports.length,
      inaturalistVerified: verified.size,
      confidence,
      confidenceExplanation: `${Math.round(confidence * 100)}% – basiert auf ${weather.source}` +
        `${reports.length ? `, ${reports.length} Imkermeldung(en)` : ''}` +
        `${verified.size ? `, ${verified.size} via iNaturalist verifiziert` : ''}.`,
    },
    warning: weatherAlert,
  }
}

// Re-Export für Tests/Konsumenten
export { isBlooming }
