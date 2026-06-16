import { Plant } from './types'

const API = 'https://api.inaturalist.org/v1/observations'

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
}

async function isObservedNearby(
  taxon: string, lat: number, lng: number, radiusKm: number, signal: AbortSignal,
): Promise<boolean> {
  const params = new URLSearchParams({
    taxon_name: taxon,
    lat: String(lat),
    lng: String(lng),
    radius: String(Math.max(5, Math.min(50, radiusKm))),
    d1: daysAgoIso(28),
    per_page: '0',
    quality_grade: 'research',
  })
  const res = await fetch(`${API}?${params}`, { signal, next: { revalidate: 21600 } })
  if (!res.ok) return false
  const data = await res.json()
  return (data?.total_results ?? 0) > 0
}

/**
 * Prüft per iNaturalist, welche der übergebenen (blühenden) Pflanzen in den
 * letzten 4 Wochen im Umkreis tatsächlich beobachtet wurden. Liefert die
 * Menge verifizierter Pflanzen-IDs. Bei Fehlern/Timeout: leere Menge.
 */
export async function verifyBlooms(
  lat: number, lng: number, plants: Plant[], radiusKm = 10,
): Promise<Set<string>> {
  const verified = new Set<string>()
  const withTaxa = plants.filter(p => p.taxon)
  if (withTaxa.length === 0) return verified

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4500)
  try {
    const results = await Promise.allSettled(
      withTaxa.map(async p => ({
        id: p.id,
        ok: await isObservedNearby(p.taxon!, lat, lng, radiusKm, controller.signal),
      })),
    )
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.ok) verified.add(r.value.id)
    }
  } catch {
    // Netzwerk/Timeout – ohne Verifizierung weiter
  } finally {
    clearTimeout(timeout)
  }
  return verified
}
