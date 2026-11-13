import { calcJars } from '@/lib/honey/jars'

const b = (grossKg: number, tareKg = 2) => ({ grossKg, tareKg })
const base = { buckets: [b(30)], bucketLossG: 200, vesselLossG: 300, jarG: 500, overG: 10, underG: 5 }

describe('calcJars', () => {
  it('zieht Eimer und Reste ab', () => {
    const r = calcJars(base)
    expect(r.netG).toBe(27500)
    expect(r.nominal).toEqual({ fillG: 500, jars: 55, leftoverG: 0 })
    expect(r.safe).toEqual({ fillG: 510, jars: 53, leftoverG: 470 })
    expect(r.max).toEqual({ fillG: 495, jars: 55, leftoverG: 275 })
  })
  it('summiert mehrere Eimer, Gefäßrest nur einmal', () => {
    const r = calcJars({ ...base, buckets: [b(30), b(20, 3)] })
    expect(r.netG).toBe(28000 + 17000 - 400 - 300)
  })
  it('liefert 0 bei leeren/ungültigen Werten', () => {
    expect(calcJars({ ...base, buckets: [b(1)] }).netG).toBe(0)
    expect(calcJars({ ...base, jarG: 0 }).nominal.jars).toBe(0)
    expect(calcJars({ ...base, buckets: [] }).safe.jars).toBe(0)
  })
})
