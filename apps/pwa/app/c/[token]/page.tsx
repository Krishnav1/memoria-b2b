'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@memoria/api-client'

export default function CoupleAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('')
  const [step, setStep] = useState<'loading' | 'verify' | 'otp' | 'dashboard'>('loading')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  const supabase = createBrowserClient()

  useEffect(() => {
    params.then(async (p) => {
      setToken(p.token)
      setStep('verify')
    })
  }, [params])

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // In production, verify magic link with backend
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Invalid link')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms',
      })

      if (error) throw error
      setStep('dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    }
  }

  if (step === 'dashboard') {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 bg-white border-b px-4 py-4">
          <h1 className="text-xl font-bold">Your Wedding</h1>
          <p className="text-sm text-gray-500">Welcome!</p>
        </header>

        <main className="p-4 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Access expires in 90 days</h2>
            <p className="text-sm text-blue-700">
              Extend to keep your memories forever
            </p>
            <button className="mt-2 text-sm text-blue-600 font-medium">
              Extend Access →
            </button>
          </div>

          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Ceremonies</h3>
            <div className="space-y-2">
              {['Haldi', 'Mehendi', 'Wedding', 'Reception'].map((ceremony) => (
                <div key={ceremony} className="flex items-center justify-between py-3 border-b">
                  <span>{ceremony}</span>
                  <span className="text-sm text-gray-500">324 photos</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Family Members</h3>
            <p className="text-sm text-gray-500 mb-2">Invite up to 5 family members</p>
            <button className="text-sm text-blue-600 font-medium">
              + Invite Family Member
            </button>
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex justify-around">
          <button className="text-blue-600 font-medium">Gallery</button>
          <button className="text-gray-500">Download</button>
          <button className="text-gray-500">Settings</button>
        </nav>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Memoria</h1>
        <p className="text-gray-600">Your exclusive wedding access</p>
      </header>

      <main className="flex-1 px-4">
        {step === 'verify' && (
          <form onSubmit={handleVerifyPhone} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="9876543210"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Verify My Access
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              OTP sent to +91 {phone}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Access My Wedding
            </button>
          </form>
        )}
      </main>
    </div>
  )
}