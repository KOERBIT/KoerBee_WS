import nodemailer from 'nodemailer'
import { getSmtpConfigForUser } from '@/lib/receipt/mail'
import { t, Locale } from './i18n'

interface SendShopEmailArgs {
  userId: string
  to: string
  locale: Locale
  subject: string
  html: string
}

export async function sendShopEmail(args: SendShopEmailArgs): Promise<void> {
  const cfg = await getSmtpConfigForUser(args.userId)
  if (!cfg) {
    console.error('Shop mail: no SMTP config for user', args.userId)
    return
  }
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.port !== 465,
    auth: { user: cfg.user, pass: cfg.password },
  })
  await transporter.sendMail({
    from: cfg.user,
    to: args.to,
    subject: args.subject,
    html: args.html,
  })
}

interface PreOrderForEmail {
  id: string
  createdAt: Date
  items: Array<{ product: { name: string }; quantity: number; priceAtOrder: number }>
  shopCustomer: { email: string; name: string; locale: string }
}

const STATUS_EMAIL_KEYS: Record<string, string> = {
  PENDING: 'shop.email.order_received.subject',
  CONFIRMED: 'shop.email.order_confirmed.subject',
  READY: 'shop.email.order_ready.subject',
  CANCELLED: 'shop.email.order_cancelled.subject',
}

export async function sendOrderStatusEmail(args: {
  userId: string
  order: PreOrderForEmail
  newStatus: string
}): Promise<void> {
  const { userId, order, newStatus } = args
  const locale = (order.shopCustomer.locale === 'en' ? 'en' : 'de') as Locale
  const subjectKey = STATUS_EMAIL_KEYS[newStatus]
  if (!subjectKey) return // PICKED_UP has no email

  const subject = t(locale, subjectKey)
  const statusLabel = t(locale, `shop.status.${newStatus}`)
  const total = order.items.reduce((s, i) => s + i.quantity * i.priceAtOrder, 0)
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 8px">${i.product.name}</td><td style="padding:4px 8px">${i.quantity}</td><td style="padding:4px 8px">${i.priceAtOrder.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td></tr>`
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#f59e0b">${subject}</h2>
      <p>${locale === 'de' ? 'Hallo' : 'Hello'} ${order.shopCustomer.name},</p>
      <p><strong>Status:</strong> ${statusLabel}</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr style="background:#f5f5f5"><th style="padding:4px 8px;text-align:left">${locale === 'de' ? 'Produkt' : 'Product'}</th><th style="padding:4px 8px">${t(locale, 'shop.product.quantity')}</th><th style="padding:4px 8px">${t(locale, 'shop.product.price')}</th></tr>
        ${itemsHtml}
      </table>
      <p><strong>${t(locale, 'shop.cart.total')}:</strong> ${total.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
      <p style="color:#78716c;font-size:14px">${t(locale, 'shop.pickup')}</p>
    </div>
  `

  await sendShopEmail({ userId, to: order.shopCustomer.email, locale, subject, html })
}

export async function sendVerificationEmail(args: {
  userId: string
  to: string
  locale: Locale
  token: string
  shopBaseUrl: string
}): Promise<void> {
  const { userId, to, locale, token, shopBaseUrl } = args
  const subject = t(locale, 'shop.email.verify.subject')
  const link = `${shopBaseUrl}/api/shop/auth/verify-email?token=${token}`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#f59e0b">${subject}</h2>
      <p>${locale === 'de'
        ? 'Bitte klicke auf den folgenden Link, um deine E-Mail-Adresse zu bestätigen:'
        : 'Please click the following link to verify your email address:'}</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px">${locale === 'de' ? 'E-Mail bestätigen' : 'Verify email'}</a></p>
    </div>
  `
  await sendShopEmail({ userId, to, locale, subject, html })
}

export async function sendPasswordResetEmail(args: {
  userId: string
  to: string
  locale: Locale
  token: string
  shopBaseUrl: string
}): Promise<void> {
  const { userId, to, locale, token, shopBaseUrl } = args
  const subject = t(locale, 'shop.email.reset.subject')
  const link = `${shopBaseUrl}/shop/passwort-vergessen?token=${token}`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#f59e0b">${subject}</h2>
      <p>${locale === 'de'
        ? 'Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:'
        : 'Click the following link to reset your password:'}</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:8px">${locale === 'de' ? 'Passwort zurücksetzen' : 'Reset password'}</a></p>
    </div>
  `
  await sendShopEmail({ userId, to, locale, subject, html })
}
