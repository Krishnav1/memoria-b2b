import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginPage from '../app/(auth)/login/page'

// Mock the Supabase client
vi.mock('@memoria/api-client', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Form Validation', () => {
    it('renders login form with email and password fields', () => {
      render(<LoginPage />)

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('accepts email input', () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      fireEvent.change(emailInput, { target: { value: 'test@studio.com' } })

      expect(emailInput.value).toBe('test@studio.com')
    })

    it('accepts password input', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(passwordInput.value).toBe('password123')
    })

    it('disables submit when email is empty', () => {
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const button = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement
      expect(button).toBeDisabled()
    })

    it('enables submit when email and password are filled', () => {
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(emailInput, { target: { value: 'test@studio.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const button = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement
      expect(button).not.toBeDisabled()
    })
  })
})