import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import SignupPage from '../app/(auth)/signup/page'

vi.mock('@memoria/api-client', () => {
  return {
    createBrowserClient: () => ({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          error: null,
          data: { user: { id: 'test-user-id' } },
        }),
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
  }
})

describe('SignupPage', () => {
  describe('Form Validation', () => {
    it('renders signup form with all fields', () => {
      render(<SignupPage />)

      expect(screen.getByLabelText(/studio name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('accepts valid email format', () => {
      render(<SignupPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      fireEvent.change(emailInput, { target: { value: 'test@studio.com' } })

      expect(emailInput.value).toBe('test@studio.com')
    })

    it('accepts password with 6+ characters', () => {
      render(<SignupPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      expect(passwordInput.value).toBe('password123')
    })

    it('disables submit when password is less than 6 characters', () => {
      render(<SignupPage />)

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      fireEvent.change(passwordInput, { target: { value: '12345' } })

      const button = screen.getByRole('button', { name: /create account/i }) as HTMLButtonElement
      expect(button).toBeDisabled()
    })

    it('enables submit when all fields are valid', () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText(/studio name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)

      fireEvent.change(nameInput, { target: { value: 'My Studio' } })
      fireEvent.change(emailInput, { target: { value: 'test@studio.com' } })
      fireEvent.change(passwordInput, { target: { value: 'password123' } })

      const button = screen.getByRole('button', { name: /create account/i }) as HTMLButtonElement
      expect(button).not.toBeDisabled()
    })
  })
})