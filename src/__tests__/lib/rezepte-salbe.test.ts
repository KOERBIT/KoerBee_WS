import {
  calcSalbe, switchSalbeMode, salbeWarnings, formatGrams, DEFAULT_SALBE_INPUT,
} from '@/lib/rezepte/salbe'

// Ursprüngliche Kontrollwerte (Rezept ohne Ringelblumenöl)
const OHNE_OEL = { ...DEFAULT_SALBE_INPUT, calendulaPer250: 0 }

describe('calcSalbe – Kontrollwerte ohne Ringelblumenöl', () => {
  const r = calcSalbe(OHNE_OEL)

  it('Shea 250 g, Harz 10 g, Wachs 35 g, Lanolin 30 g', () => {
    expect(r.sheaG).toBe(250)
    expect(r.resinG).toBeCloseTo(10, 5)
    expect(r.waxG).toBeCloseTo(35, 5)
    expect(r.lanolinG).toBeCloseTo(30, 5)
  })
  it('gesamt ca. 337 g, 12 Tiegel', () => {
    expect(r.totalG).toBeCloseTo(336.79, 1)
    expect(Math.round(r.totalG)).toBe(337)
    expect(r.jars).toBe(12)
  })
  it('Vitamin E 3,4 g, Propolis 8,4 g, Tinktur 42 ml', () => {
    expect(formatGrams(r.vitaminEG)).toBe('3,4 g')
    expect(formatGrams(r.propolisG)).toBe('8,4 g')
    expect(Math.round(r.tinctureMl)).toBe(42)
  })
  it('Wachsanteil ca. 10,4 %', () => expect(r.waxPct).toBeCloseTo(10.39, 1))
})

describe('calcSalbe – Standardwerte mit 25 g Ringelblumenöl', () => {
  const r = calcSalbe(DEFAULT_SALBE_INPUT)
  it('Ringelblumenöl 25 g, gesamt ca. 363 g, 13 Tiegel', () => {
    expect(r.calendulaG).toBeCloseTo(25, 5)
    expect(Math.round(r.totalG)).toBe(363)
    expect(r.jars).toBe(13)
  })
  it('Vitamin E 3,6 g, Propolis 9,1 g, Tinktur 45 ml', () => {
    expect(formatGrams(r.vitaminEG)).toBe('3,6 g')
    expect(formatGrams(r.propolisG)).toBe('9,1 g')
    expect(Math.round(r.tinctureMl)).toBe(45)
  })
  it('Öl skaliert mit der Shea-Menge', () => {
    expect(calcSalbe({ ...DEFAULT_SALBE_INPUT, amount: 500 }).calendulaG).toBeCloseTo(50, 5)
  })
})

describe('Modus Gesamtmenge', () => {
  it('ist die Umkehrung von Modus Shea', () => {
    const total = calcSalbe(DEFAULT_SALBE_INPUT).totalG
    const r = calcSalbe({ ...DEFAULT_SALBE_INPUT, mode: 'total', amount: total })
    expect(r.sheaG).toBeCloseTo(250, 5)
  })
})

describe('switchSalbeMode', () => {
  it('übernimmt den berechneten Wert des anderen Modus', () => {
    const toTotal = switchSalbeMode(DEFAULT_SALBE_INPUT, 'total')
    expect(toTotal).toMatchObject({ mode: 'total', amount: 363 })
    expect(switchSalbeMode(toTotal, 'shea')).toMatchObject({ mode: 'shea', amount: 250 })
  })
  it('gleicher Modus → unverändert', () => {
    expect(switchSalbeMode(DEFAULT_SALBE_INPUT, 'shea')).toBe(DEFAULT_SALBE_INPUT)
  })
})

describe('salbeWarnings', () => {
  it('keine Warnung bei Standardwerten', () => {
    expect(salbeWarnings(DEFAULT_SALBE_INPUT, calcSalbe(DEFAULT_SALBE_INPUT))).toEqual([])
  })
  it('warnt bei Propolis > 5 % und Tinktur > 60 ml', () => {
    const input = { ...DEFAULT_SALBE_INPUT, propolisPct: 6 }
    const w = salbeWarnings(input, calcSalbe(input))
    expect(w).toContain('Propolis über 5 %')
    expect(w).toContain('Viel Tinktur: fast vollständig eindampfen')
  })
  it('warnt bei viel Ringelblumenöl ohne feste Wachsstufe', () => {
    const viel = { ...DEFAULT_SALBE_INPUT, calendulaPer250: 50 }
    expect(salbeWarnings(viel, calcSalbe(viel))).toContain('Viel Öl: Festigkeit „Fest" wählen')
    const fest = { ...viel, waxPer250: 45 }
    expect(salbeWarnings(fest, calcSalbe(fest))).toEqual([])
  })
})

describe('Randfälle', () => {
  it('ohne Harz → 0 g Harz', () => expect(calcSalbe({ ...DEFAULT_SALBE_INPUT, resinPer250: 0 }).resinG).toBe(0))
  it('Tinktur-Stärke 0 → keine Division durch 0', () => {
    expect(calcSalbe({ ...DEFAULT_SALBE_INPUT, tinctureStrengthPct: 0 }).tinctureMl).toBe(0)
  })
})

describe('formatGrams', () => {
  it('unter 20 g eine Nachkommastelle, sonst gerundet', () => {
    expect(formatGrams(3.37)).toBe('3,4 g')
    expect(formatGrams(336.79)).toBe('337 g')
    expect(formatGrams(1234.4)).toBe('1.234 g')
  })
})
