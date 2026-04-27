'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@memoria/api-client'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_FILES = 2000
const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export default function UploadPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient()

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArr = Array.from(newFiles)
    const validFiles = fileArr.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        setError(`File ${f.name} is too large. Max 50MB.`)
        return false
      }
      return true
    })

    if (files.length + validFiles.length > MAX_FILES) {
      setError(`Cannot add ${validFiles.length} files. Event limit is ${MAX_FILES} photos.`)
      return
    }

    setFiles(prev => [
      ...prev,
      ...validFiles.map(file => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: 'pending' as const,
      }))
    ])
    setError('')
  }, [files.length])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  async function uploadPhoto(uploadFile: UploadFile, eventId: string): Promise<string> {
    const { file } = uploadFile
    const photoHash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()).then(h => {
      return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
    })
    const r2ObjectKey = `events/${eventId}/photos/${photoHash}`

    // In production: call Edge Function to get presigned URL
    // For now: simulate upload completion
    return r2ObjectKey
  }

  async function handleUpload() {
    if (files.length === 0) return

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      setError('Please log in again to upload photos.')
      setTimeout(() => { window.location.href = '/login' }, 2000)
      return
    }

    const sessionResult = supabase.auth.session()
    if (!sessionResult?.session?.access_token) {
      setError('Please log in again to upload photos.')
      setTimeout(() => { window.location.href = '/login' }, 2000)
      return
    }

    setUploading(true)
    setError('')

    const pendingFiles = files.filter(f => f.status === 'pending')
    const accessToken = sessionResult.session.access_token

    for (const uploadFile of pendingFiles) {
      setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f))

      try {
        // Get presigned URL from Edge Function
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/presigned-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ eventId, fileName: uploadFile.file.name, fileSize: uploadFile.file.size }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          const msg = errData.error || errData.message || 'Failed to get upload URL'
          throw new Error(`${msg} (${res.status})`)
        }

        const { uploadUrl, r2ObjectKey } = await res.json()

        // Upload to R2
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: uploadFile.file,
          headers: { 'Content-Type': uploadFile.file.type },
        })

        if (!uploadRes.ok) throw new Error('R2 upload failed')

        // Record in Supabase
        const { data: photoRecord, error: dbError } = await supabase.from('photos').insert({
          eventId,
          photoHash: r2ObjectKey.split('/').pop() || '',
          r2ObjectKey,
          fileName: uploadFile.file.name,
          fileSizeBytes: uploadFile.file.size,
        }).select('id').single()

        if (dbError) throw dbError

        // Index faces for AI search (non-blocking — don't fail upload if indexing fails)
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-search-faces`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: new URLSearchParams({
            action: 'index',
            eventId,
            photoId: photoRecord.id,
            r2ObjectKey,
          }),
        }).catch(err => console.error('Face indexing failed:', err)) // fire and forget

        // GB tracking handled by DB trigger on photos table
        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, progress: 100, status: 'done' } : f))
      } catch (err: any) {
        let message = 'Upload failed. Please try again.'
        if (err?.message?.includes('GB_POOL_EXCEEDED') || err?.message?.includes('403')) {
          message = 'Storage limit reached. Contact your studio.'
        } else if (err?.message?.includes('R2 upload failed')) {
          message = 'Upload failed. Check your connection and try again.'
        } else if (uploadFile.file.size > 100 * 1024 * 1024) {
          message = 'File too large. Max 100MB per photo.'
        }
        setFiles(prev => prev.map(f => f.id === uploadFile.id ? { ...f, status: 'error', error: message } : f))
      }
    }

    setUploading(false)
  }

  const doneCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <Link href={`/dashboard/events/${eventId}`} className="text-sm text-gray-500 hover:text-gray-700 mb-1 inline-flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Upload Photos</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-6 ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && addFiles(e.target.files)} />
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          {dragOver ? 'Drop photos here' : 'Drag & drop photos, or click to browse'}
        </p>
        <p className="text-xs text-gray-500">Up to {MAX_FILES} photos, max 50MB each</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">{files.length} files selected</span>
            <button
              onClick={() => setFiles([])}
              className="text-xs text-gray-500 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{f.file.name}</p>
                  <p className="text-xs text-gray-400">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div className="w-32">
                  {f.status === 'done' && (
                    <span className="text-xs text-green-600 font-medium">Done</span>
                  )}
                  {f.status === 'error' && (
                    <span className="text-xs text-red-600 font-medium">{f.error || 'Failed'}</span>
                  )}
                  {f.status === 'pending' && (
                    <span className="text-xs text-gray-400">Ready</span>
                  )}
                  {f.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${f.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleUpload}
            disabled={uploading || files.filter(f => f.status === 'pending').length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} Photos`}
          </button>
          {doneCount > 0 && <span className="text-sm text-green-600">{doneCount} uploaded</span>}
          {errorCount > 0 && <span className="text-sm text-red-600">{errorCount} failed</span>}
        </div>
      )}
    </div>
  )
}
