// Propolis-Tinktur: Alkoholauszug mit beliebigem Propolis-Anteil
// Unterstützt Verdünnung von hochprozentigem Alkohol (z.B. 96%) auf Trinkstärke

export interface TinkturInput {
  propolisG: number       // Gewünschte Menge Propolis in Gramm
  propolisPct: number     // Gewünschter Propolis-Anteil in % (w/v)
  alcoholPct: number      // Alkoholgehalt des Ausgangsalkohols (z.B. 96)
  targetAlcoholPct: number // Gewünschter Alkoholgehalt (z.B. 70)
}

export interface TinkturResult {
  propolisG: number
  totalMl: number         // Gesamtvolumen der fertigen Tinktur
  alcoholMl: number       // Menge Ausgangsalkohol
  waterMl: number         // Menge destilliertes Wasser zum Verdünnen
  undilutedMl: number     // Menge Alkohol vor Verdünnung (= totalMl bei gleichem %)
}

export const DEFAULT_TINKTUR_INPUT: TinkturInput = {
  propolisG: 30,
  propolisPct: 20,
  alcoholPct: 96,
  targetAlcoholPct: 70,
}

export function calcTinktur(i: TinkturInput): TinkturResult {
  const pct = Math.max(1, Math.min(50, i.propolisPct))
  const propolisG = Math.max(1, i.propolisG)
  const alcoholPct = Math.max(40, Math.min(96, i.alcoholPct))
  const targetPct = Math.max(40, Math.min(alcoholPct, i.targetAlcoholPct))

  // Gesamtvolumen aus Propolis-Anteil: propolisG = pct/100 * totalMl
  const totalMl = (propolisG / pct) * 100

  // Verdünnung: C1 * V1 = C2 * V2  →  V1 = (C2 * V2) / C1
  const alcoholMl = (targetPct * totalMl) / alcoholPct
  const waterMl = totalMl - alcoholMl

  return {
    propolisG,
    totalMl: Math.round(totalMl * 10) / 10,
    alcoholMl: Math.round(alcoholMl * 10) / 10,
    waterMl: Math.round(Math.max(0, waterMl) * 10) / 10,
    undilutedMl: Math.round(totalMl * 10) / 10,
  }
}

export function tinkturWarnings(i: TinkturInput): string[] {
  const w: string[] = []
  if (i.propolisPct > 30) w.push('Über 30 % löst sich schwer vollständig')
  if (i.propolisPct < 10) w.push('Unter 10 % ist die Tinktur sehr schwach')
  if (i.targetAlcoholPct < 60) w.push('Unter 60 % löst sich Propolis schlechter')
  if (i.targetAlcoholPct > i.alcoholPct) w.push('Ziel-% kann nicht höher als Ausgangs-% sein')
  return w
}

export const PROPOLIS_PCT_OPTIONS = [
  { label: '10 %', sub: 'mild', value: 10 },
  { label: '20 %', sub: 'Standard', value: 20 },
  { label: '30 %', sub: 'stark', value: 30 },
] as const

export const ALCOHOL_OPTIONS = [
  { label: '70 %', sub: 'Apotheke', value: 70 },
  { label: '96 %', sub: 'Primasprit', value: 96 },
] as const

export const TARGET_ALCOHOL_OPTIONS = [
  { label: '60 %', value: 60 },
  { label: '65 %', value: 65 },
  { label: '70 %', value: 70 },
  { label: '80 %', value: 80 },
] as const
