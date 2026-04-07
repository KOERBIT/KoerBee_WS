import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ColonyQuickActions } from '@/app/dashboard/colonies/[id]/ColonyQuickActions'

// Mock next/navigation
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

// Mock fetch
global.fetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })
})

describe('ColonyQuickActions', () => {
  it('renders all four action buttons', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    expect(screen.getByText('Durchsicht')).toBeInTheDocument()
    expect(screen.getByText('Füttern')).toBeInTheDocument()
    expect(screen.getByText('Varroa')).toBeInTheDocument()
    expect(screen.getByText('Honigernte')).toBeInTheDocument()
  })

  it('shows no inline form initially', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    expect(screen.queryByText('Fütterung buchen')).not.toBeInTheDocument()
    expect(screen.queryByText('Durchsicht buchen')).not.toBeInTheDocument()
    expect(screen.queryByText('Behandlung buchen')).not.toBeInTheDocument()
    expect(screen.queryByText('Honigernte buchen')).not.toBeInTheDocument()
  })

  it('opens feeding form when Füttern is clicked', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    expect(screen.getByText('Futtermenge')).toBeInTheDocument()
    expect(screen.getByText('Fütterung buchen')).toBeInTheDocument()
  })

  it('closes feeding form when Füttern is clicked again', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Füttern'))
    expect(screen.queryByText('Fütterung buchen')).not.toBeInTheDocument()
  })

  it('switches from feeding to varroa form', () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Varroa'))
    expect(screen.queryByText('Futtermenge')).not.toBeInTheDocument()
    expect(screen.getByText('Behandlung buchen')).toBeInTheDocument()
  })

  it('POSTs to /api/treatments for Füttern and calls router.refresh()', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Fütterung buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/treatments',
      expect.objectContaining({
        method: 'POST',
      })
    )
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.colonyId).toBe('col-1')
    expect(body.type).toBe('feeding')
  })

  it('POSTs to /api/treatments for Varroa', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Varroa'))
    fireEvent.click(screen.getByText('Behandlung buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/treatments',
      expect.objectContaining({
        method: 'POST',
      })
    )
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.colonyId).toBe('col-1')
    expect(body.type).toBe('varroa')
  })

  it('POSTs to /api/inspections for Durchsicht', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Durchsicht'))
    fireEvent.click(screen.getByText('Durchsicht buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/inspections',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.colonyId).toBe('col-1')
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('closes the form after successful submit', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Fütterung buchen'))
    await waitFor(() => expect(screen.queryByText('Fütterung buchen')).not.toBeInTheDocument())
  })

  it('POSTs to /api/treatments for Honigernte with zargen count', async () => {
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Honigernte'))
    // increment zargen once (default 1 → 2)
    const form = screen.getByText('Anzahl Zargen').closest('div')!
    fireEvent.click(within(form).getByText('+'))
    fireEvent.click(screen.getByText('Honigernte buchen'))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.amount).toBe(2)
    expect(body.unit).toBe('Zargen')
  })

  it('shows error message when API fails and does not refresh', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false })
    render(<ColonyQuickActions colonyId="col-1" />)
    fireEvent.click(screen.getByText('Füttern'))
    fireEvent.click(screen.getByText('Fütterung buchen'))
    await waitFor(() =>
      expect(screen.getByText('Fehler beim Buchen. Bitte erneut versuchen.')).toBeInTheDocument()
    )
    expect(mockRefresh).not.toHaveBeenCalled()
    // form stays open
    expect(screen.getByText('Fütterung buchen')).toBeInTheDocument()
  })
})
