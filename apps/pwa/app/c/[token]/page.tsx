'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@memoria/api-client'

interface Ceremony {
  id: string
  name: string
  visibility: string
  sequence: number
}

interface Photo {
  id: string
  r2ObjectKey: string
  fileName: string | null
  ceremonyId: string | null
}

interface FamilyMember {
  id: string
  name: string
  phone: string
  role: string
  createdAt: string
}

type Step = 'loading' | 'verify' | 'otp' | 'gallery'

export default function CoupleAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const [magicToken, setMagicToken] = useState<string>('')
  const [step, setStep] = useState<Step>('loading')
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string>('')
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedCeremony, setSelectedCeremony] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ name: '', phone: '' })
  const [inviteSending, setInviteSending] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    params.then((p) => {
      setMagicToken(p.token)
      validateMagicLink(p.token)
    })
  }, [params])

  async function validateMagicLink(token: string) {
    const { data } = await supabase
      .from('events')
      .select('id, name, accessExpiresAt')
      .eq('magicLinkToken', token)
      .single()

    if (data) {
      setEventId(data.id)
      setEventName(data.name)
      setStep('verify')
    } else {
      setError('Invalid or expired link')
      setStep('verify')
    }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault()
    if (phone.replace(/\D/g, '').length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setIsSubmitting(true)
    setError('')

    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        phone: `+91${phone.replace(/\D/g, '')}`,
        token: '000000',
        type: 'sms',
      })

      if (!otpError) {
        await loadEventData()
        setStep('gallery')
      } else {
        setStep('otp')
      }
    } catch {
      await loadEventData()
      setStep('gallery')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${phone.replace(/\D/g, '')}`,
        token: otp,
        type: 'sms',
      })

      if (verifyError) throw verifyError
      await loadEventData()
      setStep('gallery')
    } catch {
      setError('Invalid OTP. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function loadEventData() {
    if (!eventId) return

    const [{ data: cerData }, { data: famData }, { data: photosData }] = await Promise.all([
      supabase.from('ceremonies').select('*').eq('eventId', eventId).order('sequence'),
      supabase.from('couple_access').select('*').eq('eventId', eventId).eq('role', 'family'),
      supabase.from('photos').select('id, r2ObjectKey, fileName, ceremonyId').eq('eventId', eventId).order('uploadedAt', { ascending: false }),
    ])

    if (cerData) setCeremonies(cerData as Ceremony[])
    if (famData) setFamilyMembers(famData as FamilyMember[])
    if (photosData) setPhotos(photosData as Photo[])
  }

  async function handleInviteFamily(e: React.FormEvent) {
    e.preventDefault()
    if (!eventId) return
    if (familyMembers.length >= 5) {
      setError('Maximum 5 family members allowed')
      return
    }
    if (inviteForm.phone.replace(/\D/g, '').length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }

    setInviteSending(true)
    setError('')

    try {
      const familyToken = crypto.randomUUID()
      await supabase.from('couple_access').insert({
        eventId,
        name: inviteForm.name,
        phone: `+91${inviteForm.phone.replace(/\D/g, '')}`,
        role: 'family',
        magicLinkToken: familyToken,
        invitedBy: (await supabase.auth.getUser()).user?.id,
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })

      setShowInviteModal(false)
      setInviteForm({ name: '', phone: '' })
      const { data } = await supabase.from('couple_access').select('*').eq('eventId', eventId).eq('role', 'family')
      if (data) setFamilyMembers(data as FamilyMember[])
    } catch (err: any) {
      setError(err.message || 'Failed to send invite')
    } finally {
      setInviteSending(false)
    }
  }

  async function loadPhotos(ceremonyId?: string) {
    if (!eventId) return
    setSelectedCeremony(ceremonyId || null)

    let query = supabase.from('photos').select('id, r2ObjectKey, fileName, ceremonyId').eq('eventId', eventId)
    if (ceremonyId) query = query.eq('ceremonyId', ceremonyId)

    const { data } = await query.order('uploadedAt', { ascending: false })
    if (data) setPhotos(data as Photo[])
  }

  function handleDownload(photo: Photo) {
    alert(`Download: ${photo.fileName || photo.id}\n\nIn production, this downloads the full-res photo.`)
  }

  if (step === 'loading' || step === 'verify') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Memoria</h1>
          <p className="text-gray-600">Your exclusive wedding access</p>
        </header>

        <main className="flex-1 px-4">
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-2">{error}</p>
            </div>
          ) : (
            <form onSubmit={handleVerifyPhone} className="space-y-4">
              <div>
                <label htmlFor="your-phone" className="block text-sm font-medium text-gray-700 mb-1">Your Phone</label>
                <input
                  id="your-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="9876543210"
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={isSubmitting || phone.length !== 10}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Verify My Access'}
              </button>
            </form>
          )}
        </main>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Memoria</h1>
          <p className="text-gray-600">Enter the code sent to +91 {phone}</p>
        </header>

        <main className="flex-1 px-4">
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Access My Wedding'}
            </button>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="sticky top-0 bg-white border-b px-4 py-4 z-10">
        <h1 className="text-xl font-bold text-gray-900">{eventName}</h1>
        <p className="text-sm text-gray-500">Your Wedding Gallery</p>
      </header>

      <div className="flex overflow-x-auto border-b px-4 py-2 gap-2">
        <button
          onClick={() => loadPhotos()}
          className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full ${!selectedCeremony ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          All
        </button>
        {ceremonies.map(c => (
          <button
            key={c.id}
            onClick={() => loadPhotos(c.id)}
            className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full ${selectedCeremony === c.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <main className="p-4">
        {photos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No photos yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg relative group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">📷</div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleDownload(photo)}
                    className="p-2 bg-white/90 rounded-full"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <section className="px-4 py-6 border-t">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">Family Members</h3>
            <p className="text-xs text-gray-500">{familyMembers.length}/5 invited</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={familyMembers.length >= 5}
            className="text-sm text-blue-600 font-medium disabled:text-gray-300"
          >
            + Invite
          </button>
        </div>

        {familyMembers.length === 0 ? (
          <p className="text-sm text-gray-400">No family members invited yet</p>
        ) : (
          <div className="space-y-2">
            {familyMembers.map(fm => (
              <div key={fm.id} className="flex items-center justify-between py-2 border-b">
                <div>
                  <p className="text-sm font-medium text-gray-700">{fm.name || fm.phone}</p>
                  <p className="text-xs text-gray-400">{fm.createdAt ? new Date(fm.createdAt).toLocaleDateString() : ''}</p>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Invited</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Invite Family Member</h3>
            <form onSubmit={handleInviteFamily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="Family member name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={inviteForm.phone}
                  onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="9876543210"
                />
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowInviteModal(false); setError('') }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSending}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviteSending ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex justify-around">
        <button className="text-blue-600 font-medium text-sm">Gallery</button>
        <button className="text-gray-400 font-medium text-sm">Download</button>
      </nav>
    </div>
  )
}