import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🐝</div>
      <h1 className="text-xl font-semibold text-zinc-800">Seite nicht gefunden</h1>
      <p className="text-[14px] text-zinc-500 max-w-sm">
        Diese Seite gibt es leider nicht (mehr).
      </p>
      <Link
        href="/"
        className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors shadow-sm"
      >
        Zur Startseite
      </Link>
    </main>
  )
}
