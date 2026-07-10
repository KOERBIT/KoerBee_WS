import { buildLocationForecast } from '@/lib/tracht/forecast'
import { computeGTS } from '@/lib/tracht/phenology'
import type { WeatherResult } from '@/lib/tracht/weather'

function weather(now: Date): WeatherResult {
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(now.getTime() + i * 86400000).toISOString().slice(0, 10),
    tempMean: 22, tempMax: 26, tempMin: 16, humidity: 65, clouds: 30,
    precipitation: 0, wind: 5, weathercode: 1, sunFraction: 0.6,
  }))
  return { source: 'Open-Meteo', elevation: 200, days, current: null }
}

const loc = { id: 'a1', name: 'Test', lat: 50.5, lng: 8.6, flightRadius: 5 }
const now = new Date('2026-07-01T12:00:00Z') // Winterlinde blüht laut Kalender

describe('Trachtbeginn/-ende überschreibt das Modell', () => {
  it('zeigt Winterlinde ohne Record', () => {
    const f = buildLocationForecast(loc, weather(now), { now })
    expect(f.currentBloom.some(p => p.plantId === 'winterlinde')).toBe(true)
  })

  it('entfernt beendete Tracht (Record-Ende in der Vergangenheit)', () => {
    const f = buildLocationForecast(loc, weather(now), {
      now, bloomRecords: [{ plantId: 'winterlinde', startDate: null, endDate: '2026-06-28' }],
    })
    expect(f.currentBloom.some(p => p.plantId === 'winterlinde')).toBe(false)
    expect(f.nextBloom.some(p => p.plantId === 'winterlinde')).toBe(false)
  })

  it('markiert eigene Angabe (viaRecord) und nutzt das gemeldete Startdatum', () => {
    const f = buildLocationForecast(loc, weather(now), {
      now, bloomRecords: [{ plantId: 'winterlinde', startDate: '2026-06-20', endDate: null }],
    })
    const wl = f.currentBloom.find(p => p.plantId === 'winterlinde')
    expect(wl?.viaRecord).toBe(true)
    expect(wl?.bloomStartDate).toBe('2026-06-20')
  })

  it('ergänzt eine gemeldete Pflanze, die das Modell noch nicht blühen sieht', () => {
    // Goldrute blüht erst ab August – gemeldeter Beginn zieht sie in die aktuelle Tracht
    const f = buildLocationForecast(loc, weather(now), {
      now, bloomRecords: [{ plantId: 'goldrute', startDate: '2026-06-30', endDate: null }],
    })
    expect(f.currentBloom.some(p => p.plantId === 'goldrute')).toBe(true)
  })
})

describe('computeGTS liefert einen Verlauf', () => {
  it('Serie so lang wie die Eingabe, letzter Wert = Gesamt-GTS', () => {
    const days = Array.from({ length: 60 }, (_, i) => ({
      date: new Date(Date.UTC(2026, 2, 1) + i * 86400000).toISOString().slice(0, 10),
      mean: 5,
    }))
    const r = computeGTS(days)
    expect(r.series).toHaveLength(60)
    expect(r.series[r.series.length - 1].gts).toBe(r.gts)
    expect(r.series[0].gts).toBeLessThan(r.gts)
  })
})
