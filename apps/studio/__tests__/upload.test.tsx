import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UploadPage from '../app/(dashboard)/events/[id]/upload/page'

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ id: 'evt-1' }),
  useRouter: vi.fn().mockReturnValue({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock('@memoria/api-client', () => {
  return {
    createBrowserClient: () => ({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
      from: vi.fn().mockImplementation((_table: string) => {
        return {
          select: vi.fn().mockReturnValue({}),
        }
      }),
    }),
  }
})

describe('UploadPage', () => {
  it('renders upload dropzone', async () => {
    render(<UploadPage params={Promise.resolve({ id: 'evt-1' })} />)

    await waitFor(() => {
      expect(screen.getByText(/drag & drop photos/i)).toBeInTheDocument()
    })
  })

  it('shows file limit info', async () => {
    render(<UploadPage params={Promise.resolve({ id: 'evt-1' })} />)

    await waitFor(() => {
      expect(screen.getByText(/up to 2000 photos/i)).toBeInTheDocument()
    })
  })

  it('upload button is disabled when no files', async () => {
    render(<UploadPage params={Promise.resolve({ id: 'evt-1' })} />)

    await waitFor(() => {
      expect(screen.getByText(/drag & drop photos/i)).toBeInTheDocument()
    })
    const uploadBtn = screen.queryByRole('button', { name: /upload \d+ photos/i })
    expect(uploadBtn).not.toBeInTheDocument()
  })
})
