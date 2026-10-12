import Link from 'next/link'
import { RECIPES } from '@/lib/rezepte'

export default function RezeptePage() {
  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Rezepte</h1>
        <p className="text-zinc-500 text-[14px] mt-1">Anleitungen und Mengenrechner für Produkte aus dem Bienenvolk</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {RECIPES.map(r => (
          <Link
            key={r.slug}
            href={`/dashboard/rezepte/${r.slug}`}
            className="group bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wide">{r.category}</p>
            <h2 className="text-[16px] font-semibold text-zinc-900 mt-1 group-hover:text-amber-700 transition-colors">{r.title}</h2>
            <p className="text-[13px] text-zinc-500 mt-2">{r.description}</p>
            <p className="text-[12px] font-medium text-amber-600 mt-3">Zum Rezept →</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
