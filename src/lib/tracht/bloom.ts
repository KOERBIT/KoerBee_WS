import { Plant } from './types'
import { PLANTS } from './plants'

const DAY = 86400000

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function at(year: number, md: [number, number]): Date {
  return new Date(Date.UTC(year, md[0] - 1, md[1]))
}

export interface BloomWindow {
  start: Date
  end: Date
}

/** Blühfenster der Pflanze im Jahr des Referenzdatums. */
export function bloomWindow(plant: Plant, ref: Date): BloomWindow {
  const year = ref.getUTCFullYear()
  return { start: at(year, plant.bloomStart), end: at(year, plant.bloomEnd) }
}

export function isBlooming(plant: Plant, ref: Date): boolean {
  const { start, end } = bloomWindow(plant, ref)
  return ref >= start && ref <= end
}

/** Phasenbezeichnung je nach Fortschritt im Blühfenster. */
export function bloomPhase(plant: Plant, ref: Date): string {
  const { start, end } = bloomWindow(plant, ref)
  const span = end.getTime() - start.getTime()
  const ratio = span > 0 ? (ref.getTime() - start.getTime()) / span : 0
  const honigtau = plant.id === 'honigtau'
  if (ratio < 0.34) return honigtau ? 'Einsetzend' : 'Blühbeginn'
  if (ratio < 0.67) return honigtau ? 'Ergiebig' : 'Hochblüte'
  return honigtau ? 'Nachlassend' : 'Abblühend'
}

export function daysLeft(plant: Plant, ref: Date): number {
  const { end } = bloomWindow(plant, ref)
  return Math.max(0, Math.ceil((end.getTime() - ref.getTime()) / DAY))
}

export interface CurrentBloomInfo {
  plant: Plant
  phase: string
  startDate: string
  endDate: string
  daysLeft: number
}

export function getCurrentBloom(ref: Date): CurrentBloomInfo[] {
  return PLANTS.filter(p => isBlooming(p, ref))
    .map(p => {
      const w = bloomWindow(p, ref)
      return {
        plant: p,
        phase: bloomPhase(p, ref),
        startDate: isoDate(w.start),
        endDate: isoDate(w.end),
        daysLeft: daysLeft(p, ref),
      }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export interface NextBloomInfo {
  plant: Plant
  startDate: string
  endDate: string
  daysUntilStart: number
}

/** Kommende Blüten innerhalb der nächsten `withinDays` Tage (Jahreswechsel berücksichtigt). */
export function getNextBloom(ref: Date, withinDays = 90): NextBloomInfo[] {
  const year = ref.getUTCFullYear()
  const result: NextBloomInfo[] = []
  for (const p of PLANTS) {
    if (isBlooming(p, ref)) continue
    // dieses Jahr, sonst nächstes Jahr
    let start = at(year, p.bloomStart)
    let end = at(year, p.bloomEnd)
    if (start < ref) {
      start = at(year + 1, p.bloomStart)
      end = at(year + 1, p.bloomEnd)
    }
    const daysUntil = Math.ceil((start.getTime() - ref.getTime()) / DAY)
    if (daysUntil >= 0 && daysUntil <= withinDays) {
      result.push({ plant: p, startDate: isoDate(start), endDate: isoDate(end), daysUntilStart: daysUntil })
    }
  }
  return result.sort((a, b) => a.daysUntilStart - b.daysUntilStart)
}

const SEASON_BY_MONTH: Record<number, string> = {
  1: 'Winterruhe', 2: 'Winterruhe', 3: 'Frühjahrstracht (Weide, erste Pollen)',
  4: 'Frühjahrstracht (Obst, Löwenzahn, Raps)', 5: 'Frühsommer (Raps, Robinie)',
  6: 'Hochsommer-Tracht (Linde)', 7: 'Hochsommer-Tracht (Linde, Honigtau)',
  8: 'Spätsommer (Honigtau, Heide)', 9: 'Herbsttracht (Efeu)',
  10: 'Herbsttracht (Efeu)', 11: 'Trachtende / Einwinterung', 12: 'Winterruhe',
}

export function seasonLabel(ref: Date): string {
  return SEASON_BY_MONTH[ref.getUTCMonth() + 1] ?? 'Tracht'
}
