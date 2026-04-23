'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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

interface EventDetail {
  id: string
  name: string
  eventType: string
  status: string
  photoCount: number
  photoGbUsed: number
  qrCode: string | null
  coupleName: string | null
  couplePhone: string | null
  accessExpiresAt: string | null
  deliveredAt: string | null
  createdAt: string
  ceremonies: Ceremony[]
}

const CEREMONY_VISIBILITY_OPTIONS = [
  { value: 'guest', label: 'Guest' },
  { value: 'family', label: 'Family' },
  { value: 'couple_only', label: 'Couple Only' },
]

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingCeremony, setUpdatingCeremony] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: eventData } = await supabase
      .from('events')
      .select('*, ceremonies(*)')
      .eq('id', eventId)
      .single()

    const { data: photosData } = await supabase
      .from('photos')
      .select('id, r2ObjectKey, fileName, ceremonyId')
      .eq('eventId', eventId)
      .order('uploadedAt', { ascending: false })

    if (eventData) setEvent(eventData as EventDetail)
    if (photosData) setPhotos(photosData as Photo[])
    setLoading(false)
  }

  async function updateCeremonyVisibility(ceremonyId: string, visibility: string) {
    setUpdatingCeremony(ceremonyId)
    await supabase.from('ceremonies').update({ visibility }).eq('id', ceremonyId)
    setEvent(ev => ev ? {
      ...ev,
      ceremonies: ev.ceremonies.map(c => c.id === ceremonyId ? { ...c, visibility } : c)
    } : ev)
    setUpdatingCeremony(null)
  }

  async function handleDeliver() {
    if (!event) return
    if (!confirm(`Send magic link to ${event.couplePhone || 'the couple'}?`)) return

    const token = crypto.randomUUID()
    await supabase.from('events').update({
      status: 'delivered',
      magicLinkToken: token,
      deliveredAt: new Date().toISOString(),
    }).eq('id', eventId)

    setEvent(ev => ev ? { ...ev, status: 'delivered', magicLinkToken: token } : ev)
    alert(`Magic link sent! Token: ${token}\n\nIn production, this sends a WhatsApp message.`)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  if (!event) return <div className="text-red-600">Event not found</div>

  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.qrCode}`

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-1 inline-flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Events
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{event.eventType} · {event.photoCount} photos</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/events/${eventId}/upload`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Photos
          </Link>
          {event.status !== 'delivered' && (
            <button
              onClick={handleDeliver}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Deliver to Couple
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* QR Code Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Guest QR Code</h2>
          {event.qrCode ? (
            <div className="text-center">
              <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-xs text-gray-500">QR Placeholder</span>
              </div>
              <p className="text-xs text-gray-500 mb-3 break-all">{qrUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(qrUrl)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy Link
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No QR code yet</p>
          )}
        </div>

        {/* Event Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Event Stats</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Photos</dt>
              <dd className="text-sm font-medium text-gray-900">{event.photoCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Storage Used</dt>
              <dd className="text-sm font-medium text-gray-900">{event.photoGbUsed.toFixed(2)} GB</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Access Expires</dt>
              <dd className="text-sm font-medium text-gray-900">
                {event.accessExpiresAt ? new Date(event.accessExpiresAt).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Delivery Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Delivery Status</h2>
          <div className="space-y-3">
            <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              event.status === 'delivered' ? 'bg-green-100 text-green-700' :
              event.status === 'delivery_failed' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {event.status}
            </div>
            {event.deliveredAt && (
              <p className="text-xs text-gray-500">
                Delivered on {new Date(event.deliveredAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ceremonies */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Ceremonies</h2>
        <div className="space-y-3">
          {event.ceremonies.sort((a, b) => a.sequence - b.sequence).map((ceremony) => (
            <div key={ceremony.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm font-medium text-gray-900">{ceremony.name}</span>
              <select
                value={ceremony.visibility}
                onChange={e => updateCeremonyVisibility(ceremony.id, e.target.value)}
                disabled={updatingCeremony === ceremony.id}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
              >
                {CEREMONY_VISIBILITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Gallery Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700">Photos ({photos.length})</h2>
          <Link
            href={`/dashboard/events/${eventId}/upload`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All & Upload
          </Link>
        </div>
        {photos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No photos uploaded yet</p>
            <Link href={`/dashboard/events/${eventId}/upload`} className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
              Upload your first photos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-3">
            {photos.slice(0, 12).map(photo => (
              <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-400">{photo.fileName || '📷'}</span>
              </div>
            ))}
            {photos.length > 12 && (
              <div className="aspect-square bg-gray-50 rounded-lg flex items-center justify-center">
                <span className="text-xs text-gray-400">+{photos.length - 12} more</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
