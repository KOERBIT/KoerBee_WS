'use client'

interface BreedingBatchWithMetrics {
  larvaeGrafted: number | null
  larvaeAccepted: number | null
  queensHatched: number | null
  queensMated: number | null
}

export function BatchSummary({ batch }: { batch: BreedingBatchWithMetrics }) {
  const calculatePercentage = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null
    return Math.round((current / previous) * 100)
  }

  const pct1 = calculatePercentage(batch.larvaeAccepted, batch.larvaeGrafted)
  const pct2 = calculatePercentage(batch.queensHatched, batch.larvaeAccepted)
  const pct3 = calculatePercentage(batch.queensMated, batch.queensHatched)

  if (!batch.larvaeGrafted) return null

  return (
    <div className="mt-6 p-4 bg-violet-50 rounded-2xl border border-violet-100">
      <p className="text-[12px] font-semibold text-violet-600 uppercase tracking-wider mb-3">
        Überlebenschance
      </p>
      <div className="space-y-2 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-zinc-700">
            <span className="font-semibold">{batch.larvaeGrafted}</span> Larven umgelarvt
          </span>
        </div>

        {batch.larvaeAccepted !== null && (
          <>
            <div className="flex justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-violet-400">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-700">
                <span className="font-semibold">{batch.larvaeAccepted}</span> angenommen
              </span>
              {pct1 && <span className="text-violet-600 font-semibold">{pct1}%</span>}
            </div>
          </>
        )}

        {batch.queensHatched !== null && batch.larvaeAccepted !== null && (
          <>
            <div className="flex justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-violet-400">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-700">
                <span className="font-semibold">{batch.queensHatched}</span> geschlüpft
              </span>
              {pct2 && <span className="text-violet-600 font-semibold">{pct2}%</span>}
            </div>
          </>
        )}

        {batch.queensMated !== null && batch.queensHatched !== null && (
          <>
            <div className="flex justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-violet-400">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-700">
                <span className="font-semibold">{batch.queensMated}</span> begattet
              </span>
              {pct3 && <span className="text-violet-600 font-semibold">{pct3}%</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
