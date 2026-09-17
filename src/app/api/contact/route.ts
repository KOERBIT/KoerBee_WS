import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { getSmtpConfigForUser } from '@/lib/receipt/mail'

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Alle Felder sind erforderlich.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 })
    }

    if (message.length > 5000 || name.length > 200 || subject.length > 200) {
      return NextResponse.json({ error: 'Nachricht zu lang.' }, { status: 400 })
    }

    // Use the admin user's stored SMTP credentials
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
    if (!admin) {
      return NextResponse.json({ error: 'Kein Admin-Konto konfiguriert.' }, { status: 500 })
    }

    const cfg = await getSmtpConfigForUser(admin.id)
    if (!cfg) {
      return NextResponse.json({ error: 'E-Mail-Versand nicht konfiguriert.' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      requireTLS: cfg.port !== 465,
      auth: { user: cfg.user, pass: cfg.password },
    })

    await transporter.sendMail({
      from: `"KörBee Kontaktformular" <${cfg.user}>`,
      replyTo: `"${name}" <${email}>`,
      to: cfg.user,
      subject: `[KörBee Kontakt] ${subject}`,
      text: `Neue Nachricht über das Kontaktformular:\n\nName: ${name}\nE-Mail: ${email}\nBetreff: ${subject}\n\n${message}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px;">
          <h2 style="color: #d97706;">Neue Kontaktanfrage</h2>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 16px;">
            <tr><td style="padding: 8px 12px; font-weight: 600; color: #71717a;">Name</td><td style="padding: 8px 12px;">${name}</td></tr>
            <tr style="background: #fafafa;"><td style="padding: 8px 12px; font-weight: 600; color: #71717a;">E-Mail</td><td style="padding: 8px 12px;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px 12px; font-weight: 600; color: #71717a;">Betreff</td><td style="padding: 8px 12px;">${subject}</td></tr>
          </table>
          <div style="background: #fafafa; border-radius: 12px; padding: 16px 20px; white-space: pre-wrap; line-height: 1.6;">${message}</div>
          <p style="margin-top: 16px; font-size: 12px; color: #a1a1aa;">Gesendet über das KörBee Kontaktformular</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'E-Mail konnte nicht gesendet werden.' }, { status: 500 })
  }
}
