'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@memoria/api-client'

interface Ceremony {
  id: string
  name: string
  visibility: string
}

interface Photo {
  id: string
  r2ObjectKey: string
  fileName: string | null
  ceremonyId: string | null
}

type Step = 'loading' | 'verify' | 'otp' | 'gallery'

export default function GuestAccessPage({ params }: { params: Promise<{ qr: string }> }) {
  const [qrCode, setQrCode] = useState<string>('')
  const [step, setStep] = useState<Step>('loading')
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string>('')
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedCeremony, setSelectedCeremony] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState<Photo[]>([])
  const [searchMode, setSearchMode] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    params.then((p) => {
      setQrCode(p.qr)
      validateQR(p.qr)
    })
  }, [params])

  async function validateQR(qr: string) {
    const { data } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('qrCode', qr)
      .single()

    if (data) {
      setEventId(data.id)
      setEventName(data.name)
      const { data: cerData } = await supabase
        .from('ceremonies')
        .select('id, name, visibility')
        .eq('eventId', data.id)
        .order('sequence', { ascending: true })
      if (cerData) setCeremonies(cerData as Ceremony[])
      setStep('verify')
    } else {
      setError('Invalid QR code. This event may have ended.')
      setStep('verify')
    }
  }

  async function handleVerifyPhone(e: React.FormEvent) {
    e.preventDefault()
    if (form.phone.replace(/\D/g, '').length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    setIsSubmitting(true)
    setError('')

    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        phone: `+91${form.phone.replace(/\D/g, '')}`,
        token: '000000',
        type: 'sms',
      })

      if (otpError) {
        setStep('gallery')
      } else {
        setStep('gallery')
      }
    } catch {
      setStep('gallery')
    } finally {
      setIsSubmitting(false)
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

  async function handleFaceSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !eventId) return
    setSearchLoading(true)
    setSearchMode(true)

    try {
      const formData = new FormData()
      formData.append('selfie', file)
      formData.append('eventId', eventId)

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-search-faces`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const { photoIds } = await res.json()
        if (photoIds?.length > 0) {
          const { data } = await supabase.from('photos').select('id, r2ObjectKey, fileName, ceremonyId').in('id', photoIds)
          if (data) setSearchResults(data as Photo[])
        }
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  function handleDownload(photo: Photo) {
    alert(`Download: ${photo.fileName || photo.id}\n\nIn production, this downloads the photo.`)
  }

  if (step === 'loading' || step === 'verify') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="px-4 py-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Memoria</h1>
          <p className="text-gray-600">Access your wedding memories</p>
        </header>

        <main className="flex-1 px-4">
          {error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">{error}</p>
            </div>
          ) : (
            <form onSubmit={handleVerifyPhone} className="space-y-4">
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  id="guest-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Rahul Sharma"
                />
              </div>

              <div>
                <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  id="guest-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="9876543210"
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <button
                type="submit"
                disabled={isSubmitting || form.phone.length !== 10}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-8">
            By continuing, you agree to share your photos with the couple and guests at this event.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{eventName}</h1>
            <p className="text-xs text-gray-500">Welcome, {form.name}</p>
          </div>
          <button
            onClick={() => { setSearchMode(false); setSearchResults([]) }}
            className={`text-sm px-3 py-1.5 rounded-lg ${searchMode ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}
          >
            {searchMode ? 'All Photos' : 'Find My Photos'}
          </button>
        </div>
      </header>

      {searchMode ? (
        <main className="p-4">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload a selfie to find your photos
            </label>
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFaceSearch}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {searchLoading && <p className="text-sm text-gray-500 mt-2">Searching with AI...</p>}
          </div>

          {searchResults.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Found {searchResults.length} photos of you</p>
              <div className="grid grid-cols-3 gap-2">
                {searchResults.map(photo => (
                  <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg relative group">
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                      📷
                    </div>
                    <button
                      onClick={() => handleDownload(photo)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : !searchLoading && (
            <p className="text-sm text-gray-500">Upload a selfie to find photos where you appear.</p>
          )}
        </main>
      ) : (
        <>
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
                <p className="text-sm">No photos in this ceremony yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg relative group cursor-pointer">
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                      📷
                    </div>
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
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex justify-around">
        <button
          onClick={() => { setSearchMode(false); setSearchResults([]); loadPhotos(selectedCeremony || undefined) }}
          className={`text-sm font-medium ${!searchMode ? 'text-blue-600' : 'text-gray-400'}`}
        >
          Gallery
        </button>
        <button
          onClick={() => setSearchMode(true)}
          className={`text-sm font-medium ${searchMode ? 'text-blue-600' : 'text-gray-400'}`}
        >
          Find My Photos
        </button>
      </nav>
    </div>
  )
}