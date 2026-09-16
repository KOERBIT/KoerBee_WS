import LegalPage from '@/components/shop/LegalPage'

export const metadata = {
  title: 'Impressum | KörBee Imkerei',
}

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <p style={{ color: 'var(--shop-ink)', fontWeight: 600, marginBottom: 4 }}>
        KörBee – Imkerei Thomas Körbe
      </p>
      <p>
        Thomas Körbe
        <br />
        Goethestr. 6
        <br />
        35625 Hüttenberg
        <br />
        Deutschland
      </p>

      <h2
        style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--shop-ink)',
          marginTop: 32,
          marginBottom: 8,
        }}
      >
        Kontakt
      </h2>
      <p>
        E-Mail:{' '}
        <a
          href="mailto:Imker.KoerBee@gmx.de"
          style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
        >
          Imker.KoerBee@gmx.de
        </a>
      </p>

      <h2
        style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--shop-ink)',
          marginTop: 32,
          marginBottom: 8,
        }}
      >
        Verantwortlich für den Inhalt
      </h2>
      <p>
        Thomas Körbe
        <br />
        Goethestr. 6
        <br />
        35625 Hüttenberg
      </p>

      <h2
        style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--shop-ink)',
          marginTop: 32,
          marginBottom: 8,
        }}
      >
        Rechtsgrundlage
      </h2>
      <p>§ 5 Digitale-Dienste-Gesetz (DDG)</p>

      <h2
        style={{
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--shop-ink)',
          marginTop: 32,
          marginBottom: 8,
        }}
      >
        Hinweis
      </h2>
      <p>
        Die Imkerei KörBee ist ein landwirtschaftlicher Urproduktionsbetrieb.
        Es werden ausschließlich eigene Imkereiprodukte direkt an Endverbraucher
        verkauft.
      </p>
    </LegalPage>
  )
}
