// Grünlandtemperatursumme (GTS) nach dem in Deutschland gebräuchlichen Verfahren:
// Summe der positiven Tagesmittel ab 1. Januar, im Januar mit 0,5 und im Februar
// mit 0,75 gewichtet, ab März voll. Erreicht die Summe 200 °C, gilt der
// Vegetationsbeginn (Beginn des nachhaltigen Pflanzenwachstums).

export interface DailyMean { date: string; mean: number }

export interface GTSResult {
  gts: number
  /** Datum, an dem die GTS erstmals ≥ 200 °C erreicht (Vegetationsbeginn). */
  vegetationStart: string | null
}

function monthWeight(month: number): number {
  if (month === 1) return 0.5
  if (month === 2) return 0.75
  return 1
}

export function computeGTS(daily: DailyMean[]): GTSResult {
  let sum = 0
  let vegetationStart: string | null = null
  for (const d of daily) {
    if (d.mean == null || Number.isNaN(d.mean) || d.mean <= 0) continue
    const month = Number(d.date.slice(5, 7))
    sum += d.mean * monthWeight(month)
    if (vegetationStart === null && sum >= 200) vegetationStart = d.date
  }
  return { gts: Math.round(sum), vegetationStart }
}

export function dayOfYear(dateIso: string): number {
  const d = new Date(dateIso + 'T12:00:00Z')
  const start = Date.UTC(d.getUTCFullYear(), 0, 1)
  return Math.floor((d.getTime() - start) / 86400000) + 1
}

// Typischer Vegetationsbeginn im deutschen Tiefland ≈ 5. April (Tag 95).
const REFERENCE_VEG_START_DOY = 95

/**
 * Phänologische Verschiebung der Blühzeiten in Tagen, abgeleitet aus dem
 * tatsächlichen (standortspezifischen) Vegetationsbeginn. Früher als die
 * Referenz → negativer Wert (Blüte früher); später → positiv. Begrenzt auf ±21.
 */
export function seasonShiftDays(vegetationStart: string | null): number {
  if (!vegetationStart) return 0
  const shift = dayOfYear(vegetationStart) - REFERENCE_VEG_START_DOY
  return Math.max(-21, Math.min(21, shift))
}
