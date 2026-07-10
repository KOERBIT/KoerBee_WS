import { nektarIndex, rating, reasonFor } from './nektar'
import { getCurrentBloom, getNextBloom, seasonLabel, isBlooming, bloomWindow } from './bloom'
import { PLANTS_BY_ID } from './plants'
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

  // Aktuelle Blüten aus Kalender (standortverschoben) + Imkermeldungen
  const currentInfos = getCurrentBloom(now, shiftDays)
  const currentIds = new Set(currentInfos.map(c => c.plant.id))
  const reportPlantIds = new Set(reports.map(r => r.plantId))
  // Gemeldete, aber kalendarisch (noch) nicht erfasste Blüten ergänzen
  for (const r of reports) {
    if (!currentIds.has(r.plantId) && PLANTS_BY_ID[r.plantId]) {
      const p = PLANTS_BY_ID[r.plantId]
      const w = bloomWindow(p, now, shiftDays)
      currentInfos.push({
        plant: p,
        phase: r.phase || 'Gemeldet',
        startDate: w.start.toISOString().slice(0, 10),
        endDate: w.end.toISOString().slice(0, 10),
        daysLeft: Math.max(0, Math.ceil((w.end.getTime() - now.getTime()) / DAY)),
      })
      currentIds.add(r.plantId)
    }
  }

  // Imker-Meldungen (Beginn/Ende) überschreiben den Modellkalender
  const recMap = new Map<string, { start: Date | null; end: Date | null }>()
  for (const r of opts.bloomRecords ?? []) {
    recMap.set(r.plantId, {
      start: r.startDate ? new Date(r.startDate) : null,
      end: r.endDate ? new Date(r.endDate) : null,
    })
  }
  const isEndedByRecord = (id: string) => {
    const rec = recMap.get(id)
    return !!(rec?.end && rec.end.getTime() < now.getTime())
  }
  const isStartedByRecord = (id: string) => {
    const rec = recMap.get(id)
    return !!(rec?.start && rec.start.getTime() <= now.getTime() && (!rec.end || rec.end.getTime() >= now.getTime()))
  }
  // Gemeldeter Beginn, im Kalender aber (noch) nicht blühend → ergänzen
  for (const pid of recMap.keys()) {
    if (isStartedByRecord(pid) && !currentIds.has(pid) && PLANTS_BY_ID[pid]) {
      const p = PLANTS_BY_ID[pid]
      const rec = recMap.get(pid)!
      const end = rec.end ?? bloomWindow(p, now, shiftDays).end
      currentInfos.push({
        plant: p,
        phase: 'Gemeldet',
        startDate: rec.start!.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        daysLeft: Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY)),
      })
      currentIds.add(pid)
    }
  }
  // Hitzegetriebenes Trachtende (nur wenn keine eigene Meldung vorliegt)
  const dailyMax = opts.dailyMax ?? []
  const nowIso = now.toISOString().slice(0, 10)
  const heatEndOf = (id: string, start: string, end: string): string | null =>
    recMap.has(id) ? null : heatBloomEnd(id, start, end, dailyMax, nowIso)

  // Beendete Trachten entfernen: eigene Meldung ODER hitzebedingt vorbei
  const activeInfos = currentInfos.filter(c => {
    if (isEndedByRecord(c.plant.id)) return false
    const he = heatEndOf(c.plant.id, c.startDate, c.endDate)
    return !(he && he < nowIso)
  })

  const currentBloom: CurrentBloomPlant[] = activeInfos.map(info => {
    const plant = info.plant
    const rec = recMap.get(plant.id)
    const heatEnd = heatEndOf(plant.id, info.startDate, info.endDate)
    const viaRecord = !!(rec && (rec.start || rec.end))
    const startDate = rec?.start ? rec.start.toISOString().slice(0, 10) : info.startDate
    const endDate = rec?.end ? rec.end.toISOString().slice(0, 10) : (heatEnd ?? info.endDate)
    const daysLeft = Math.max(0, Math.ceil((new Date(endDate + 'T12:00:00Z').getTime() - now.getTime()) / DAY))
    const forecast7days = days.map(d => buildDayForecast(d, plant, regionRainBonus))
    const todayFc = forecast7days[0]
    const best = pickBestDays(forecast7days)
    const isVerified = verified.has(plant.id) || reportPlantIds.has(plant.id)
    const heatWarning = heatEnd
      ? `Hitze verkürzt die Tracht – Ende voraussichtlich um den ${endDate.slice(8, 10)}.${endDate.slice(5, 7)}.`
      : null
    return {
      plantId: plant.id,
      plantName: plant.name,
      bloomPhase: info.phase,
      bloomStartDate: startDate,
      estimatedEndDate: endDate,
      bloomDaysLeft: daysLeft,
      nectarAmountExpected: plant.nectar,
      pollenAmountExpected: plant.pollen,
      nectarIndexToday: todayFc.nectarIndex,
      nectarRatingToday: todayFc.rating,
      explanation: `${info.phase}: ${todayFc.reason}.`,
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
      warning: heatWarning ?? plantWarning(plant, days, daysLeft),
    }
  })

  const nextBloom = getNextBloom(now, 90, shiftDays)
    .filter(n => !isEndedByRecord(n.plant.id) && !isStartedByRecord(n.plant.id))
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
