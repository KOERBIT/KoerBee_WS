'use client'

import { useEffect } from 'react'

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl">🐝</div>
      <h1 className="text-xl font-semibold text-zinc-800">Da ist etwas schiefgelaufen</h1>
      <p className="text-[14px] text-zinc-500 max-w-sm">
        Die Seite konnte nicht geladen werden. Bitte versuche es erneut.
      </p>
      <button
        onClick={() => retry()}
        className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors shadow-sm"
      >
        Erneut versuchen
      </button>
    </main>
  )
}
