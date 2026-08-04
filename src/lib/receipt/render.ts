import { LOGO_DATA_URI, SIGNATURE_DATA_URI } from './assets'

// Erzeugt eine ausgefüllte Quittung (HTML) aus den Verkaufsdaten. Basiert auf der
// Vorlage Quittung_KoerBee.html, unterstützt aber beliebig viele Positionen.

export type PaymentMethod = 'bar' | 'ueberweisung'

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
}

export interface ReceiptData {
  number: number
  date: Date
  customerName?: string | null
  items: ReceiptItem[]
  total: number
  paymentMethod: PaymentMethod
  notes?: string | null
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function euro(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function qty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString('de-DE')
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Formatierte Quittungsnummer, z.B. "2026-0007". */
export function formatReceiptNumber(number: number, date: Date): string {
  return `${date.getFullYear()}-${String(number).padStart(4, '0')}`
}

const STYLE = `
  :root { --ink:#1a1a1a; --muted:#6b6b6b; --paper:#ffffff; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#e9e9e9;
    font-family:"Courier New", ui-monospace, "SFMono-Regular", Menlo, monospace; color:var(--ink); }
  .toolbar { max-width:480px; margin:16px auto 0; text-align:center; }
  .toolbar button { font-family:system-ui, sans-serif; font-size:14px; padding:10px 20px; border-radius:6px;
    border:1px solid #333; background:#1a1a1a; color:#fff; cursor:pointer; }
  .toolbar button:hover { background:#333; }
  .receipt { width:480px; margin:24px auto 48px; background:var(--paper); padding:28px 30px 24px;
    box-shadow:0 2px 10px rgba(0,0,0,.15); }
  .logo-wrap { text-align:center; margin-bottom:4px; }
  .logo-wrap img { height:110px; width:auto; }
  .addr { text-align:center; font-size:13px; line-height:1.5; margin-bottom:14px; }
  .addr .name { font-weight:bold; font-size:14px; }
  .dashed { border:none; border-top:1px dashed var(--ink); margin:14px 0; }
  .title { text-align:center; font-size:18px; font-weight:bold; letter-spacing:4px; margin:6px 0 16px; }
  .row { display:flex; justify-content:space-between; align-items:flex-end; font-size:13.5px; margin:10px 0; gap:12px; }
  .row .label { color:var(--muted); }
  .item { display:flex; justify-content:space-between; align-items:baseline; font-size:13.5px; margin:8px 0; gap:12px; }
  .item .name { flex:1; }
  .item .sum { white-space:nowrap; font-weight:bold; }
  .item .unit { font-size:11.5px; color:var(--muted); margin:-4px 0 8px; }
  .total-row { display:flex; justify-content:space-between; align-items:baseline; font-size:16px; font-weight:bold;
    margin:18px 0 6px; padding-top:10px; border-top:1px solid var(--ink); }
  .payment { font-size:13.5px; margin:16px 0 4px; }
  .payment .opt { margin-right:22px; }
  .box { display:inline-block; width:12px; height:12px; border:1px solid var(--ink); margin-right:6px;
    vertical-align:middle; text-align:center; line-height:11px; font-size:11px; }
  .box.checked { background:var(--ink); color:#fff; }
  .note { font-size:11px; color:var(--muted); text-align:center; margin:18px 0 6px; line-height:1.5; }
  .sign-block { margin-top:26px; display:flex; justify-content:flex-end; }
  .sign-box { width:220px; text-align:center; }
  .sign-box img { height:55px; width:auto; display:block; margin:4px auto 0; }
  .sign-caption { padding-top:4px; font-size:11px; color:var(--muted); }
  .footer-thanks { text-align:center; font-size:12.5px; margin-top:20px; font-style:italic; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .receipt { box-shadow:none; margin:0 auto; width:100%; max-width:480px; }
    @page { size:A4; margin:20mm; }
  }
`

export function renderSaleReceipt(data: ReceiptData): string {
  const nr = formatReceiptNumber(data.number, data.date)
  const barChecked = data.paymentMethod === 'bar'
  const ueChecked = data.paymentMethod === 'ueberweisung'

  const itemsHtml = data.items.map(it => `
        <div class="item">
          <span class="name">${qty(it.quantity)}× ${esc(it.name)}</span>
          <span class="sum">${euro(it.total)} €</span>
        </div>
        <div class="unit">${qty(it.quantity)} × ${euro(it.price)} € / Stück</div>`).join('')

  const customerHtml = data.customerName
    ? `\n        <div class="row"><span class="label">Kunde</span><span>${esc(data.customerName)}</span></div>`
    : ''

  const notesHtml = data.notes
    ? `\n        <div class="note">${esc(data.notes)}</div>`
    : ''

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quittung ${nr} – KörBee</title>
  <style>${STYLE}</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Drucken / als PDF speichern</button>
  </div>
  <div class="receipt">
    <div class="logo-wrap">
      <img src="${LOGO_DATA_URI}" alt="KörBee Logo">
    </div>
    <div class="addr">
      <div class="name">Thomas Körbe</div>
      <div>Goethestr. 6</div>
      <div>35625 Hüttenberg</div>
    </div>
    <hr class="dashed">
    <div class="title">QUITTUNG</div>
    <div class="row"><span><span class="label">Nr.</span> ${nr}</span><span><span class="label">Datum</span> ${fmtDate(data.date)}</span></div>${customerHtml}
    <hr class="dashed">
    ${itemsHtml}
    <div class="total-row"><span>Gesamtbetrag</span><span>${euro(data.total)} €</span></div>
    <div class="payment">
      <span class="opt"><span class="box${barChecked ? ' checked' : ''}">${barChecked ? '✕' : ''}</span>Bar</span>
      <span class="opt"><span class="box${ueChecked ? ' checked' : ''}">${ueChecked ? '✕' : ''}</span>Überweisung</span>
    </div>
    <hr class="dashed">
    <div class="note">
      Verkauf aus eigener Imkerei (Liebhaberei / Nebenerwerb, § 19 UStG) –<br>
      es wird keine Umsatzsteuer ausgewiesen.
    </div>${notesHtml}
    <div class="sign-block">
      <div class="sign-box">
        <img src="${SIGNATURE_DATA_URI}" alt="Unterschrift">
        <div class="sign-caption">Unterschrift</div>
      </div>
    </div>
    <div class="footer-thanks">Vielen Dank für deinen Einkauf!</div>
  </div>
</body>
</html>`
}
