import LegalPage from '@/components/shop/LegalPage'

export const metadata = {
  title: 'Kontakt | KörBee Imkerei',
}

export default function KontaktPage() {
  return (
    <LegalPage title="Kontakt">
      <p style={{ fontSize: '1.05rem', marginBottom: 24 }}>
        Sie haben Fragen zu unseren Produkten, Ihrer Bestellung oder möchten
        Honig abholen? Schreiben Sie uns gerne!
      </p>

      <div
        style={{
          padding: '24px 28px',
          borderRadius: 16,
          background: 'var(--shop-panel-2)',
          border: '1px solid var(--shop-border)',
        }}
      >
        <p style={{ fontWeight: 700, color: 'var(--shop-ink)', fontSize: '1.1rem', marginBottom: 12 }}>
          KörBee – Imkerei Thomas Körbe
        </p>
        <p>
          Goethestr. 6
          <br />
          35625 Hüttenberg
        </p>
        <p style={{ marginTop: 16 }}>
          E-Mail:{' '}
          <a
            href="mailto:Imker.KoerBee@gmx.de"
            style={{
              color: 'var(--shop-accent)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Imker.KoerBee@gmx.de
          </a>
        </p>
      </div>

      <p style={{ marginTop: 24 }}>
        Wir antworten in der Regel innerhalb von 1–2 Werktagen.
      </p>
    </LegalPage>
  )
}
