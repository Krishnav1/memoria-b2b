'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@memoria/api-client'

interface Event {
  id: string
  name: string
  eventType: string
  status: string
  photoCount: number
  eventDate: string | null
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  created: 'Created',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  delivered: 'Delivered',
  access_granted: 'Access Granted',
  delivery_failed: 'Delivery Failed',
  upload_incomplete: 'Upload Incomplete',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  created: 'bg-blue-100 text-blue-700',
  uploading: 'bg-yellow-100 text-yellow-700',
  uploaded: 'bg-green-100 text-green-700',
  delivered: 'bg-purple-100 text-purple-700',
  access_granted: 'bg-indigo-100 text-indigo-700',
  delivery_failed: 'bg-red-100 text-red-700',
  upload_incomplete: 'bg-orange-100 text-orange-700',
}

export default function DashboardPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: eventsData, error } = await supabase
      .from('events')
      .select('id, name, eventType, status, photoCount, eventDate, createdAt')
      .order('createdAt', { ascending: false })

    if (!error && eventsData) {
      setEvents(eventsData as Event[])
    }
    setLoading(false)
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Delete this event and all its photos? This cannot be undone.')) return
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (!error) {
      setEvents(events => events.filter(e => e.id !== eventId))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading events...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Events</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your wedding photography events</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No events yet</h3>
          <p className="text-sm text-gray-500 mb-6">Create your first event to start delivering photos to couples.</p>
          <Link
            href="/dashboard/events/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/events/${event.id}`} className="block">
                      <span className="text-sm font-medium text-gray-900 hover:text-blue-600">{event.name}</span>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">{event.eventType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{event.photoCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/events/${event.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
