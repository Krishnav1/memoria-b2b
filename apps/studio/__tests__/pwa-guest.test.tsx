import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GuestAccessPage from '../../pwa/app/e/[qr]/page'

const mockParams = Promise.resolve({ qr: 'test-qr-code' })

function makeEventsMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'evt-1',
            name: 'Test Wedding',
            status: 'uploaded',
            magicLinkToken: null,
            magicLinkTokenExpiry: null,
          },
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
            { id: 'cer-2', name: 'Reception', visibility: 'couple_only' },
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
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'photo-1', r2ObjectKey: 'events/evt-1/photos/abc', fileName: 'img1.jpg', ceremonyId: 'cer-1' },
                ],
                error: null,
              }),
            }),
          }),
        }
      }),
    }),
  }
})

describe('GuestAccessPage', () => {
  it('renders name verification form', async () => {
    render(<GuestAccessPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enter gallery/i })).toBeInTheDocument()
    })
  })

  it('does not have phone input field', async () => {
    render(<GuestAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/your name/i)).toBeInTheDocument())
    expect(screen.queryByLabelText(/phone/i)).not.toBeInTheDocument()
  })

  it('enables submit with name filled', async () => {
    render(<GuestAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/your name/i)).toBeInTheDocument())
    await fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rahul' } })
    expect(screen.getByRole('button', { name: /enter gallery/i })).not.toBeDisabled()
  })
})
