import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Imkerei-Shop | KörBee',
  description: 'Frische Imkereiprodukte vorbestellen — direkt vom Imker',
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-amber-50/30 flex flex-col">
      {children}
    </div>
  )
}
