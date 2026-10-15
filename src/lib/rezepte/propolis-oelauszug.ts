// Propolis-Ölauszug: Basis für Shampoo, Duschgel, Haarpflege
// Warmmazeration in Trägeröl, dann Einrühren in Tensid-Basis

export interface OelauszugInput {
  oilMl: number           // Menge Trägeröl in ml
  propolisPct: number     // Propolis-Anteil im Ölauszug (%)
  useCase: 'shampoo' | 'duschgel' | 'oelauszug'  // Endprodukt
  totalProductMl: number  // Gewünschte Gesamtmenge Endprodukt (ml)
  oilSharePct: number     // Anteil Ölauszug im Endprodukt (%)
}

export interface OelauszugResult {
  propolisG: number       // Propolis roh
  oilMl: number           // Trägeröl
  oilAuszugMl: number     // Fertiger Ölauszug gesamt
  tensidMl: number        // Tensid-Basis (Shampoo/Duschgel-Basis)
  totalMl: number         // Gesamtmenge Endprodukt
  honeyMl: number         // Optional Honig (1 TL/100 ml)
  vitaminEDrops: number   // Vitamin E Tropfen
}

export const DEFAULT_OELAUSZUG_INPUT: OelauszugInput = {
  oilMl: 100,
  propolisPct: 10,
  useCase: 'shampoo',
  totalProductMl: 250,
  oilSharePct: 5,
}

export function calcOelauszug(i: OelauszugInput): OelauszugResult {
  const oilMl = Math.max(10, i.oilMl)
  const pct = Math.max(1, Math.min(20, i.propolisPct))

  // Propolis im Ölauszug
  const propolisG = Math.round((pct / 100) * oilMl * 10) / 10
  const oilAuszugMl = oilMl // Propolis löst sich im Öl, Volumen ≈ Öl

  // Endprodukt
  const totalMl = Math.max(50, i.totalProductMl)
  const oilShare = Math.max(1, Math.min(15, i.oilSharePct))
  const oilInProduct = Math.round((oilShare / 100) * totalMl * 10) / 10
  const tensidMl = Math.round((totalMl - oilInProduct) * 10) / 10
  const honeyMl = Math.round(totalMl / 100 * 5 * 10) / 10 // 5 ml / 100 ml ≈ 1 TL
  const vitaminEDrops = Math.max(2, Math.round(totalMl / 50))

  return {
    propolisG,
    oilMl,
    oilAuszugMl,
    tensidMl: Math.max(0, tensidMl),
    totalMl,
    honeyMl,
    vitaminEDrops,
  }
}

export function oelauszugWarnings(i: OelauszugInput): string[] {
  const w: string[] = []
  if (i.propolisPct > 15) w.push('Über 15 % kann Hautreizungen verursachen')
  if (i.oilSharePct > 10) w.push('Über 10 % Ölanteil macht Shampoo zu fettig')
  if (i.oilSharePct < 2) w.push('Unter 2 % ist der Propoliseffekt kaum spürbar')
  return w
}

export const OIL_TYPE_OPTIONS = [
  { label: 'Olivenöl', sub: 'pflegend', value: 'oliven' },
  { label: 'Jojobaöl', sub: 'leicht', value: 'jojoba' },
  { label: 'Mandelöl', sub: 'mild', value: 'mandel' },
] as const

export const USE_CASE_OPTIONS = [
  { label: 'Shampoo', value: 'shampoo' as const },
  { label: 'Duschgel', value: 'duschgel' as const },
  { label: 'Nur Ölauszug', value: 'oelauszug' as const },
] as const

export const OIL_SHARE_OPTIONS = [
  { label: '3 %', sub: 'leicht', value: 3 },
  { label: '5 %', sub: 'Standard', value: 5 },
  { label: '8 %', sub: 'reichhaltig', value: 8 },
] as const
