import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '../app/(auth)/login/page'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
      expect(button).not.toBeDisabled()
    })
  })
})