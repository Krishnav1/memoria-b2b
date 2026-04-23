import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewEventPage from '../app/(dashboard)/events/new/page'

// Chain builder: from().select().eq().single()
function makeUsersMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { studioId: 'studio-1' }, error: null }),
      }),
    }),
  }
}

// Chain builder: from().insert().select().single()
function makeInsertMock() {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'evt-new', name: 'Test Wedding', status: 'created' },
          error: null,
        }),
      }),
    }),
  }
}

// Chain builder: from().insert() for ceremonies
function makeCeremonyInsertMock() {
  return {
    insert: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
}

vi.mock('@memoria/api-client', () => {
  return {
    createBrowserClient: () => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'test@studio.com' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'users') return makeUsersMock()
        if (table === 'events') return makeInsertMock()
        if (table === 'ceremonies') return makeCeremonyInsertMock()
        return { select: vi.fn().mockReturnValue({}) }
      }),
    }),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('NewEventPage', () => {
  it('renders all form fields', async () => {
    render(<NewEventPage />)
    await waitFor(() => {
      expect(screen.getByLabelText(/event name/i)).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/event type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/couple name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/couple phone/i)).toBeInTheDocument()
  })

  it('disables submit when name is empty', () => {
    render(<NewEventPage />)
    expect(screen.getByRole('button', { name: /create event/i })).toBeDisabled()
  })

  it('enables submit when name is filled', async () => {
    render(<NewEventPage />)

    await fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: 'Test Wedding' } })
    expect(screen.getByRole('button', { name: /create event/i })).not.toBeDisabled()
  })

  it('shows creating state on submit', async () => {
    render(<NewEventPage />)

    await fireEvent.change(screen.getByLabelText(/event name/i), { target: { value: 'Test Wedding' } })
    await fireEvent.click(screen.getByRole('button', { name: /create event/i }))

    // Button should show loading state immediately
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument()
    })
  })
})
