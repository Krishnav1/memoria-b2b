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

type Step = 'loading' | 'welcome' | 'gallery'

export default function GuestAccessPage({ params }: { params: Promise<{ qr: string }> }) {
  const [qrCode, setQrCode] = useState<string>('')
  const [step, setStep] = useState<Step>('loading')
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string>('')
  const [isCouple, setIsCouple] = useState(false)
  const [ceremonies, setCeremonies] = useState<Ceremony[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedCeremony, setSelectedCeremony] = useState<string | null>(null)
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState<Photo[]>([])
  const [searchMode, setSearchMode] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [photosLoading, setPhotosLoading] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    params.then(async (p) => {
      setQrCode(p.qr)
      await validateQR(p.qr)
    })
  }, [params])

  async function validateQR(qr: string) {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')

    const { data } = await supabase
      .from('events')
      .select('id, name, status, magicLinkToken, magicLinkTokenExpiry')
      .eq('qrCode', qr)
      .single()

    if (!data) {
      setError('Invalid QR code. This event may have ended.')
      setStep('welcome')
      return
    }

    setEventId(data.id)
    setEventName(data.name)

    // Validate magic link token if present
    if (token) {
      if (data.magicLinkTokenExpiry && new Date(data.magicLinkTokenExpiry) < new Date()) {
        setError('Magic link has expired. Please request a new one from the studio.')
        setStep('welcome')
        return
      }
      if (data.magicLinkToken === token) {
        setIsCouple(true)
        await loadCeremoniesAndPhotos(data.id)
        setStep('gallery')
        return
      }
      // Token provided but doesn't match — fall through to guest flow
    }

    await loadCeremoniesAndPhotos(data.id)
    setStep('welcome')
  }

  async function loadCeremoniesAndPhotos(eid: string) {
    const { data: cerData } = await supabase
      .from('ceremonies')
      .select('id, name, visibility')
      .eq('eventId', eid)
      .order('sequence', { ascending: true })
    if (cerData) setCeremonies(cerData as Ceremony[])
  }

  async function handleEnterGallery(e: React.FormEvent) {
    e.preventDefault()
    if (!guestName.trim()) {
      setError('Enter your name to continue')
      return
    }
    setError('')
    await loadPhotos()
    setStep('gallery')
  }

  async function loadPhotos(ceremonyId?: string) {
    if (!eventId) return
    setPhotosLoading(true)
    setSelectedCeremony(ceremonyId || null)

    let query = supabase
      .from('photos')
      .select('id, r2ObjectKey, fileName, ceremonyId')
      .eq('eventId', eventId)

    if (ceremonyId) query = query.eq('ceremonyId', ceremonyId)

    // Filter out couple-only ceremonies for non-couple guests
    if (!isCouple) {
      const coupleOnlyIds = ceremonies
        .filter(c => c.visibility === 'couple_only')
        .map(c => c.id)
      if (coupleOnlyIds.length > 0) {
        query = query.not('ceremonyId', 'in', `(${coupleOnlyIds.join(',')})`)
      }
    }

    const { data } = await query.order('uploadedAt', { ascending: false })
    if (data) setPhotos(data as Photo[])
    setPhotosLoading(false)
  }

  async function handleFaceSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !eventId) return
    setSearchLoading(true)
    setSearchMode(true)

    try {
      const formData = new FormData()
      formData.append('action', 'search')
      formData.append('selfie', file)
      formData.append('eventId', eventId)

      const session = supabase.auth.session()
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-search-faces`, {
        method: 'POST',
        body: formData,
        headers: session ? { 'Authorization': `Bearer ${session.access_token}` } : {},
      })

      if (res.ok) {
        const { photoIds } = await res.json()
        if (photoIds?.length > 0) {
          const { data } = await supabase
            .from('photos')
            .select('id, r2ObjectKey, fileName, ceremonyId')
            .in('id', photoIds)
          if (data) setSearchResults(data as Photo[])
        }
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleDownload(photo: Photo) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.session()?.access_token || ''}`,
        },
        body: JSON.stringify({
          eventId,
          r2ObjectKey: photo.r2ObjectKey,
          action: 'read',
        }),
      })

      if (res.ok) {
        const { url } = await res.json()
        const a = document.createElement('a')
        a.href = url
        a.download = photo.fileName || 'photo.jpg'
        a.target = '_blank'
        a.click()
      } else {
        alert('Download not available yet.')
      }
    } catch {
      alert('Download failed. Please try again.')
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 text-sm">Loading gallery...</p>
      </div>
    )
  }

  if (step === 'welcome' || !isCouple) {
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
            <form onSubmit={handleEnterGallery} className="space-y-4">
              <div>
                <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  id="guest-name"
                  type="text"
                  required
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Rahul Sharma"
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Enter Gallery
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

  // Gallery view
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white border-b px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{eventName}</h1>
              {isCouple && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  Couple
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Welcome, {guestName || 'Guest'}</p>
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
                className={`flex-shrink-0 px-3 py-1.5 text-sm rounded-full ${
                  selectedCeremony === c.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {c.name}
                {c.visibility === 'couple_only' && !isCouple ? '' : ''}
              </button>
            ))}
          </div>

          <main className="p-4">
            {photosLoading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : photos.length === 0 ? (
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
