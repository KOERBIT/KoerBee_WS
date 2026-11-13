export const BUCKET_SIZES_KG = [20, 25, 40] as const

export interface BucketInput {
  grossKg: number         // Eimer mit Honig
  tareKg: number          // Eigengewicht dieses leeren Eimers
}

export interface JarInput {
  buckets: BucketInput[]
  bucketLossG: number     // Rest, der je Eimer hängen bleibt
  vesselLossG: number     // Rest im Abfüllgefäß (einmalig)
  jarG: number            // Nennfüllmenge je Glas
  overG: number           // Zugabe je Glas (g), die du maximal zuviel füllst
  underG: number          // Abzug je Glas (g), die du maximal zuwenig füllst
}

export interface JarScenario { fillG: number; jars: number; leftoverG: number }

export interface JarResult {
  netG: number
  buckets: number
  nominal: JarScenario   // exakt Nenninhalt
  safe: JarScenario      // Nenninhalt + Zugabe (sicher nie zu wenig)
  max: JarScenario       // Nenninhalt - Abzug (maximal viele Gläser)
}

const scenario = (netG: number, fillG: number): JarScenario => {
  const jars = fillG > 0 ? Math.max(0, Math.floor(netG / fillG)) : 0
  return { fillG, jars, leftoverG: Math.max(0, Math.round((netG - jars * fillG) * 10) / 10) }
}

export function calcJars(i: JarInput): JarResult {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)
  const weighed = i.buckets.filter(b => clean(b.grossKg) > 0)
  const honeyG = weighed.reduce((s, b) => s + Math.max(0, b.grossKg - clean(b.tareKg)) * 1000, 0)
  const lossG = weighed.length * clean(i.bucketLossG) + (weighed.length ? clean(i.vesselLossG) : 0)
  const netG = Math.max(0, Math.round((honeyG - lossG) * 10) / 10)
  const jar = clean(i.jarG)
  return {
    netG,
    buckets: weighed.length,
    nominal: scenario(netG, jar),
    safe: scenario(netG, jar + clean(i.overG)),
    max: scenario(netG, Math.max(0, jar - clean(i.underG))),
  }
}
