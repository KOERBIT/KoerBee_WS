import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kontakt | KörBee Imkerei',
  description: 'Kontaktieren Sie die Imkerei KörBee — Fragen zu Honig, Bestellungen und mehr.',
}

export default function KontaktLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
