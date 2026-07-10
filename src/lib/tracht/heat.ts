// Hitze-/Dürregetriebenes Trachtende: In Extremjahren (z.B. 2026) beendet eine
// Hitzewelle die Nektarsekretion hitzeempfindlicher Trachten (v.a. Linde) abrupt,
// deutlich vor dem Kalenderende. Modelliert das aus den realen Tageshöchstwerten.

export interface DailyMax { date: string; max: number }

// Trachten, deren Nektarfluss bei Hitze/Dürre schnell abreißt.
const HEAT_SENSITIVE = new Set([
  'salweide', 'obstbluete', 'loewenzahn', 'raps', 'robinie',
  'sommerlinde', 'winterlinde', 'edelkastanie', 'brombeere', 'weissklee', 'springkraut',
])

export function isHeatSensitive(plantId: string): boolean {
  return HEAT_SENSITIVE.has(plantId)
}

function addDaysIso(dateIso: string, n: number): string {
  const d = new Date(dateIso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Liefert ein wetterbedingt vorgezogenes Trachtende (ISO) oder null, wenn keine
 * Hitze das Blühfenster verkürzt. Regel: ein Tag ≥ 36 °C oder ≥ 3 Tage ≥ 32 °C
 * innerhalb von 5 Tagen während der Blüte → Nektarkollaps ~2 Tage danach.
 */
export function heatBloomEnd(
  plantId: string,
  windowStart: string,
  windowEnd: string,
  dailyMax: DailyMax[],
  nowIso: string,
): string | null {
  if (!HEAT_SENSITIVE.has(plantId)) return null
  const upto = nowIso < windowEnd ? nowIso : windowEnd
  const inWin = dailyMax.filter(d => d.date >= windowStart && d.date <= upto)

  for (let i = 0; i < inWin.length; i++) {
    let collapse: string | null = null
    if (inWin[i].max >= 36) {
      collapse = addDaysIso(inWin[i].date, 2)
    } else {
      let hot = 0
      for (let j = Math.max(0, i - 4); j <= i; j++) if (inWin[j].max >= 32) hot++
      if (hot >= 3) collapse = addDaysIso(inWin[i].date, 2)
    }
    // Nur übernehmen, wenn es das Fenster tatsächlich verkürzt
    if (collapse && collapse < windowEnd) return collapse
  }
  return null
}
