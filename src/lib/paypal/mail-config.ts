import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { MailConfig } from './imap'

/** Liefert den (entschlüsselten) IMAP-Zugang des Nutzers oder null. */
export async function getMailConfigForUser(userId: string): Promise<MailConfig | null> {
  const c = await prisma.mailCredential.findUnique({ where: { userId } })
  if (!c) return null
  try {
    return { host: c.imapHost, port: c.imapPort, user: c.imapUser, password: decrypt(c.imapPassword) }
  } catch {
    return null
  }
}
