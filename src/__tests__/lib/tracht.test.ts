import {
  rangeFactor, temperatureFactor, rainFactor, windFactor, nektarIndex, rating,
} from '@/lib/tracht/nektar'
import { isBlooming, getCurrentBloom, getNextBloom, bloomPhase } from '@/lib/tracht/bloom'
import { PLANTS_BY_ID } from '@/lib/tracht/plants'
import { WeatherDay } from '@/lib/tracht/types'

const linde = PLANTS_BY_ID['winterlinde']
const raps = PLANTS_BY_ID['raps']

function day(p: Partial<WeatherDay>): WeatherDay {
  return {
    date: '2026-06-20', tempMean: 23, tempMax: 26, tempMin: 18,
    humidity: 70, clouds: 0, precipitation: 0, wind: 0, weathercode: 0, sunFraction: 1,
    ...p,
  }
}

describe('rangeFactor', () => {
  it('ist 1 im Optimum', () => expect(rangeFactor(23, { min: 18, opt: 23, max: 28 })).toBe(1))
  it('fällt zum Rand weich ab', () => expect(rangeFactor(28, { min: 18, opt: 23, max: 28 })).toBeCloseTo(0.5))
  it('ist 0 außerhalb des Bereichs', () => expect(rangeFactor(35, { min: 18, opt: 23, max: 28 })).toBe(0))
})

describe('temperatureFactor', () => {
  it('optimal bei opt-Temperatur', () => expect(temperatureFactor(23, linde)).toBe(1))
  it('0 wenn zu kalt', () => expect(temperatureFactor(5, linde)).toBe(0))
})

describe('rainFactor', () => {
  it('leichter Regen ist ideal für regenliebende Pflanzen', () => expect(rainFactor(2, true)).toBe(1))
  it('trocken = neutral für regenliebende Pflanzen', () => expect(rainFactor(0, true)).toBe(0.65))
  it('Regen reduziert bei nässeempfindlichen Pflanzen', () => expect(rainFactor(8, false)).toBe(0))
})

describe('windFactor', () => {
  it('1 bei Windstille', () => expect(windFactor(0, linde)).toBe(1))
  it('0 bei/über Maximalwind', () => expect(windFactor(linde.maxWind, linde)).toBe(0))
})

describe('nektarIndex & rating', () => {
  it('liefert 100 bei perfekten Bedingungen', () => {
    expect(nektarIndex(day({ precipitation: 2 }), linde)).toBe(100)
  })
  it('ist niedrig bei schlechtem Wetter', () => {
    const bad = day({ tempMean: 5, humidity: 95, sunFraction: 0, clouds: 100, precipitation: 20, wind: 30 })
    expect(nektarIndex(bad, linde)).toBeLessThan(25)
  })
  it('rating-Schwellen', () => {
    expect(rating(95)).toContain('Hervorragend')
    expect(rating(80)).toContain('Sehr gut')
    expect(rating(60)).toContain('Gut')
    expect(rating(30)).toBe('Befriedigend')
    expect(rating(10)).toBe('Schwach')
  })
})

describe('Blühkalender', () => {
  const midJune = new Date('2026-06-20T12:00:00Z')

  it('Linde blüht Mitte Juni', () => expect(isBlooming(linde, midJune)).toBe(true))
  it('Raps blüht Mitte Juni nicht', () => expect(isBlooming(raps, midJune)).toBe(false))
  it('getCurrentBloom enthält Linde', () => {
    expect(getCurrentBloom(midJune).some(c => c.plant.id === 'winterlinde')).toBe(true)
  })
  it('Phase im mittleren Blühfenster ist Hochblüte', () => {
    expect(bloomPhase(linde, new Date('2026-06-22T12:00:00Z'))).toBe('Hochblüte')
  })
  it('getNextBloom ist nach daysUntilStart sortiert', () => {
    const next = getNextBloom(midJune)
    for (let i = 1; i < next.length; i++) {
      expect(next[i].daysUntilStart).toBeGreaterThanOrEqual(next[i - 1].daysUntilStart)
    }
  })
})
