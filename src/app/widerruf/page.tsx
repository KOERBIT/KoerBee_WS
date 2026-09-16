import LegalPage from '@/components/shop/LegalPage'

export const metadata = {
  title: 'Widerrufsbelehrung | KörBee Imkerei',
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

export default function WiderrufPage() {
  return (
    <LegalPage title="Widerrufsbelehrung">
      <Section title="Widerrufsrecht">
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen
          diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage
          ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter, der nicht
          der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.
        </p>
        <p style={{ marginTop: 12 }}>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer
          eindeutigen Erklärung (z.&nbsp;B. per E-Mail) über Ihren Entschluss,
          diesen Vertrag zu widerrufen, informieren:
        </p>
        <p
          style={{
            marginTop: 12,
            padding: '16px 20px',
            borderRadius: 12,
            background: 'var(--shop-panel-2)',
            border: '1px solid var(--shop-border)',
          }}
        >
          Thomas Körbe
          <br />
          Goethestr. 6
          <br />
          35625 Hüttenberg
          <br />
          E-Mail:{' '}
          <a
            href="mailto:Imker.KoerBee@gmx.de"
            style={{ color: 'var(--shop-accent)', textDecoration: 'none' }}
          >
            Imker.KoerBee@gmx.de
          </a>
        </p>
        <p style={{ marginTop: 12 }}>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung
          über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
          absenden.
        </p>
      </Section>

      <Section title="Folgen des Widerrufs">
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen,
          die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit
          Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie
          eine andere Art der Lieferung als die von uns angebotene, günstigste
          Standardlieferung gewählt haben), unverzüglich und spätestens binnen
          vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
          Ihren Widerruf dieses Vertrags bei uns eingegangen ist.
        </p>
        <p style={{ marginTop: 12 }}>
          Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie
          bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit
          Ihnen wurde ausdrücklich etwas anderes vereinbart. In keinem Fall
          werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
        </p>
        <p style={{ marginTop: 12 }}>
          Wir können die Rückzahlung verweigern, bis wir die Waren wieder
          zurückerhalten haben oder bis Sie den Nachweis erbracht haben, dass
          Sie die Waren zurückgesandt haben, je nachdem, welches der frühere
          Zeitpunkt ist.
        </p>
        <p style={{ marginTop: 12 }}>
          Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen
          vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf dieses
          Vertrags unterrichten, an uns zurückzusenden. Die Frist ist gewahrt,
          wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.
          Sie tragen die unmittelbaren Kosten der Rücksendung.
        </p>
      </Section>

      <Section title="Ausnahmen vom Widerrufsrecht">
        <p>
          Das Widerrufsrecht besteht nicht bei Verträgen zur Lieferung von
          Waren, die schnell verderben können oder deren Verfallsdatum schnell
          überschritten würde (§&nbsp;312g Abs.&nbsp;2 Nr.&nbsp;2 BGB). Ob
          diese Ausnahme auf ein konkretes Produkt zutrifft, wird bei der
          jeweiligen Produktbeschreibung angegeben.
        </p>
      </Section>

      <Section title="Muster-Widerrufsformular">
        <p style={{ marginBottom: 12 }}>
          Wenn Sie den Vertrag widerrufen wollen, können Sie dieses Formular
          ausfüllen und per E-Mail an uns senden:
        </p>
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 16,
            background: 'var(--shop-panel-2)',
            border: '1px solid var(--shop-border)',
          }}
        >
          <p style={{ marginBottom: 12 }}>
            An: Thomas Körbe, Goethestr. 6, 35625 Hüttenberg
            <br />
            E-Mail: Imker.KoerBee@gmx.de
          </p>
          <p style={{ marginBottom: 12 }}>
            Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
            Vertrag über den Kauf der folgenden Waren:
          </p>
          <p>
            Bestellt am: _______________
            <br />
            Erhalten am: _______________
            <br />
            Name des/der Verbraucher(s): _______________
            <br />
            Anschrift des/der Verbraucher(s): _______________
            <br />
            Datum: _______________
            <br />
            Unterschrift (nur bei Mitteilung auf Papier): _______________
          </p>
          <p
            style={{
              marginTop: 12,
              fontSize: '.82rem',
              fontStyle: 'italic',
            }}
          >
            (*) Unzutreffendes streichen.
          </p>
        </div>
      </Section>
    </LegalPage>
  )
}
