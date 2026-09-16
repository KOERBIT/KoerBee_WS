import LegalPage from '@/components/shop/LegalPage'

export const metadata = {
  title: 'Versand & Zahlung | KörBee Imkerei',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2
        style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--shop-ink)',
          marginBottom: 8,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function VersandPage() {
  return (
    <LegalPage title="Versand & Zahlung">
      <Section title="Versand">
        <p>
          Wir versenden innerhalb Deutschlands. Die Lieferung erfolgt mit DHL
          oder einem vergleichbaren Paketdienst. In der Regel beträgt die
          Lieferzeit 3–5 Werktage nach Zahlungseingang.
        </p>
        <div
          style={{
            marginTop: 16,
            padding: '16px 20px',
            borderRadius: 12,
            background: 'var(--shop-panel-2)',
            border: '1px solid var(--shop-border)',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--shop-ink)', marginBottom: 8 }}>
            Versandkosten
          </p>
          <p>
            Innerhalb Deutschlands: 5,90&nbsp;€
            <br />
            Ab einem Bestellwert von 50,00&nbsp;€: versandkostenfrei
          </p>
        </div>
        <p style={{ marginTop: 12 }}>
          Honig wird bruchsicher verpackt. Bitte beachten Sie, dass Honiggläser
          aus Sicherheitsgründen nicht an Packstationen geliefert werden können.
        </p>
      </Section>

      <Section title="Zahlungsarten">
        <p>Folgende Zahlungsarten stehen Ihnen zur Verfügung:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>PayPal</li>
          <li>Überweisung (Vorkasse)</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Bei Zahlung per Überweisung erhalten Sie die Bankverbindung mit der
          Bestellbestätigung per E-Mail. Die Ware wird nach Zahlungseingang
          versendet.
        </p>
      </Section>

      <Section title="Preise">
        <p>
          Alle angegebenen Preise sind Endpreise. Aufgrund der
          Kleinunternehmerregelung nach §&nbsp;19 UStG wird keine
          Umsatzsteuer erhoben und daher auch nicht ausgewiesen.
          Zusätzlich fallen die oben genannten Versandkosten an.
        </p>
        <p style={{ marginTop: 12 }}>
          Die Grundpreise (Preis pro kg) werden bei jedem Produkt angegeben.
        </p>
      </Section>

      <Section title="Selbstabholung">
        <p>
          Sie können Ihre Bestellung auch nach Absprache bei uns abholen.
          In diesem Fall entfallen die Versandkosten. Bitte kontaktieren Sie
          uns dazu per E-Mail:{' '}
          <a
            href="mailto:Imker.KoerBee@gmx.de"
            style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
          >
            Imker.KoerBee@gmx.de
          </a>
        </p>
      </Section>
    </LegalPage>
  )
}
