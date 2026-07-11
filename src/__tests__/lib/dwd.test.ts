import { parseStations, parseSpecies, dwdDateToIso, haversineKm, nearestBloomStart } from '@/lib/tracht/dwd'

const STATIONS = [
  'Stations_id;Stationsname       ;geograph.Breite;geograph.Laenge;Stationshoehe;eor;',
  '07592     ;Gießen             ;    50.5900    ;  8.6500      ;   150 ;eor;',
  '07999     ;Hamburg            ;    53.5500    ;  10.0000     ;    10 ;eor;',
].join('\n')

const SOMMERLINDE = [
  'Stations_id; Referenzjahr; Qualitaetsniveau; Objekt_id; Phase_id; Eintrittsdatum;Eintrittsdatum_QB; Jultag;eor;',
  '        7592;          2026;              1;              130;              5;       20260620;                1;    171;eor;',
  '        7999;          2026;              1;              130;              5;       20260625;                1;    176;eor;',
  '        7592;          2025;              1;              130;              5;       20250602;                1;    153;eor;',
].join('\n')

describe('DWD-Parser', () => {
  it('parseStations liest Id + Koordinaten', () => {
    const s = parseStations(STATIONS)
    expect(s.size).toBe(2)
    expect(s.get(7592)).toMatchObject({ name: 'Gießen', lat: 50.59, lng: 8.65 })
  })

  it('parseSpecies liest Phase & Datum', () => {
    const r = parseSpecies(SOMMERLINDE)
    expect(r).toHaveLength(3)
    expect(r[0]).toMatchObject({ stationId: 7592, year: 2026, phase: 5, date: '20260620' })
  })

  it('dwdDateToIso', () => expect(dwdDateToIso('20260620')).toBe('2026-06-20'))

  it('haversineKm ~10 km Gießen↔Standort', () => {
    expect(haversineKm(50.5, 8.6, 50.59, 8.65)).toBeLessThan(20)
  })

  it('nearestBloomStart wählt die nächste Station im Jahr', () => {
    const stations = parseStations(STATIONS)
    const records = parseSpecies(SOMMERLINDE)
    const r = nearestBloomStart('sommerlinde', records, stations, 50.5, 8.6, 2026, 150)
    expect(r?.bloomStart).toBe('2026-06-20')
    expect(r?.stationName).toBe('Gießen')
    expect(r?.distanceKm).toBeLessThan(20)
  })

  it('nearestBloomStart ignoriert Stationen außerhalb maxKm', () => {
    const stations = parseStations(STATIONS)
    const records = parseSpecies(SOMMERLINDE).filter(r => r.stationId === 7999)
    expect(nearestBloomStart('sommerlinde', records, stations, 50.5, 8.6, 2026, 50)).toBeNull()
  })
})
