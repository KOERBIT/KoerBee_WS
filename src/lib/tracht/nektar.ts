import { Plant, Range, Rating, WeatherDay } from './types'

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n))

/** Faktor 0..1 für einen Wert innerhalb eines Optimalbereichs (weicher Abfall zum Rand). */
export function rangeFactor(value: number, r: Range): number {
  if (value < r.min || value > r.max) return 0
  const span = r.max - r.min
  if (span <= 0) return value === r.opt ? 1 : 0
  return clamp(1 - Math.abs(value - r.opt) / span)
}

export function temperatureFactor(tempC: number, plant: Plant): number {
  return rangeFactor(tempC, plant.temp)
}

export function humidityFactor(humidity: number, plant: Plant): number {
  return rangeFactor(humidity, plant.humidity)
}

/** Bevorzugt den echten Sonnenscheinanteil; fällt sonst auf Bewölkung zurück. */
export function sunFactor(day: WeatherDay): number {
  if (day.sunFraction > 0) return clamp(day.sunFraction)
  return clamp((100 - day.clouds) / 100)
}

/**
 * Regenfaktor. Für Pflanzen, denen Feuchte hilft (Linde, Robinie, Efeu), ist
 * leichter Regen ideal; Starkregen unterdrückt Flug/Sekretion trotzdem.
 * Für nässeempfindliche Trachten (Raps, Honigtau) reduziert jeder Niederschlag.
 */
export function rainFactor(precipitationMm: number, beneficial: boolean): number {
  const p = Math.max(0, precipitationMm)
  if (beneficial) {
    if (p <= 0.2) return 0.65 // trocken-neutral
    if (p <= 4) return 1 // ideale Feuchte
    return clamp(1 - (p - 4) / 10, 0.2, 1)
  }
  return clamp(1 - p / 8)
}

export function windFactor(windKmh: number, plant: Plant): number {
  if (plant.maxWind <= 0) return 1
  return clamp(1 - Math.max(0, windKmh) / plant.maxWind)
}

export interface IndexOptions {
  /** Regionaler Regen-Bonus (z.B. Hessen +0.1), additiv auf den Regenfaktor. */
  regionRainBonus?: number
}

const WEIGHTS = { temp: 0.35, humidity: 0.25, sun: 0.2, rain: 0.15, wind: 0.05 }

/** Gewichteter Nektarindex 0..100 für eine Pflanze an einem Wetter-Tag. */
export function nektarIndex(day: WeatherDay, plant: Plant, opts: IndexOptions = {}): number {
  const fTemp = temperatureFactor(day.tempMean, plant)
  const fHum = humidityFactor(day.humidity, plant)
  const fSun = sunFactor(day)
  const fRain = clamp(rainFactor(day.precipitation, plant.rainBeneficial) + (opts.regionRainBonus ?? 0))
  const fWind = windFactor(day.wind, plant)
  const score =
    fTemp * WEIGHTS.temp +
    fHum * WEIGHTS.humidity +
    fSun * WEIGHTS.sun +
    fRain * WEIGHTS.rain +
    fWind * WEIGHTS.wind
  return Math.round(score * 100)
}

export function rating(index: number): Rating {
  if (index >= 90) return '⭐⭐⭐ Hervorragend'
  if (index >= 75) return '⭐⭐ Sehr gut'
  if (index >= 50) return '⭐ Gut'
  if (index >= 25) return 'Befriedigend'
  return 'Schwach'
}

/** Kurzbegründung, welcher Faktor den Index an diesem Tag dominiert. */
export function reasonFor(day: WeatherDay, plant: Plant): string {
  const parts: string[] = []
  if (temperatureFactor(day.tempMean, plant) < 0.4) {
    parts.push(day.tempMean < plant.temp.opt ? 'zu kühl' : 'zu warm')
  }
  if (day.precipitation > 4 && !plant.rainBeneficial) parts.push('Regen reduziert Nektar')
  if (day.precipitation > 8) parts.push('Starkregen behindert Flug')
  if (sunFactor(day) < 0.4) parts.push('wenig Sonne / stark bewölkt')
  if (windFactor(day.wind, plant) < 0.4) parts.push('zu windig')
  if (humidityFactor(day.humidity, plant) < 0.4) {
    parts.push(day.humidity < plant.humidity.opt ? 'Luft zu trocken' : 'Luft zu feucht')
  }
  if (parts.length === 0) return 'Sehr gute Bedingungen für Nektarsekretion und Flug'
  return parts.join(', ').replace(/^./, c => c.toUpperCase())
}
