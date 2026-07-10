import { heatBloomEnd, isHeatSensitive } from '@/lib/tracht/heat'

function days(entries: [string, number][]) {
  return entries.map(([date, max]) => ({ date, max }))
}

describe('heatBloomEnd', () => {
  const start = '2026-06-25'
  const end = '2026-07-20'

  it('beendet hitzeempfindliche Tracht ~2 Tage nach einem 37°C-Tag', () => {
    const dm = days([['2026-06-26', 30], ['2026-06-27', 37], ['2026-06-28', 34]])
    expect(heatBloomEnd('winterlinde', start, end, dm, '2026-07-10')).toBe('2026-06-29')
  })

  it('beendet nach 3 Hitzetagen (≥32°C) in 5 Tagen', () => {
    const dm = days([['2026-06-26', 33], ['2026-06-27', 32], ['2026-06-28', 33]])
    expect(heatBloomEnd('winterlinde', start, end, dm, '2026-07-10')).toBe('2026-06-30')
  })

  it('keine Verkürzung ohne Hitze', () => {
    const dm = days([['2026-06-26', 25], ['2026-06-27', 27], ['2026-06-28', 24]])
    expect(heatBloomEnd('winterlinde', start, end, dm, '2026-07-10')).toBeNull()
  })

  it('hitzetolerante Trachten sind ausgenommen', () => {
    const dm = days([['2026-06-27', 38]])
    expect(heatBloomEnd('phacelia', '2026-06-15', '2026-09-15', dm, '2026-07-10')).toBeNull()
    expect(heatBloomEnd('natternkopf', '2026-06-01', '2026-09-10', dm, '2026-07-10')).toBeNull()
  })

  it('isHeatSensitive kennzeichnet Linde als empfindlich, Honigtau nicht', () => {
    expect(isHeatSensitive('winterlinde')).toBe(true)
    expect(isHeatSensitive('honigtau')).toBe(false)
  })
})
