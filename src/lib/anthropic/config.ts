import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

export interface AnthropicConfig { apiKey: string; model: string }

export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'

/** Liefert den (entschlüsselten) Anthropic-Zugang: DB bevorzugt, Env als Fallback. */
export async function getAnthropicConfigForUser(userId: string): Promise<AnthropicConfig | null> {
  const c = await prisma.anthropicCredential.findUnique({ where: { userId } })
  if (c?.apiKey) {
    try {
      return { apiKey: decrypt(c.apiKey), model: c.model || DEFAULT_ANTHROPIC_MODEL }
    } catch {
      // Entschlüsselung fehlgeschlagen → Env-Fallback prüfen
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL }
  }
  return null
}
