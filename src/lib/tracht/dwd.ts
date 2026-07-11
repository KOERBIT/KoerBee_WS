import { PLANTS_BY_ID } from './plants'

// DWD-Phänologie (Sofortmelder, opendata.dwd.de): amtliche „Blühbeginn"-
// Beobachtungen pro Station & Jahr – zur Kalibrierung/Verifizierung des Modells.

const CDC = 'https://opendata.dwd.de/climate_environment/CDC'
const IR = `${CDC}/observations_germany/phenology/immediate_reporters`
const STATIONS_URL = `${CDC}/help/PH_Beschreibung_Phaenologie_Stationen_Sofortmelder.txt`
const BLUEHBEGINN_PHASE = 5

const SPECIES: { plantId: string; file: string }[] = [
  { plantId: 'sommerlinde', file: `${IR}/wild/recent/PH_Sofortmelder_Wildwachsende_Pflanze_Sommer-Linde_akt.txt` },
  { plantId: 'robinie', file: `${IR}/wild/recent/PH_Sofortmelder_Wildwachsende_Pflanze_Robinie_akt.txt` },
  { plantId: 'loewenzahn', file: `${IR}/wild/recent/PH_Sofortmelder_Wildwachsende_Pflanze_Loewenzahn_akt.txt` },
  { plantId: 'salweide', file: `${IR}/wild/recent/PH_Sofortmelder_Wildwachsende_Pflanze_Sal-Weide_akt.txt` },
  { plantId: 'hasel', file: `${IR}/wild/recent/PH_Sofortmelder_Wildwachsende_Pflanze_Hasel_akt.txt` },
  { plantId: 'obstbluete', file: `${IR}/fruit/recent/PH_Sofortmelder_Obst_Apfel_akt.txt` },
]

export interface DwdStation { id: number; name: string; lat: number; lng: number }
export interface DwdRecord { stationId: number; year: number; phase: number; date: string }
export interface DwdPhenology {
  plantId: string
  plantName: string
  bloomStart: string // YYYY-MM-DD
  stationName: string
  distanceKm: number
}

export function parseStations(text: string): Map<number, DwdStation> {
  const map = new Map<number, DwdStation>()
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('Stations_id')) continue
    const f = line.split(';')
    if (f.length < 4) continue
    const id = parseInt(f[0], 10)
    const lat = parseFloat(f[2])
    const lng = parseFloat(f[3])
    if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue
    map.set(id, { id, name: f[1].trim(), lat, lng })
  }
  return map
}

export function parseSpecies(text: string): DwdRecord[] {
  const out: DwdRecord[] = []
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('Stations_id')) continue
    const f = line.split(';')
    if (f.length < 6) continue
    const stationId = parseInt(f[0], 10)
    const year = parseInt(f[1], 10)
    const phase = parseInt(f[4], 10)
    const date = f[5].trim()
    if (!Number.isFinite(stationId) || !Number.isFinite(year) || !/^\d{8}$/.test(date)) continue
    out.push({ stationId, year, phase, date })
  }
  return out
}

export function dwdDateToIso(d: string): string {
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLng = (bLng - aLng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(s))
}

/** Wählt je Art die nächstgelegene Station mit Blühbeginn im Jahr (rein, testbar). */
export function nearestBloomStart(
  plantId: string, records: DwdRecord[], stations: Map<number, DwdStation>,
  lat: number, lng: number, year: number, maxKm: number,
): DwdPhenology | null {
  let best: DwdPhenology | null = null
  for (const r of records) {
    if (r.phase !== BLUEHBEGINN_PHASE || r.year !== year) continue
    const st = stations.get(r.stationId)
    if (!st) continue
    const dist = haversineKm(lat, lng, st.lat, st.lng)
    if (dist > maxKm) continue
    if (!best || dist < best.distanceKm) {
      best = {
        plantId,
        plantName: PLANTS_BY_ID[plantId]?.name ?? plantId,
        bloomStart: dwdDateToIso(r.date),
        stationName: st.name,
        distanceKm: Math.round(dist),
      }
    }
  }
  return best
}

async function fetchLatin1(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new TextDecoder('latin1').decode(buf)
  } catch {
    return null
  }
}

/** Amtliche Blühbeginne (DWD) der nächsten Station je Art für das Jahr. */
export async function getDwdPhenology(lat: number, lng: number, year: number, maxKm = 150): Promise<DwdPhenology[]> {
  const stationsText = await fetchLatin1(STATIONS_URL)
  if (!stationsText) return []
  const stations = parseStations(stationsText)

  const results = await Promise.all(SPECIES.map(async (sp) => {
    const text = await fetchLatin1(sp.file)
    if (!text) return null
    return nearestBloomStart(sp.plantId, parseSpecies(text), stations, lat, lng, year, maxKm)
  }))

  return results
    .filter((r): r is DwdPhenology => r !== null)
    .sort((a, b) => a.bloomStart.localeCompare(b.bloomStart))
}
