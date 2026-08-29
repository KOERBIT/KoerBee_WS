import {
  recipeForBucket, recipeForTargetWeight, recipeForSugar, dissolveFondant,
  invertinMl, bucketsNeeded, batchCost, syrupVolume, FEED_PRESETS,
  bucketKgToLiters, foodFromWeight, seasonalFeedingAdvice,
  dryWeight, frameCapacityKg,
} from '@/lib/feed/calc'

const sommer = FEED_PRESETS.find(p => p.key === 'sommer')!.ratio // 1:1
const winter = FEED_PRESETS.find(p => p.key === 'winter')!.ratio // 3:2

describe('syrupVolume', () => {
  it('1 kg Zucker + 1 L Wasser ≈ 1,625 L', () => expect(syrupVolume(1, 1)).toBeCloseTo(1.625, 3))
})

describe('recipeForBucket', () => {
  it('Winter 3:2 in 10-L-Eimer, 15% Reserve → passt ins nutzbare Volumen', () => {
    const r = recipeForBucket(10, 15, winter)
    expect(r.volumeL).toBeCloseTo(8.5, 2)          // 85% von 10 L
    expect(r.sugarKg / r.waterL).toBeCloseTo(3 / 2, 5) // Verhältnis stimmt
    expect(r.densityKgL).toBeCloseTo(1.29, 2)      // 3:2-Sirup ~1,29 kg/L
    expect(r.sugarKg).toBeCloseTo(6.58, 1)
  })
  it('Sommer 1:1 hat Verhältnis 1:1 und ~1,23 kg/L', () => {
    const r = recipeForBucket(10, 15, sommer)
    expect(r.sugarKg).toBeCloseTo(r.waterL, 5)
    expect(r.densityKgL).toBeCloseTo(1.23, 2)
  })
  it('leerer Eimer → 0', () => expect(recipeForBucket(0, 15, winter).sugarKg).toBe(0))
})

describe('recipeForTargetWeight', () => {
  it('10 kg Winter 3:2 → 6 kg Zucker, 4 L Wasser', () => {
    const r = recipeForTargetWeight(10, winter)
    expect(r.sugarKg).toBeCloseTo(6, 5)
    expect(r.waterL).toBeCloseTo(4, 5)
    expect(r.weightKg).toBeCloseTo(10, 5)
  })
})

describe('recipeForSugar', () => {
  it('15 kg Zucker im 3:2 → 10 L Wasser', () => {
    const r = recipeForSugar(15, winter)
    expect(r.waterL).toBeCloseTo(10, 5)
  })
})

describe('dissolveFondant', () => {
  it('5 kg Teig (90% Zucker) auf Winter 3:2 → ~2,5 L Wasser zugeben', () => {
    const r = dissolveFondant(5, 90, winter)
    expect(r.sugarKg).toBeCloseTo(4.5, 5)
    expect(r.addWaterL).toBeCloseTo(2.5, 5) // 4,5*2/3=3,0 total − 0,5 vorhanden
    expect(r.weightKg).toBeCloseTo(7.5, 5)
  })
  it('5 kg Teig (90%) auf Sommer 1:1 → 4,0 L Wasser zugeben', () => {
    expect(dissolveFondant(5, 90, sommer).addWaterL).toBeCloseTo(4.0, 5)
  })
  it('nie negativ Wasser', () => expect(dissolveFondant(1, 10, winter).addWaterL).toBeGreaterThanOrEqual(0))
})

describe('bucketKgToLiters', () => {
  it('12,5 kg Honigeimer ≈ 8,93 L', () => expect(bucketKgToLiters(12.5)).toBeCloseTo(8.93, 2))
  it('negativ → 0', () => expect(bucketKgToLiters(-5)).toBe(0))
})

describe('foodFromWeight', () => {
  it('40 kg gemessen − 22 kg leer = 18 kg Futter', () => expect(foodFromWeight(40, 22)).toBe(18))
  it('nie negativ', () => expect(foodFromWeight(10, 22)).toBe(0))
})

describe('dryWeight / frameCapacityKg', () => {
  it('Tara 7 + 20 Waben×0,5 + 1,5 Bienen = 18,5 kg', () => expect(dryWeight(7, 20, 0.5, 1.5)).toBeCloseTo(18.5, 5))
  it('Zander: 20 Waben × 2 kg = 40 kg Kapazität', () => expect(frameCapacityKg(20, 2)).toBe(40))
  it('food aus Gewicht: 42 kg − Leergewicht(18,5) = 23,5 kg', () => {
    expect(foodFromWeight(42, dryWeight(7, 20, 0.5, 1.5))).toBeCloseTo(23.5, 5)
  })
})

describe('seasonalFeedingAdvice', () => {
  it('genug Vorrat → enough, keine Fütterung', () => {
    const a = seasonalFeedingAdvice(8, 0)
    expect(a.enough).toBe(true); expect(a.form).toBe('keine')
  })
  it('August, Defizit → Flüssigfutter 3:2 (winter)', () => {
    const a = seasonalFeedingAdvice(8, 6)
    expect(a.form).toBe('fluessig'); expect(a.ratioKey).toBe('winter')
  })
  it('Oktober → Futterteig', () => expect(seasonalFeedingAdvice(10, 6).form).toBe('teig'))
  it('Dezember → Futterteig', () => expect(seasonalFeedingAdvice(12, 6).form).toBe('teig'))
  it('April → Flüssigfutter 1:1 (sommer)', () => {
    const a = seasonalFeedingAdvice(4, 6)
    expect(a.form).toBe('fluessig'); expect(a.ratioKey).toBe('sommer')
  })
})

describe('invertinMl / bucketsNeeded / batchCost', () => {
  it('invertin: 6 kg Zucker × 3 ml/kg = 18 ml', () => expect(invertinMl(6, 3)).toBeCloseTo(18, 5))
  it('buckets: 20 L Gesamt, 10-L-Eimer, 15% Reserve → 3 Eimer', () => expect(bucketsNeeded(20, 10, 15)).toBe(3))
  it('cost: 6 kg × 1,20 € + 18 ml Invertin × 40 €/L', () => {
    expect(batchCost(6, 1.2, 18, 40)).toBeCloseTo(6 * 1.2 + 0.018 * 40, 5)
  })
})
