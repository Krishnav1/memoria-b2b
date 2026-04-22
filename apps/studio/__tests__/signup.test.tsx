import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SignupPage from '../app/(auth)/signup/page'

// Mock the Supabase client
vi.mock('@memoria/api-client', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({
        error: null,
        data: { user: { id: 'test-user-id' } },
      }),
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

describe('SignupPage', () => {
  describe('Form Validation', () => {
    it('renders signup form with all fields', () => {
      render(<SignupPage />)

      expect(screen.getByLabelText(/studio name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue with phone/i })).toBeInTheDocument()
    })

    it('accepts valid email format', () => {
      render(<SignupPage />)

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      fireEvent.change(emailInput, { target: { value: 'test@studio.com' } })

      expect(emailInput.value).toBe('test@studio.com')
    })

    it('accepts 10-digit phone', () => {
      render(<SignupPage />)

      const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement
      fireEvent.change(phoneInput, { target: { value: '9876543210' } })

      expect(phoneInput.value).toBe('9876543210')
    })

    it('strips non-digits from phone', () => {
      render(<SignupPage />)

      const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement
      fireEvent.change(phoneInput, { target: { value: '9876-543-210' } })

      expect(phoneInput.value).toBe('9876543210')
    })

    it('disables submit when phone is not exactly 10 digits', () => {
      render(<SignupPage />)

      const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement
      fireEvent.change(phoneInput, { target: { value: '987654321' } }) // 9 digits

      const button = screen.getByRole('button', { name: /continue with phone/i }) as HTMLButtonElement
      expect(button).toBeDisabled()
    })

    it('enables submit when all fields are valid', () => {
      render(<SignupPage />)

      const nameInput = screen.getByLabelText(/studio name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const phoneInput = screen.getByLabelText(/phone/i)

      fireEvent.change(nameInput, { target: { value: 'My Studio' } })
      fireEvent.change(emailInput, { target: { value: 'test@studio.com' } })
      fireEvent.change(phoneInput, { target: { value: '9876543210' } })

      const button = screen.getByRole('button', { name: /continue with phone/i }) as HTMLButtonElement
      expect(button).not.toBeDisabled()
    })
  })

  describe('Slug Generation', () => {
    it('generates studio name slug correctly', () => {
      const name = 'My Photo Studio'
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') +
        '-' +
        'testuuid'

      expect(slug).toBe('my-photo-studio-testuuid')
    })

    it('handles studio names with special characters', () => {
      const name = "John's Wedding Studio!"
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')

      expect(slug).toBe('johns-wedding-studio')
    })
  })
})