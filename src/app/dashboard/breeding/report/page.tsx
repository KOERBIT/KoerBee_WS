'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { BreedingReportView } from '@/components/BreedingReportView'

export default function BreedingReportPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const lineIds = searchParams.get('lineIds')

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!lineIds) {
      setError('Keine Zuchtreihen ausgewählt')
      setLoading(false)
      return
    }

    const loadReport = async () => {
      try {
        const res = await fetch(`/api/breeding/report?lineIds=${lineIds}`)
        if (!res.ok) throw new Error('Fehler beim Laden des Reports')
        const reportData = await res.json()
        setData(reportData)
      } catch (err) {
        setError('Fehler beim Laden des Reports')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [lineIds])

  if (loading) {
    return (
      <div className="px-8 py-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-amber-200 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-8 py-8 max-w-6xl">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
          <p className="text-rose-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[13px] font-medium"
          >
            Zurück
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Zucht-Report</h1>
          <p className="text-zinc-500 text-[14px] mt-1">
            {data?.batches.length || 0} Zuchtgänge • {data?.summary.totalQueens || 0} Königinnen
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[13px] font-semibold transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          </svg>
          Drucken / PDF
        </button>
      </div>

      {data && <BreedingReportView data={data} />}
    </div>
  )
}
