'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@memoria/api-client'

export default function GuestAccessPage({ params }: { params: Promise<{ qr: string }> }) {
  const [qr, setQr] = useState<string>('')
  const [step, setStep] = useState<'loading' | 'verify' | 'gallery'>('loading')
  const [form, setForm] = useState({ name: '', phone: '' })
  const [error, setError] = useState('')

  const supabase = createBrowserClient()

  useEffect(() => {
    params.then((p) => {
      setQr(p.qr)
      setStep('verify')
    })
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // In production, this would call an API to create guest session and send OTP
      // For demo, just show gallery
      setStep('gallery')
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (step === 'gallery') {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 bg-white border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Wedding Gallery</h1>
          <p className="text-sm text-gray-500">Welcome, {form.name}</p>
        </header>

        <main className="p-4">
          <p className="text-gray-600 mb-4">
            This is a demo. In production, this would show ceremonies and photos.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                Photo {i}
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Memoria</h1>
        <p className="text-gray-600">Access your wedding memories</p>
      </header>

      <main className="flex-1 px-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rahul Sharma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="9876543210"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Continue
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-8">
          By continuing, you agree to share your photos with the couple and guests at this event.
        </p>
      </main>
    </div>
  )
}