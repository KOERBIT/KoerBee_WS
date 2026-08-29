// Reine Rechenlogik für die Futtermittelberechnung (ohne UI/DB, damit testbar).
//
// Grundlagen (recherchiert):
//  - Sommerfutter / Reizfütterung: 1:1 (Zucker:Wasser nach Gewicht)
//  - Winterfutter / Auffütterung:  3:2 (Zucker:Wasser nach Gewicht)
//  - Invertin: ~2–5 ml je kg Zucker, erst bei < 45 °C zugeben (Enzym).
//  - Gelöster Haushaltszucker hat ein scheinbares Volumen von ~0,625 L/kg
//    (partielles spez. Volumen von Saccharose). Wasser = 1 kg/L.

/** Scheinbares Volumen von gelöstem Zucker in Litern pro kg. */
export const SUCROSE_PARTIAL_VOLUME = 0.625

/** Honigdichte (kg/L) – zum Umrechnen der kg-Nenngröße von Eimern in Volumen. */
export const HONEY_DENSITY = 1.4

/** kg-Nenngröße eines Honig-/Futtereimers → nutzbares Volumen (L). */
export function bucketKgToLiters(kg: number): number {
  return Math.max(0, kg) / HONEY_DENSITY
}

export interface Ratio {
  /** Gewichtsteile Zucker */
  sugar: number
  /** Gewichtsteile Wasser */
  water: number
}

export interface FeedPreset {
  key: 'sommer' | 'winter'
  label: string
  ratio: Ratio
  hint: string
}

export const FEED_PRESETS: FeedPreset[] = [
  { key: 'sommer', label: 'Sommerfutter (1:1)', ratio: { sugar: 1, water: 1 }, hint: 'Reiz-/Frühjahrsfütterung, dünn' },
  { key: 'winter', label: 'Winterfutter (3:2)', ratio: { sugar: 3, water: 2 }, hint: 'Auffütterung / Einwinterung, dick' },
]

/** Gängige Honig-Eimer: Nenngröße (kg Honig) → nutzbares Volumen (L). Honig ≈ 1,4 kg/L. */
export const BUCKET_PRESETS: { kg: number; liters: number }[] = [
  { kg: 2.5, liters: 2 },
  { kg: 5, liters: 4 },
  { kg: 12.5, liters: 9 },
  { kg: 25, liters: 18 },
]

export interface Recipe {
  sugarKg: number
  waterL: number
  weightKg: number
  volumeL: number
  densityKgL: number
}

/** Sirupvolumen (L) aus Zucker (kg) und Wasser (L). */
export function syrupVolume(sugarKg: number, waterL: number): number {
  return waterL + sugarKg * SUCROSE_PARTIAL_VOLUME
}

function finalize(sugarKg: number, waterL: number): Recipe {
  const weightKg = sugarKg + waterL
  const volumeL = syrupVolume(sugarKg, waterL)
  return { sugarKg, waterL, weightKg, volumeL, densityKgL: volumeL > 0 ? weightKg / volumeL : 0 }
}

/**
 * Rezept, das mit Rührreserve in einen Eimer passt.
 * @param bucketL   Eimervolumen in Litern
 * @param headroomPct Rührreserve in Prozent (z.B. 15)
 */
export function recipeForBucket(bucketL: number, headroomPct: number, ratio: Ratio): Recipe {
  const usable = Math.max(0, bucketL) * (1 - Math.min(90, Math.max(0, headroomPct)) / 100)
  const denom = ratio.water + SUCROSE_PARTIAL_VOLUME * ratio.sugar
  const t = denom > 0 ? usable / denom : 0
  return finalize(ratio.sugar * t, ratio.water * t)
}

/** Rezept aus Zielmenge fertigen Futters (kg). */
export function recipeForTargetWeight(targetKg: number, ratio: Ratio): Recipe {
  const parts = ratio.sugar + ratio.water
  if (parts <= 0) return finalize(0, 0)
  return finalize((targetKg * ratio.sugar) / parts, (targetKg * ratio.water) / parts)
}

/** Rezept, das eine bestimmte Menge Zucker (kg) im Verhältnis liefert. */
export function recipeForSugar(sugarKg: number, ratio: Ratio): Recipe {
  const waterL = ratio.sugar > 0 ? (sugarKg * ratio.water) / ratio.sugar : 0
  return finalize(sugarKg, waterL)
}

export interface FondantResult {
  sugarKg: number
  addWaterL: number
  weightKg: number
  volumeL: number
}

/**
 * Angebrochenen Futterteig mit Wasser zu Flüssigfutter auflösen.
 * @param fondantKg Menge Futterteig (kg)
 * @param sugarPct  Zuckergehalt des Teigs in Prozent (z.B. 90)
 * @param ratio     Ziel-Verhältnis (Sommer 1:1 / Winter 3:2)
 */
export function dissolveFondant(fondantKg: number, sugarPct: number, ratio: Ratio): FondantResult {
  const frac = Math.min(100, Math.max(0, sugarPct)) / 100
  const sugarKg = fondantKg * frac
  const existingWater = fondantKg * (1 - frac)
  const totalWater = ratio.sugar > 0 ? (sugarKg * ratio.water) / ratio.sugar : 0
  const addWaterL = Math.max(0, totalWater - existingWater)
  return {
    sugarKg,
    addWaterL,
    weightKg: fondantKg + addWaterL,
    volumeL: syrupVolume(sugarKg, totalWater),
  }
}

/** Invertin-Menge (ml) aus Zucker (kg) und Dosierung (ml/kg). */
export function invertinMl(sugarKg: number, mlPerKg: number): number {
  return Math.max(0, sugarKg) * Math.max(0, mlPerKg)
}

/** Anzahl benötigter Eimer für ein Gesamtvolumen (mit Rührreserve). */
export function bucketsNeeded(totalVolumeL: number, bucketL: number, headroomPct: number): number {
  const usable = bucketL * (1 - headroomPct / 100)
  return usable > 0 ? Math.ceil(totalVolumeL / usable) : 0
}

/** Materialkosten einer Charge. */
export function batchCost(sugarKg: number, sugarPricePerKg: number, invertinMlAmount: number, invertinPricePerL: number): number {
  return sugarKg * Math.max(0, sugarPricePerKg) + (invertinMlAmount / 1000) * Math.max(0, invertinPricePerL)
}

// ---- Vorrat prüfen (Federwaage) ---------------------------------------------

export interface FramePreset {
  key: string
  label: string
  /** Gewicht einer leeren, ausgebauten Wabe (Rähmchen + Waben), kg */
  emptyCombKg: number
  /** Futter in einer voll gefüllten Wabe, kg */
  foodPerFullKg: number
  /** übliche Anzahl Rähmchen je Zarge */
  defaultFrames: number
  /** Richtwert leere Zarge (Kasten) ohne Rähmchen, kg */
  boxTareKg: number
  /** empfohlener Ziel-Futtervorrat je Volk, kg */
  targetFoodKg: number
}

// Richtwerte – vom Nutzer überschreibbar (Material/Bauweise variieren stark).
export const FRAME_PRESETS: FramePreset[] = [
  { key: 'zander', label: 'Zander', emptyCombKg: 0.5, foodPerFullKg: 2.0, defaultFrames: 10, boxTareKg: 2.5, targetFoodKg: 18 },
  { key: 'dnm', label: 'Deutsch Normal (DNM)', emptyCombKg: 0.45, foodPerFullKg: 1.8, defaultFrames: 10, boxTareKg: 2.3, targetFoodKg: 16 },
  { key: 'dadant', label: 'Dadant (Brutraum)', emptyCombKg: 0.7, foodPerFullKg: 3.5, defaultFrames: 11, boxTareKg: 3.0, targetFoodKg: 18 },
  { key: 'langstroth', label: 'Langstroth', emptyCombKg: 0.55, foodPerFullKg: 2.3, defaultFrames: 10, boxTareKg: 2.5, targetFoodKg: 18 },
  { key: 'zander_flach', label: 'Zander flach (Halbzarge)', emptyCombKg: 0.3, foodPerFullKg: 1.0, defaultFrames: 10, boxTareKg: 2.0, targetFoodKg: 14 },
]

/** Geschätzter Futtervorrat (kg) aus gemessenem Gesamtgewicht minus Leergewicht. */
export function foodFromWeight(measuredKg: number, dryKg: number): number {
  return Math.max(0, measuredKg - dryKg)
}

/**
 * Leergewicht (ohne Futter): Tara der Beute (Kästen/Böden/Deckel ohne Rähmchen)
 * + ausgebaute Waben + Bienen.
 */
export function dryWeight(taraKg: number, totalFrames: number, emptyCombKg: number, beesKg: number): number {
  return Math.max(0, taraKg) + Math.max(0, totalFrames) * Math.max(0, emptyCombKg) + Math.max(0, beesKg)
}

/** Maximale Futter-Kapazität (kg), wenn alle Waben voll wären. */
export function frameCapacityKg(totalFrames: number, foodPerFullKg: number): number {
  return Math.max(0, totalFrames) * Math.max(0, foodPerFullKg)
}

export type FeedForm = 'fluessig' | 'teig' | 'keine'

export interface FeedingAdvice {
  enough: boolean
  form: FeedForm
  ratioKey: 'sommer' | 'winter'
  title: string
  reason: string
}

/** Monatsabhängige Empfehlung, ob/womit nachgefüttert werden sollte. month = 1..12 */
export function seasonalFeedingAdvice(month: number, deficitKg: number): FeedingAdvice {
  if (deficitKg <= 0.5) {
    return { enough: true, form: 'keine', ratioKey: 'winter', title: 'Vorrat reicht', reason: 'Kein Nachfüttern nötig.' }
  }
  switch (month) {
    case 8:
      return { enough: false, form: 'fluessig', ratioKey: 'winter', title: 'Flüssigfutter 3:2', reason: 'Hauptauffütterung – jetzt ist es warm genug für Flüssigfutter.' }
    case 9:
      return { enough: false, form: 'fluessig', ratioKey: 'winter', title: 'Flüssigfutter 3:2', reason: 'Auffütterung bald abschließen (bis ~Mitte September). Danach auf Futterteig wechseln.' }
    case 10:
      return { enough: false, form: 'teig', ratioKey: 'winter', title: 'Futterteig auflegen', reason: 'Für Flüssigfutter meist zu spät/kühl – Bienen verarbeiten es kaum noch. Futterteig auflegen.' }
    case 11: case 12: case 1:
      return { enough: false, form: 'teig', ratioKey: 'winter', title: 'Futterteig (Notfütterung)', reason: 'Winter – kaltes Flüssigfutter wird nicht abgenommen. Nur Futterteig als Notfütterung.' }
    case 2:
      return { enough: false, form: 'teig', ratioKey: 'winter', title: 'Futterteig (Notfütterung)', reason: 'Spätwinter – Futterteig zur Überbrückung bis zur ersten Tracht.' }
    case 3:
      return { enough: false, form: 'teig', ratioKey: 'winter', title: 'Futterteig / evtl. 1:1', reason: 'Vorfrühling – bei Kälte Futterteig; bei mildem Wetter Reizfütterung 1:1 möglich.' }
    case 4: case 5:
      return { enough: false, form: 'fluessig', ratioKey: 'sommer', title: 'Reizfütterung 1:1', reason: 'Frühjahr – dünnes Flüssigfutter 1:1 bei wenig Tracht (regt Bruttrieb an).' }
    default: // 6, 7
      return { enough: false, form: 'fluessig', ratioKey: 'sommer', title: 'Flüssigfutter 1:1', reason: 'Trachtzeit – normalerweise keine Fütterung; bei echtem Mangel dünnes 1:1.' }
  }
}
