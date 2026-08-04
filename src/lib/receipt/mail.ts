import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// SMTP-Versand für Quittungen. Nutzt die im MailCredential hinterlegten Zugangsdaten
// (bei GMX identisch zu IMAP), Host/Port getrennt konfigurierbar.

export interface SmtpConfig {
  host: string
  port: number
  user: string
  password: string
}

export async function getSmtpConfigForUser(userId: string): Promise<SmtpConfig | null> {
  const c = await prisma.mailCredential.findUnique({ where: { userId } })
  if (!c || !c.imapUser || !c.imapPassword) return null
  try {
    return { host: c.smtpHost, port: c.smtpPort, user: c.imapUser, password: decrypt(c.imapPassword) }
  } catch {
    return null
  }
}

export interface SendReceiptArgs {
  cfg: SmtpConfig
  to: string
  subject: string
  html: string
  fileName: string
  senderName?: string
}

/** Verschickt die Quittung als HTML-Mail inkl. HTML-Datei-Anhang. */
export async function sendReceiptMail(args: SendReceiptArgs): Promise<void> {
  const { cfg, to, subject, html, fileName, senderName } = args
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465, // 465 = SSL, sonst STARTTLS (587)
    requireTLS: cfg.port !== 465,
    auth: { user: cfg.user, pass: cfg.password },
  })

  await transporter.sendMail({
    from: senderName ? `"${senderName}" <${cfg.user}>` : cfg.user,
    to,
    subject,
    text: 'Im Anhang und untenstehend findest du deine Quittung. Vielen Dank für deinen Einkauf!',
    html,
    attachments: [{ filename: fileName, content: html, contentType: 'text/html; charset=utf-8' }],
  })
}
