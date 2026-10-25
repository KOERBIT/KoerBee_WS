import { prisma } from '@/lib/prisma'

/** Prüft, dass colonyId/apiaryId (falls gesetzt) dem Nutzer gehören (IDOR-Schutz). */
export async function ownsTaskRefs(
  userId: string,
  colonyId: unknown,
  apiaryId: unknown
): Promise<boolean> {
  for (const v of [colonyId, apiaryId]) {
    if (v != null && typeof v !== 'string') return false
  }
  if (typeof colonyId === 'string' && colonyId) {
    const colony = await prisma.colony.findFirst({ where: { id: colonyId, apiary: { userId } }, select: { id: true } })
    if (!colony) return false
  }
  if (typeof apiaryId === 'string' && apiaryId) {
    const apiary = await prisma.apiary.findFirst({ where: { id: apiaryId, userId }, select: { id: true } })
    if (!apiary) return false
  }
  return true
}
