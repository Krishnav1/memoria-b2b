'use client'

import React from 'react'
import { useState } from 'react'
import { createBrowserClient } from '@memoria/api-client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create auth user
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
          },
        },
      })

      if (authError) throw authError

      if (data.user) {
        // Create studio record
        const studioId = crypto.randomUUID()
        const slug = form.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') +
          '-' +
          crypto.randomUUID().split('-')[0]

        const { error: studioError } = await supabase
          .from('studios')
          .insert({
            id: studioId,
            name: form.name,
            email: form.email,
            slug: slug,
          })

        if (studioError) throw studioError

        // Create user record linked to studio
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: form.email,
            name: form.name,
            studioId: studioId,
            role: 'OWNER',
          })

        if (userError) {
          // ROLLBACK: If user insert fails, remove the studio we just created
          await supabase.from('studios').delete().eq('id', studioId)
          throw userError
        }

        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Account Created!</h2>
            <p className="text-gray-600 mb-6">
              We sent a verification email to {form.email}.<br />
              Please check your inbox and click the link to verify your account.
            </p>
            <Link
              href="/login"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create your Studio Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Studio Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <Button
            type="submit"
            disabled={loading || form.password.length < 6}
            className="w-full"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}