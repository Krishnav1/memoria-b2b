import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Create mock client
const mockClient = {
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
}

// Provide env vars so @supabase/ssr doesn't complain
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'

// Mock @supabase/ssr - must mock the actual path that gets resolved
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => mockClient),
}))

// Mock @memoria/api-client
vi.mock('@memoria/api-client', () => ({
  createBrowserClient: () => mockClient,
}))

// Mock crypto for slug generation
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234',
})