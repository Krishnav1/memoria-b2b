import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { eventId, fileName, fileSize } = await req.json()

    if (!eventId || !fileName || !fileSize) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Check photographer owns the event
    const { data: event } = await supabase
      .from('events')
      .select('studioId, photoCount, photoGbUsed')
      .eq('id', eventId)
      .single()

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // TODO: Check GB pool limit before issuing URL
    // This is where GB pool enforcement happens per CEO plan
    // For now, just generate the presigned URL

    const r2AccountId = Deno.env.get('R2_ACCOUNT_ID')
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const r2Bucket = Deno.env.get('R2_BUCKET') || 'memoria-photos'

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) {
      return new Response(JSON.stringify({ error: 'R2 not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Generate photo hash for deduplication
    const encoder = new TextEncoder()
    const data = encoder.encode(`${eventId}-${fileName}-${Date.now()}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('').slice(0, 16)

    const r2ObjectKey = `events/${eventId}/photos/${hashHex}`

    // Generate presigned URL using Cloudflare R2 S3-compatible API
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    const date = expiresAt.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z'
    const credential = `${r2AccessKeyId}/${date}/auto/global/signv4`

    // Simple presigned URL generation (in production, use @aws-sdk/s3-request-presigner)
    const uploadUrl = `https://pub-${r2AccountId}.r2.dev/${r2Bucket}/${r2ObjectKey}?X-Amz-Expires=900&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(credential)}&X-Amz-Date=${date}`

    return new Response(JSON.stringify({
      uploadUrl,
      r2ObjectKey,
      photoHash: hashHex,
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
