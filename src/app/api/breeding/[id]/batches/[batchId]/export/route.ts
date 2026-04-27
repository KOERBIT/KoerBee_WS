import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCSV } from '@/lib/breeding-report'
import jsPDF from 'jspdf'

function getEventLabel(type: string): string {
  const labels: Record<string, string> = {
    graft: 'Umlarven',
    check: 'Stiftkontrolle',
    hatch: 'Schlupf',
    mating: 'Begattung',
    laying: 'Eilage',
    assessment: 'Beurteilung'
  }
  return labels[type] || type
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; batchId: string }> }
) {
  const { id: lineId, batchId } = await params
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') as 'pdf' | 'csv' || 'pdf'

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch batch with all data
  const batch = await prisma.breedingBatch.findFirst({
    where: {
      id: batchId,
      line: { userId: session.user.id }
    },
    include: {
      line: true,
      events: { orderBy: { date: 'asc' } }
    }
  })

  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Prepare report data
  const reportData = {
    lineName: batch.line.name,
    graftDate: batch.graftDate.toLocaleDateString('de-DE'),
    larvaeGrafted: batch.larvaeGrafted,
    larvaeAccepted: batch.larvaeAccepted,
    queensHatched: batch.queensHatched,
    queensMated: batch.queensMated,
    events: batch.events.map(e => ({
      type: e.type,
      label: getEventLabel(e.type),
      date: e.date.toLocaleDateString('de-DE'),
      completed: e.completed,
      eventValue: e.eventValue,
      eventNotes: e.eventNotes
    })),
    batchNotes: batch.notes
  }

  if (format === 'csv') {
    const csv = generateCSV(reportData)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="report_${batchId}.csv"`
      }
    })
  }

  // PDF format
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  let yPos = 20

  // Title
  pdf.setFontSize(18)
  pdf.text('Zuchtkalender Report', pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  // Header info
  pdf.setFontSize(11)
  pdf.text(`Linie: ${reportData.lineName}`, 20, yPos)
  yPos += 8
  pdf.text(`Graft-Datum: ${reportData.graftDate}`, 20, yPos)
  yPos += 15

  // Survival section
  pdf.setFontSize(12)
  pdf.text('Überlebenschance:', 20, yPos)
  yPos += 10
  pdf.setFontSize(10)
  pdf.text(`${reportData.larvaeGrafted} Larven umgelarvt`, 25, yPos)
  yPos += 7

  if (reportData.larvaeAccepted) {
    const pct = Math.round((reportData.larvaeAccepted / reportData.larvaeGrafted!) * 100)
    pdf.text(`→ ${reportData.larvaeAccepted} angenommen (${pct}%)`, 25, yPos)
    yPos += 7
  }

  if (reportData.queensHatched && reportData.larvaeAccepted) {
    const pct = Math.round((reportData.queensHatched / reportData.larvaeAccepted) * 100)
    pdf.text(`→ ${reportData.queensHatched} geschlüpft (${pct}%)`, 25, yPos)
    yPos += 7
  }

  if (reportData.queensMated && reportData.queensHatched) {
    const pct = Math.round((reportData.queensMated / reportData.queensHatched) * 100)
    pdf.text(`→ ${reportData.queensMated} begattet (${pct}%)`, 25, yPos)
    yPos += 7
  }

  yPos += 8

  // Events
  pdf.setFontSize(12)
  pdf.text('Timeline:', 20, yPos)
  yPos += 8
  pdf.setFontSize(9)

  reportData.events.forEach(event => {
    if (yPos > pageHeight - 20) {
      pdf.addPage()
      yPos = 20
    }
    pdf.text(`${event.label} (${event.date})`, 25, yPos)
    if (event.eventValue !== null) {
      pdf.text(`Wert: ${event.eventValue}`, 35, yPos + 5)
    }
    if (event.eventNotes) {
      pdf.text(`Kommentar: ${event.eventNotes}`, 35, yPos + 10)
    }
    yPos += 15
  })

  if (reportData.batchNotes) {
    yPos += 8
    pdf.setFontSize(12)
    pdf.text('Notizen:', 20, yPos)
    yPos += 8
    pdf.setFontSize(10)
    pdf.text(reportData.batchNotes, 25, yPos, { maxWidth: pageWidth - 50 })
  }

  const pdfBlob = pdf.output('blob')
  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report_${batchId}.pdf"`
    }
  })
}
