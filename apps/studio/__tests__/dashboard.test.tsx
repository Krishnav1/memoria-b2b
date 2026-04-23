import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '../app/dashboard/page'

// Build the from().select().order() chain
function makeEventsMock(data: any[]) {
  return {
    select: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({ data, error: null }),
    }),
  }
}

vi.mock('@memoria/api-client', () => {
  const mockUser = { id: 'test-user-id', email: 'test@studio.com' }
  return {
    createBrowserClient: () => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
      from: vi.fn().mockImplementation((_table: string) => {
        return makeEventsMock([
          { id: 'evt-1', name: 'Priya & Rahul Wedding', eventType: 'wedding', status: 'uploaded', photoCount: 342, eventDate: '2024-03-15', createdAt: '2024-01-01' },
          { id: 'evt-2', name: 'Singh Birthday', eventType: 'birthday', status: 'draft', photoCount: 0, eventDate: '2024-02-20', createdAt: '2024-01-05' },
        ])
      }),
    }),
  }
})

describe('DashboardPage', () => {
  it('renders events list with data', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Priya & Rahul Wedding')).toBeInTheDocument()
    })
    expect(screen.getByText('Singh Birthday')).toBeInTheDocument()
  })

  it('shows correct status badges', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Uploaded')).toBeInTheDocument()
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })
  })

  it('has New Event button linking to create page', async () => {
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Priya & Rahul Wedding')).toBeInTheDocument()
    })

    const newEventBtns = screen.getAllByRole('link', { name: /new event/i })
    expect(newEventBtns[0]).toHaveAttribute('href', '/dashboard/events/create')
  })
})
