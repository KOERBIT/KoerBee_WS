import LegalPage from '@/components/shop/LegalPage'

export const metadata = {
  title: 'Datenschutzerklärung | KörBee Imkerei',
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

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <p>
        Verantwortlicher im Sinne der DSGVO:
        <br />
        Thomas Körbe, Goethestr. 6, 35625 Hüttenberg
        <br />
        E-Mail:{' '}
        <a
          href="mailto:Imker.KoerBee@gmx.de"
          style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
        >
          Imker.KoerBee@gmx.de
        </a>
      </p>

      <Section title="1. Webhosting und Server-Logs">
        <p>
          Diese Website wird bei Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA
          91789, USA gehostet. Beim Besuch der Website werden automatisch
          technische Daten in Server-Logfiles erfasst: IP-Adresse, Browsertyp,
          Betriebssystem, Referrer-URL, Uhrzeit des Zugriffs. Diese Daten sind
          für den technischen Betrieb erforderlich und werden nicht mit anderen
          Datenquellen zusammengeführt. Rechtsgrundlage ist Art.&nbsp;6
          Abs.&nbsp;1 lit.&nbsp;f DSGVO (berechtigtes Interesse an einem
          sicheren und stabilen Webauftritt). Die Datenübertragung in die USA
          erfolgt auf Grundlage der EU-Standardvertragsklauseln (SCCs).
          Datenschutzerklärung von Vercel:{' '}
          <a
            href="https://vercel.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
          >
            https://vercel.com/legal/privacy-policy
          </a>
        </p>
      </Section>

      <Section title="2. Bestellabwicklung">
        <p>
          Wenn Sie bei uns bestellen, erheben wir die für die Abwicklung
          erforderlichen Daten: Name, Anschrift, E-Mail-Adresse und
          Zahlungsinformationen. Diese Daten werden ausschließlich zur
          Vertragserfüllung verwendet (Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b
          DSGVO) und nach Ablauf der gesetzlichen Aufbewahrungsfristen
          (in der Regel 6 Jahre nach § 257 HGB bzw. 10 Jahre nach § 147 AO)
          gelöscht.
        </p>
      </Section>

      <Section title="3. Zahlungsanbieter">
        <p>
          Für die Zahlungsabwicklung nutzen wir PayPal (Europe) S.à r.l. et
          Cie, S.C.A. Ihre Zahlungsdaten werden direkt vom Anbieter verarbeitet
          und nicht auf unseren Servern gespeichert. Rechtsgrundlage ist
          Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO (Vertragserfüllung).
          Datenschutzerklärung von PayPal:{' '}
          <a
            href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
          >
            https://www.paypal.com/de/webapps/mpp/ua/privacy-full
          </a>
        </p>
      </Section>

      <Section title="4. Versanddienstleister">
        <p>
          Zur Zustellung Ihrer Bestellung geben wir Ihren Namen und Ihre
          Lieferanschrift an den beauftragten Versanddienstleister weiter. Dies
          erfolgt ausschließlich zum Zweck der Vertragserfüllung (Art.&nbsp;6
          Abs.&nbsp;1 lit.&nbsp;b DSGVO).
        </p>
      </Section>

      <Section title="5. E-Mail-Versand">
        <p>
          Nach einer Bestellung erhalten Sie eine Bestellbestätigung per E-Mail.
          Ihre E-Mail-Adresse wird ausschließlich für die Kommunikation im
          Rahmen des Bestellvorgangs verwendet.
        </p>
      </Section>

      <Section title="6. Kontaktformular">
        <p>
          Wenn Sie uns über das Kontaktformular eine Anfrage senden, werden die
          von Ihnen eingegebenen Daten (Name, E-Mail-Adresse, Betreff,
          Nachricht) verarbeitet, um Ihre Anfrage zu beantworten. Die
          Rechtsgrundlage ist Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;b DSGVO
          (vorvertragliche Maßnahmen) bzw. lit.&nbsp;f DSGVO (berechtigtes
          Interesse an der Beantwortung von Anfragen). Die Übertragung erfolgt
          per SMTP an unsere E-Mail-Adresse. Eine Weitergabe an Dritte findet
          nicht statt. Die Daten werden nach Abschluss der Anfrage gelöscht,
          sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          Diese Website verwendet ausschließlich technisch notwendige Cookies,
          die für den Betrieb des Shops erforderlich sind (z.&nbsp;B.
          Warenkorb, Login-Session). Es werden keine Tracking- oder
          Analyse-Cookies eingesetzt. Rechtsgrundlage ist Art.&nbsp;6
          Abs.&nbsp;1 lit.&nbsp;f DSGVO. Zusätzlich wird ein Cookie
          (<code>shop-locale</code>) gesetzt, um Ihre Spracheinstellung zu
          speichern (Speicherdauer: 1 Jahr). Dieses Cookie ist technisch
          erforderlich.
        </p>
      </Section>

      <Section title="8. Drittdienste">
        <p>
          Wir setzen keine Analyse- oder Tracking-Tools (wie z.&nbsp;B. Google
          Analytics) ein. Es findet kein Profiling und keine Weitergabe von
          Daten zu Werbezwecken statt. Google Fonts und JavaScript-Bibliotheken
          werden selbst gehostet; es erfolgen keine Anfragen an externe CDNs.
        </p>
      </Section>

      <Section title="9. Ihre Rechte">
        <p>Sie haben jederzeit das Recht auf:</p>
        <ul style={{ paddingLeft: 20, marginTop: 8 }}>
          <li>Auskunft über Ihre gespeicherten Daten (Art.&nbsp;15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art.&nbsp;16 DSGVO)</li>
          <li>Löschung Ihrer Daten (Art.&nbsp;17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art.&nbsp;18 DSGVO)</li>
          <li>Datenübertragbarkeit (Art.&nbsp;20 DSGVO)</li>
          <li>Widerspruch gegen die Verarbeitung (Art.&nbsp;21 DSGVO)</li>
        </ul>
        <p style={{ marginTop: 12 }}>
          Wenden Sie sich dazu an:{' '}
          <a
            href="mailto:Imker.KoerBee@gmx.de"
            style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
          >
            Imker.KoerBee@gmx.de
          </a>
        </p>
        <p style={{ marginTop: 8 }}>
          Sie haben zudem das Recht, sich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren. Zuständige Behörde für
          Hessen ist der Hessische Beauftragte für Datenschutz und
          Informationsfreiheit (HBDI), Postfach 3163, 65021 Wiesbaden,{' '}
          <a
            href="https://datenschutz.hessen.de"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
          >
            https://datenschutz.hessen.de
          </a>
        </p>
      </Section>
    </LegalPage>
  )
}
