import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Supabase client
vi.mock('@memoria/api-client', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn(),
      select: vi.fn(),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn(),
      }),
    }),
  }),
}))