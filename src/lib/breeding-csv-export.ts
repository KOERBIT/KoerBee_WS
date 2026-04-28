interface ReportData {
  lines: Array<{ id: string; name: string; description: string | null; batchCount: number }>
  batches: Array<{
    id: string
    lineId: string
    lineName: string
    graftDate: string
    motherColonyName: string | null
    notes: string | null
    status: string
    events: Array<{
      id: string
      type: string
      date: string
      completed: boolean
      eventValue: number | null
      eventNotes: string | null
    }>
    queens: Array<{
      id: string
      number: string
      hatchDate: string
      status: 'hatched' | 'mated' | 'distributed'
      notes?: string
    }>
    tracking: {
      larvaeGrafted: number | null
      larvaeAccepted: number | null
      queensHatched: number | null
      queensMated: number | null
    }
  }>
  summary: {
    totalQueens: number
    totalHatched: number
    totalMated: number
    totalDistributed: number
  }
}

const EVENT_LABELS: Record<string, string> = {
  graft: 'Umlarven',
  check: 'Stiftkontrolle',
  hatch: 'Schlupf',
  mating: 'Begattung',
  laying: 'Eilage',
  assessment: 'Beurteilung',
}

function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Only quote if field contains tab, newline, or double quote
  if (str.includes('\t') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('de-DE')
  } catch {
    return ''
  }
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    hatched: 'Geschlüpft',
    mated: 'Begattet',
    distributed: 'Verteilt',
    active: 'Aktiv',
    completed: 'Abgeschlossen',
  }
  return statusMap[status] || status
}

export function generateBreedingCsv(data: ReportData): string {
  const lines: string[] = []

  // Section 1: Summary
  lines.push('=== ZUSAMMENFASSUNG ===')
  lines.push(['Zuchtreihen', 'Königinnen gesamt', 'Geschlüpft', 'Begattet', 'Verteilt'].join('\t'))
  lines.push(
    [
      data.lines.length,
      data.summary.totalQueens,
      data.summary.totalHatched,
      data.summary.totalMated,
      data.summary.totalDistributed,
    ].join('\t')
  )
  lines.push('')

  // Section 2: Lines
  lines.push('=== ZUCHTREIHEN ===')
  lines.push(['Name', 'Beschreibung', 'Batches'].join('\t'))
  data.lines.forEach(line => {
    lines.push([escapeField(line.name), escapeField(line.description || ''), line.batchCount].join('\t'))
  })
  lines.push('')

  // Section 3: Batches
  lines.push('=== ZUCHTGÄNGE ===')
  lines.push(
    [
      'Zuchtreihe',
      'Umlarv-Datum',
      'Muttervolk',
      'Status',
      'Larven umgelarvt',
      'Angenommen',
      'Geschlüpft',
      'Begattet',
      'Annahme-Quote',
      'Schlupf-Quote',
      'Begattungs-Quote',
    ].join('\t')
  )
  data.batches.forEach(batch => {
    const annahmeQuote =
      batch.tracking.larvaeGrafted && batch.tracking.larvaeAccepted
        ? Math.round((batch.tracking.larvaeAccepted / batch.tracking.larvaeGrafted) * 100)
        : ''
    const schlupfQuote =
      batch.tracking.larvaeAccepted && batch.tracking.queensHatched
        ? Math.round((batch.tracking.queensHatched / batch.tracking.larvaeAccepted) * 100)
        : ''
    const begattungsQuote =
      batch.tracking.queensHatched && batch.tracking.queensMated
        ? Math.round((batch.tracking.queensMated / batch.tracking.queensHatched) * 100)
        : ''

    lines.push(
      [
        escapeField(batch.lineName),
        formatDate(batch.graftDate),
        escapeField(batch.motherColonyName || ''),
        formatStatus(batch.status),
        batch.tracking.larvaeGrafted || '',
        batch.tracking.larvaeAccepted || '',
        batch.tracking.queensHatched || '',
        batch.tracking.queensMated || '',
        annahmeQuote ? `${annahmeQuote}%` : '',
        schlupfQuote ? `${schlupfQuote}%` : '',
        begattungsQuote ? `${begattungsQuote}%` : '',
      ].join('\t')
    )
  })
  lines.push('')

  // Section 4: Timeline
  lines.push('=== ZUCHTPHASEN-TIMELINE ===')
  lines.push(['Zuchtreihe', 'Batch-Datum', 'Phase', 'Datum', 'Abgeschlossen', 'Königinnen'].join('\t'))

  data.batches.forEach(batch => {
    batch.events.forEach(event => {
      lines.push(
        [
          escapeField(batch.lineName),
          formatDate(batch.graftDate),
          escapeField(EVENT_LABELS[event.type] || event.type),
          formatDate(event.date),
          event.completed ? 'ja' : 'nein',
          event.eventValue || '',
        ].join('\t')
      )
    })
  })
  lines.push('')

  // Section 5: Queens
  lines.push('=== KÖNIGINNEN ===')
  lines.push(['Nummer', 'Schlupfdatum', 'Zuchtreihe', 'Muttervolk', 'Batch-Graftdatum', 'Status', 'Notizen'].join('\t'))

  data.batches.forEach(batch => {
    batch.queens.forEach(queen => {
      lines.push(
        [
          escapeField(queen.number),
          formatDate(queen.hatchDate),
          escapeField(batch.lineName),
          escapeField(batch.motherColonyName || ''),
          formatDate(batch.graftDate),
          formatStatus(queen.status),
          escapeField(queen.notes || ''),
        ].join('\t')
      )
    })
  })

  return lines.join('\n')
}

export function downloadCsv(content: string, filename: string = 'zucht-report.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
