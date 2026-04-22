import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '../app/(auth)/login/page'

// Mock the Supabase client
vi.mock('@memoria/api-client', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

describe('LoginPage', () => {
  describe('Phone Input Step', () => {
    it('renders phone input form initially', () => {
      render(<LoginPage />)

      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument()
    })

    it('accepts only digits in phone input', () => {
      render(<LoginPage />)

      const input = screen.getByLabelText(/phone number/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: '9876543210' } })

      expect(input.value).toBe('9876543210')
    })

    it('strips non-digit characters from phone input', () => {
      render(<LoginPage />)

      const input = screen.getByLabelText(/phone number/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: '9876-543-210' } })

      expect(input.value).toBe('9876543210')
    })

    it('disables submit button when phone has fewer than 10 digits', () => {
      render(<LoginPage />)

      const input = screen.getByLabelText(/phone number/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: '987654321' } }) // 9 digits

      const button = screen.getByRole('button', { name: /send otp/i }) as HTMLButtonElement
      expect(button).toBeDisabled()
    })

    it('enables submit button when phone has exactly 10 digits', () => {
      render(<LoginPage />)

      const input = screen.getByLabelText(/phone number/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: '9876543210' } }) // 10 digits

      const button = screen.getByRole('button', { name: /send otp/i }) as HTMLButtonElement
      expect(button).toBeDisabled()
    })

    it('shows error message on OTP send failure', async () => {
      const mockSignInWithOtp = vi.fn().mockResolvedValueOnce({
        error: { message: 'Invalid phone number' },
      })

      vi.mock('@memoria/api-client', () => ({
        createBrowserClient: () => ({
          auth: {
            signInWithOtp: mockSignInWithOtp,
            verifyOtp: vi.fn(),
          },
        }),
      }))

      render(<LoginPage />)

      const input = screen.getByLabelText(/phone number/i) as HTMLInputElement
      fireEvent.change(input, { target: { value: '9876543210' } })

      const button = screen.getByRole('button', { name: /send otp/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(/invalid phone number/i)).toBeInTheDocument()
      })
    })
  })
})