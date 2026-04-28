import { generateQueenNumbers } from '@/lib/breeding-queens'

describe('generateQueenNumbers', () => {
  it('generates sequential numbers for queens hatched on same date', () => {
    const result = generateQueenNumbers({
      lineName: 'Carnica',
      hatchDate: '2026-04-15',
      count: 3,
      existingQueens: [],
    })

    expect(result).toEqual([
      'Carnica-2026-04-15-001',
      'Carnica-2026-04-15-002',
      'Carnica-2026-04-15-003',
    ])
  })

  it('increments count when queens already exist for same line+date', () => {
    const result = generateQueenNumbers({
      lineName: 'Carnica',
      hatchDate: '2026-04-15',
      count: 2,
      existingQueens: [
        { number: 'Carnica-2026-04-15-001', status: 'hatched' },
        { number: 'Carnica-2026-04-15-002', status: 'hatched' },
      ],
    })

    expect(result).toEqual([
      'Carnica-2026-04-15-003',
      'Carnica-2026-04-15-004',
    ])
  })

  it('handles line names with special characters by sanitizing', () => {
    const result = generateQueenNumbers({
      lineName: 'Carnica-2024',
      hatchDate: '2026-04-15',
      count: 1,
      existingQueens: [],
    })

    expect(result[0]).toMatch(/^Carnica-2024-2026-04-15-001$/)
  })
})
