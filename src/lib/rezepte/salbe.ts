// Reine Rechenlogik für die Propolis-Zirbensalbe (ohne UI, damit testbar).
//
// Alle Zutaten (außer Vitamin E und Propolis) skalieren mit der Shea-Menge,
// Bezugsgröße sind 250 g Shea. Vitamin E und Propolis-Feststoff sind Anteile
// an der Gesamtmenge – daher die Division durch (1 − Vit-E − Propolis).

/** Lanolin in g je 250 g Shea */
export const LANOLIN_PER_250 = 30
/** Vitamin-E-Anteil an der Gesamtmenge */
export const VITAMIN_E_SHARE = 0.01
/** Füllgewicht eines 30-ml-Tiegels in g */
export const JAR_GRAMS = 27
/** Propolis ab diesem Anteil (%) wird klebrig / Allergierisiko */
export const PROPOLIS_MAX_PCT = 5
/** Ab dieser Tinkturmenge (ml) muss fast vollständig eingedampft werden */
export const TINCTURE_WARN_ML = 60

export type SalbeMode = 'shea' | 'total'

export const FIRMNESS_OPTIONS = [
  { label: 'Weicher', grams: 30 },
  { label: 'Mittel', grams: 35 },
  { label: 'Fest', grams: 45 },
] as const

export const CALENDULA_OPTIONS = [
  { label: 'Ohne', grams: 0 },
  { label: 'Dezent', grams: 25 },
  { label: 'Kräftig', grams: 50 },
] as const

/** Ab dieser Ölmenge (g je 250 g Shea) wird die Salbe mit weniger als "Fest" zu weich */
export const CALENDULA_SOFT_THRESHOLD = 50
export const FIRM_WAX = 45

export const JOJOBA_OPTIONS = [
  { label: 'Ohne', grams: 0 },
  { label: 'Dezent', grams: 15 },
  { label: 'Kräftig', grams: 30 },
] as const

export const RESIN_OPTIONS = [
  { label: 'Ohne', grams: 0 },
  { label: 'Dezent', grams: 10 },
  { label: 'Kräftig', grams: 15 },
] as const

export interface SalbeInput {
  mode: SalbeMode
  /** Shea-Menge oder Gesamtmenge in g, je nach Modus */
  amount: number
  /** Bienenwachs in g je 250 g Shea */
  waxPer250: number
  /** Zirbenharz in g je 250 g Shea */
  resinPer250: number
  /** Ringelblumenöl in g je 250 g Shea */
  calendulaPer250: number
  /** Jojobaöl in g je 250 g Shea */
  jojobaPer250: number
  /** Propolis-Gehalt der Tinktur in % */
  tinctureStrengthPct: number
  /** Propolis-Anteil in der fertigen Salbe in % */
  propolisPct: number
}

export const DEFAULT_SALBE_INPUT: SalbeInput = {
  mode: 'shea',
  amount: 250,
  waxPer250: 35,
  resinPer250: 10,
  calendulaPer250: 25,
  jojobaPer250: 0,
  tinctureStrengthPct: 20,
  propolisPct: 2.5,
}

export interface SalbeResult {
  sheaG: number
  resinG: number
  waxG: number
  lanolinG: number
  calendulaG: number
  jojobaG: number
  vitaminEG: number
  propolisG: number
  tinctureMl: number
  totalG: number
  jars: number
  waxPct: number
}

export function calcSalbe(input: SalbeInput): SalbeResult {
  const amount = Math.max(0, input.amount)
  const p = Math.max(0, input.propolisPct) / 100
  const share = 1 - VITAMIN_E_SHARE - p
  const factor = 1 + (input.waxPer250 + input.resinPer250 + input.calendulaPer250 + input.jojobaPer250 + LANOLIN_PER_250) / 250

  // Bei unsinnigem Propolis-Anteil (≥ 99 %) gibt es keine sinnvolle Lösung
  if (share <= 0) {
    return { sheaG: 0, resinG: 0, waxG: 0, lanolinG: 0, calendulaG: 0, jojobaG: 0, vitaminEG: 0, propolisG: 0, tinctureMl: 0, totalG: 0, jars: 0, waxPct: 0 }
  }

  const sheaG = input.mode === 'shea' ? amount : (amount * share) / factor
  const totalG = input.mode === 'shea' ? (amount * factor) / share : amount
  const k = sheaG / 250
  const waxG = input.waxPer250 * k
  const propolisG = totalG * p

  return {
    sheaG,
    resinG: input.resinPer250 * k,
    waxG,
    lanolinG: LANOLIN_PER_250 * k,
    calendulaG: input.calendulaPer250 * k,
    jojobaG: input.jojobaPer250 * k,
    vitaminEG: totalG * VITAMIN_E_SHARE,
    propolisG,
    tinctureMl: input.tinctureStrengthPct > 0 ? propolisG / (input.tinctureStrengthPct / 100) : 0,
    totalG,
    jars: Math.floor(totalG / JAR_GRAMS),
    waxPct: totalG > 0 ? (waxG / totalG) * 100 : 0,
  }
}

/** Moduswechsel: übernimmt den aktuell berechneten Wert des anderen Modus als neue Eingabe. */
export function switchSalbeMode(input: SalbeInput, mode: SalbeMode): SalbeInput {
  if (mode === input.mode) return input
  const r = calcSalbe(input)
  return { ...input, mode, amount: Math.round(mode === 'shea' ? r.sheaG : r.totalG) }
}

export function salbeWarnings(input: SalbeInput, result: SalbeResult): string[] {
  const w: string[] = []
  if (input.propolisPct > PROPOLIS_MAX_PCT) w.push('Propolis über 5 %')
  if (result.tinctureMl > TINCTURE_WARN_ML) w.push('Viel Tinktur: fast vollständig eindampfen')
  if (input.calendulaPer250 + input.jojobaPer250 >= CALENDULA_SOFT_THRESHOLD && input.waxPer250 < FIRM_WAX) w.push('Viel Öl: Festigkeit „Fest" wählen')
  return w
}

const nf = (v: number, digits: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Grammangabe: unter 20 g mit einer Nachkommastelle, sonst gerundet. */
export function formatGrams(v: number): string {
  return `${v < 20 ? nf(v, 1) : nf(Math.round(v), 0)} g`
}

export function formatNumber(v: number, digits = 0): string {
  return nf(digits === 0 ? Math.round(v) : v, digits)
}
