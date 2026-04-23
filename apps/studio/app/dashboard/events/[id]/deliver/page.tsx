'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@memoria/api-client'

export default function DeliverPage() {
  const params = useParams()
  const eventId = params.id as string
  const [event, setEvent] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single()
    setEvent(data)
    if (data?.status === 'delivered') setSent(true)
    setLoading(false)
  }

  async function handleDeliver() {
    if (!event) return
    setSending(true)
    setError('')

    try {
      const token = crypto.randomUUID()
      const magicLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${token}`

      // Update event status
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: 'delivered', magicLinkToken: token, deliveredAt: new Date().toISOString() })
        .eq('id', eventId)

      if (updateError) throw updateError

      // In production: call Edge Function to send WhatsApp message
      // For now: just mark as sent
      setSent(true)
      setEvent(ev => ev ? { ...ev, status: 'delivered', magicLinkToken: token } : ev)
    } catch (err: any) {
      setError(err.message || 'Failed to deliver')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
  if (!event) return <div className="text-red-600">Event not found</div>

  const magicLink = event.magicLinkToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${event.magicLinkToken}`
    : null

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <Link href={`/dashboard/events/${eventId}`} className="text-sm text-gray-500 hover:text-gray-700 mb-1 inline-flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Deliver to Couple</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {sent || event.status === 'delivered' ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delivered!</h2>
            <p className="text-sm text-gray-500 mb-4">
              Magic link sent to {event.couplePhone || 'the couple'}.
            </p>
            {magicLink && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Magic Link</p>
                <p className="text-sm text-gray-700 break-all">{magicLink}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(magicLink)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-3">Delivery Details</h2>
              <dl className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Couple</dt>
                  <dd className="text-sm font-medium text-gray-900">{event.coupleName || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900">{event.couplePhone || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Photos</dt>
                  <dd className="text-sm font-medium text-gray-900">{event.photoCount}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Clicking "Deliver" will send a WhatsApp message to <strong>{event.couplePhone || 'the couple'}</strong> with a magic link to their gallery.
              </p>
            </div>

            <button
              onClick={handleDeliver}
              disabled={sending}
              className="w-full px-6 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Send Magic Link via WhatsApp
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
