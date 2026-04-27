'use client'

import { useState } from 'react'

interface ReportExportButtonProps {
  lineId: string
  batchId: string
  lineName: string
}

export function ReportExportButton({ lineId, batchId, lineName }: ReportExportButtonProps) {
  const [loading, setLoading] = useState<'pdf' | 'csv' | null>(null)

  async function handleExport(format: 'pdf' | 'csv') {
    setLoading(format)
    try {
      const url = `/api/breeding/${lineId}/batches/${batchId}/export?format=${format}`
      const response = await fetch(url)
      const blob = await response.blob()

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `Zuchtbericht_${lineName}_${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export fehlgeschlagen')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport('pdf')}
        disabled={loading === 'pdf'}
        className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {loading === 'pdf' ? 'PDF…' : 'PDF'}
      </button>
      <button
        onClick={() => handleExport('csv')}
        disabled={loading === 'csv'}
        className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {loading === 'csv' ? 'CSV…' : 'CSV'}
      </button>
    </div>
  )
}
