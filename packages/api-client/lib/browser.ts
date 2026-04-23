import { createBrowserClient } from '@supabase/ssr'

// Demo mode: return a mock client with fake data when no real backend is available
function createMockClient() {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'demo-user', email: 'demo@studio.com' } },
        error: null,
      }),
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === 'events' ? { id: 'evt-demo', name: 'Priya & Rahul Wedding', eventType: 'wedding', status: 'uploaded', photoCount: 342, photoGbUsed: 12.5, qrCode: 'demo-qr', coupleName: 'Priya & Rahul', magicLinkToken: 'demo-token', ceremonies: [], createdAt: new Date().toISOString() } : null,
            error: null,
          }),
        }),
        order: () => ({
          data: table === 'events' ? [
            { id: 'evt-1', name: 'Priya & Rahul Wedding', eventType: 'wedding', status: 'uploaded', photoCount: 342, eventDate: '2024-03-15', createdAt: '2024-01-01' },
            { id: 'evt-2', name: 'Singh Birthday', eventType: 'birthday', status: 'draft', photoCount: 0, eventDate: '2024-02-20', createdAt: '2024-01-05' },
          ] : [],
          error: null,
        }),
      }),
      insert: async () => ({ error: null }),
      update: async () => ({ error: null }),
    }),
  }
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  // Demo mode: if using localhost or placeholder, use mock client
  if (url.includes('localhost') || url.includes('your-') || !url.startsWith('http')) {
    return createMockClient() as any
  }

  return createBrowserClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
