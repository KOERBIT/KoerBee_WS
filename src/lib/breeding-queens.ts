interface ExistingQueen {
  number: string
  status: 'hatched' | 'mated' | 'distributed'
}

interface GenerateQueenNumbersInput {
  lineName: string
  hatchDate: string // ISO date: YYYY-MM-DD
  count: number
  existingQueens: ExistingQueen[]
}

export function generateQueenNumbers(
  input: GenerateQueenNumbersInput
): string[] {
  const { lineName, hatchDate, count, existingQueens } = input

  // Filter existing queens for this line + date combination
  const prefix = `${lineName}-${hatchDate}`
  const existingForThisDay = existingQueens.filter(q =>
    q.number.startsWith(prefix)
  )

  // Determine starting number
  let nextNumber = existingForThisDay.length + 1

  // Generate numbers
  const numbers: string[] = []
  for (let i = 0; i < count; i++) {
    const num = String(nextNumber + i).padStart(3, '0')
    numbers.push(`${prefix}-${num}`)
  }

  return numbers
}

export interface QueenRecord {
  id: string
  number: string
  hatchDate: Date
  status: 'hatched' | 'mated' | 'distributed'
  notes?: string
}

export function parseQueensJson(json: any): QueenRecord[] {
  if (!json || !Array.isArray(json)) return []
  return json.map(q => ({
    id: q.id || crypto.randomUUID(),
    number: q.number,
    hatchDate: new Date(q.hatchDate),
    status: q.status || 'hatched',
    notes: q.notes,
  }))
}

export function serializeQueens(queens: QueenRecord[]): any[] {
  return queens.map(q => ({
    id: q.id,
    number: q.number,
    hatchDate: q.hatchDate.toISOString(),
    status: q.status,
    notes: q.notes,
  }))
}
