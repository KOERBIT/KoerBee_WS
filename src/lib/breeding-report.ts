export interface ReportData {
  lineName: string
  graftDate: string
  larvaeGrafted: number | null
  larvaeAccepted: number | null
  queensHatched: number | null
  queensMated: number | null
  events: Array<{
    type: string
    label: string
    date: string
    completed: boolean
    eventValue: number | null
    eventNotes: string | null
  }>
  batchNotes: string | null
}

export function calculatePercentage(current: number | null, previous: number | null): number | null {
  if (!current || !previous) return null
  return Math.round((current / previous) * 100)
}

export function generateCSV(data: ReportData): string {
  const rows: (string | number)[][] = [
    ['Zuchtkalender Report'],
    ['Linie', data.lineName],
    ['Graft-Datum', data.graftDate],
    [],
    ['Event', 'Datum', 'Wert', 'Kommentar', 'Status'],
  ]

  if (data.larvaeGrafted) {
    rows.push(['Umlarven', data.graftDate, data.larvaeGrafted.toString(), '', 'Completed'])
  }

  data.events.forEach(event => {
    if (event.eventValue !== null) {
      rows.push([
        event.label,
        event.date,
        event.eventValue.toString(),
        event.eventNotes || '',
        event.completed ? 'Completed' : 'Pending'
      ])
    }
  })

  if (data.batchNotes) {
    rows.push([], ['Notizen', data.batchNotes])
  }

  return rows.map(row => row.map((cell: string | number) => `"${cell}"`).join(',')).join('\n')
}

export function generatePDFContent(data: ReportData): string {
  return `
Zuchtkalender Report
Linie: ${data.lineName}
Graft-Datum: ${data.graftDate}

Überlebenschance:
${data.larvaeGrafted} Larven umgelarvt
${data.larvaeAccepted ? `→ ${data.larvaeAccepted} angenommen (${calculatePercentage(data.larvaeAccepted, data.larvaeGrafted)}%)` : ''}
${data.queensHatched ? `→ ${data.queensHatched} geschlüpft (${calculatePercentage(data.queensHatched, data.larvaeAccepted)}%)` : ''}
${data.queensMated ? `→ ${data.queensMated} begattet (${calculatePercentage(data.queensMated, data.queensHatched)}%)` : ''}

Timeline:
${data.events.map(e => `${e.label} (${e.date}): ${e.eventValue !== null ? e.eventValue : '—'}${e.eventNotes ? ` (${e.eventNotes})` : ''}`).join('\n')}

${data.batchNotes ? `\nNotizen:\n${data.batchNotes}` : ''}
  `.trim()
}
