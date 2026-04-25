import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GuestAccessPage from '../../pwa/app/e/[qr]/page'

const mockParams = Promise.resolve({ qr: 'test-qr-code' })

// Build the chain: from() → select() → eq() → single()
function makeEventsMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'evt-1', name: 'Test Wedding', status: 'uploaded' },
          error: null,
        }),
      }),
    }),
  }
}

function makeCeremoniesMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'cer-1', name: 'Wedding', visibility: 'guest' },
            { id: 'cer-2', name: 'Reception', visibility: 'guest' },
          ],
          error: null,
        }),
      }),
    }),
  }
}

vi.mock('@memoria/api-client', () => {
  return {
    createBrowserClient: () => ({
      auth: {
        verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') return makeEventsMock()
        if (table === 'ceremonies') return makeCeremoniesMock()
        return { select: vi.fn().mockReturnValue({}) }
      }),
    }),
  }
})

describe('GuestAccessPage', () => {
  it('renders phone verification form', async () => {
    render(<GuestAccessPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    })
  })

  it('shows error for invalid phone length', async () => {
    render(<GuestAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/phone/i)).toBeInTheDocument())

    await fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '12345' } })
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('enables submit for valid 10-digit phone', async () => {
    render(<GuestAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/phone/i)).toBeInTheDocument())

    await fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '9876543210' } })
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled()
  })

  it('loads gallery view after continue', async () => {
    render(<GuestAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/phone/i)).toBeInTheDocument())
    await fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rahul' } })
    await fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '9876543210' } })
    await fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /find my photos/i })[0]).toBeInTheDocument()
    })
  })
})
