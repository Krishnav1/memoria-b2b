'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@memoria/api-client'
import { Button } from '@/components/ui/Button'

const CEREMONY_DEFAULTS = ['Haldi', 'Mehendi', 'Wedding', 'Reception']

export default function NewEventPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    eventType: 'wedding',
    coupleName: '',
    couplePhone: '',
    coupleEmail: '',
    eventDate: '',
    accessDays: '15',
    guestUploadEnabled: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createBrowserClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's studioId
      const { data: userData } = await supabase
        .from('users')
        .select('studioId')
        .eq('id', user.id)
        .single()

      if (!userData) throw new Error('User studio not found')

      const studioId = userData.studioId
      const qrCode = crypto.randomUUID().split('-')[0]
      const accessExpiresAt = new Date()
      accessExpiresAt.setDate(accessExpiresAt.getDate() + parseInt(form.accessDays))

      // Create event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          studioId,
          name: form.name,
          eventType: form.eventType,
          coupleName: form.coupleName,
          couplePhone: form.couplePhone,
          coupleEmail: form.coupleEmail,
          eventDate: form.eventDate ? new Date(form.eventDate).toISOString() : null,
          accessExpiresAt: accessExpiresAt.toISOString(),
          status: 'created',
          qrCode,
          guestUploadEnabled: form.guestUploadEnabled,
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Create default ceremonies
      await supabase.from('ceremonies').insert(
        CEREMONY_DEFAULTS.map((name, idx) => ({
          eventId: eventData.id,
          name,
          sequence: idx,
          visibility: name === 'Wedding' ? 'guest' : 'guest',
        }))
      )

      router.push(`/dashboard/events/${eventData.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create New Event</h1>
        <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new event for your couple.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Event Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Priya & Rahul Wedding"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type
            </label>
            <select
              id="eventType"
              value={form.eventType}
              onChange={e => setForm({ ...form, eventType: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="wedding">Wedding</option>
              <option value="birthday">Birthday</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>

          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
              Event Date
            </label>
            <input
              id="eventDate"
              type="date"
              value={form.eventDate}
              onChange={e => setForm({ ...form, eventDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="coupleName" className="block text-sm font-medium text-gray-700 mb-1">
              Couple Name
            </label>
            <input
              id="coupleName"
              type="text"
              value={form.coupleName}
              onChange={e => setForm({ ...form, coupleName: e.target.value })}
              placeholder="Priya Sharma & Rahul Verma"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="couplePhone" className="block text-sm font-medium text-gray-700 mb-1">
              Couple Phone
            </label>
            <input
              id="couplePhone"
              type="tel"
              value={form.couplePhone}
              onChange={e => setForm({ ...form, couplePhone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="coupleEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Couple Email
            </label>
            <input
              id="coupleEmail"
              type="email"
              value={form.coupleEmail}
              onChange={e => setForm({ ...form, coupleEmail: e.target.value })}
              placeholder="couple@email.com"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="accessDays" className="block text-sm font-medium text-gray-700 mb-1">
              Access Duration (days)
            </label>
            <select
              id="accessDays"
              value={form.accessDays}
              onChange={e => setForm({ ...form, accessDays: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">7 days</option>
              <option value="15">15 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.guestUploadEnabled}
                onChange={e => setForm({ ...form, guestUploadEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Allow guest photo uploads</span>
                <p className="text-xs text-gray-500">Guests can upload up to 50 photos each</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href="/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || !form.name}
          >
            {loading ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  )
}
