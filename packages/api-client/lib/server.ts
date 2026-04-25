import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Demo mode: return a mock client with fake data when no real backend is available
function createMockServerClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'demo-user', email: 'demo@studio.com' } },
        error: null,
      }),
    },
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
        order: () => ({
          data: [
            { id: 'evt-1', name: 'Priya & Rahul Wedding', eventType: 'wedding', status: 'uploaded', photoCount: 342, eventDate: '2024-03-15', createdAt: '2024-01-01' },
            { id: 'evt-2', name: 'Singh Birthday', eventType: 'birthday', status: 'draft', photoCount: 0, eventDate: '2024-02-20', createdAt: '2024-01-05' },
          ],
          error: null,
        }),
      }),
      insert: async () => ({ error: null }),
      update: async () => ({ error: null }),
    }),
  }
}

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  if (url.includes('localhost') || url.includes('your-') || !url.startsWith('http')) {
    return createMockServerClient() as any
  }

  const cookieStore = await cookies()

  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  )
}
