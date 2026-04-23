import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CoupleAccessPage from '../../pwa/app/c/[token]/page'

const mockParams = Promise.resolve({ token: 'test-magic-token' })

function makeEventsMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'evt-1', name: 'Priya & Rahul Wedding', magicLinkToken: 'test-magic-token' },
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
            { id: 'cer-1', name: 'Wedding', visibility: 'guest', sequence: 0 },
            { id: 'cer-2', name: 'Reception', visibility: 'guest', sequence: 1 },
          ],
          error: null,
        }),
      }),
    }),
  }
}

function makeCoupleAccessMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    }),
  }
}

function makePhotosMock() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
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
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'events') return makeEventsMock()
        if (table === 'ceremonies') return makeCeremoniesMock()
        if (table === 'couple_access') return makeCoupleAccessMock()
        if (table === 'photos') return makePhotosMock()
        return { select: vi.fn().mockReturnValue({}) }
      }),
    }),
  }
})

describe('CoupleAccessPage', () => {
  it('renders phone verification form', async () => {
    render(<CoupleAccessPage params={mockParams} />)

    await waitFor(() => {
      expect(screen.getByLabelText(/your phone/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /verify my access/i })).toBeInTheDocument()
    })
  })

  it('validates 10-digit phone requirement', async () => {
    render(<CoupleAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/your phone/i)).toBeInTheDocument())
    await fireEvent.change(screen.getByLabelText(/your phone/i), { target: { value: '12345' } })
    expect(screen.getByRole('button', { name: /verify my access/i })).toBeDisabled()
  })

  it('accepts valid 10-digit phone', async () => {
    render(<CoupleAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/your phone/i)).toBeInTheDocument())
    await fireEvent.change(screen.getByLabelText(/your phone/i), { target: { value: '9876543210' } })
    expect(screen.getByRole('button', { name: /verify my access/i })).not.toBeDisabled()
  })

  it('shows gallery and family invite after verify', async () => {
    render(<CoupleAccessPage params={mockParams} />)

    await waitFor(() => expect(screen.getByLabelText(/your phone/i)).toBeInTheDocument())
    await fireEvent.change(screen.getByLabelText(/your phone/i), { target: { value: '9876543210' } })
    await fireEvent.click(screen.getByRole('button', { name: /verify my access/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /family members/i })).toBeInTheDocument()
    })
  })
})
