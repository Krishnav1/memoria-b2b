import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { S3Client, PutObjectCommand, GetObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_FILE_TYPES = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'mov', 'mp4', 'gif'])

function validateFileType(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return ALLOWED_FILE_TYPES.has(ext)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    )
    const token = authHeader.replace('Bearer ', '')
    console.log('DEBUG token length:', token.length, 'token prefix:', token.slice(0, 20))
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token)
    console.log('DEBUG user:', user?.id, 'error:', userError?.message)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token', debug: userError?.message }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { eventId, fileName, fileSize, action, r2ObjectKey } = await req.json()

    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Missing required field: eventId' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'read') {
      if (!r2ObjectKey) {
        return new Response(JSON.stringify({ error: 'Missing required field: r2ObjectKey' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      )

      const { data: event } = await supabaseAdmin
        .from('events')
        .select('studioId')
        .eq('id', eventId)
        .single()

      if (!event) {
        return new Response(JSON.stringify({ error: 'Event not found' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const r2Endpoint = Deno.env.get('R2_ENDPOINT') ?? ''
      const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
      const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
      const r2Bucket = Deno.env.get('R2_BUCKET') || 'memoria-b2b-photo-testing'

      if (!r2AccessKeyId || !r2SecretAccessKey) {
        return new Response(JSON.stringify({ error: 'R2 not configured' }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const r2 = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint || undefined,
        credentials: {
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
        },
      })

      const getCommand = new GetObjectCommand({ Bucket: r2Bucket, Key: r2ObjectKey })
      const readUrl = await getSignedUrl(r2, getCommand, { expiresIn: 3600 })

      return new Response(JSON.stringify({ url: readUrl }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Default: action === 'write'
    if (!fileName || !fileSize) {
      return new Response(JSON.stringify({ error: 'Missing required fields: fileName, fileSize' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (fileSize <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid file size' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    if (!validateFileType(fileName)) {
      return new Response(JSON.stringify({
        error: 'INVALID_FILE_TYPE',
        message: `File type not allowed. Allowed: ${[...ALLOWED_FILE_TYPES].join(', ')}`,
      }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { data: event } = await supabaseAdmin
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

    const { data: studio } = await supabaseAdmin
      .from('studios')
      .select('photoGbUsed, plans(monthlyGbLimit)')
      .eq('id', event.studioId)
      .single()

    const gbLimit: number = (studio?.plans as any)?.monthlyGbLimit ?? 0
    const fileSizeGB = fileSize / (1024 * 1024 * 1024)

    if (gbLimit > 0 && (studio.photoGbUsed + fileSizeGB) > gbLimit) {
      return new Response(JSON.stringify({
        error: 'GB_POOL_EXCEEDED',
        message: 'Storage limit reached. Contact your studio.',
        usedGB: studio.photoGbUsed,
        limitGB: gbLimit,
      }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const r2Endpoint = Deno.env.get('R2_ENDPOINT') ?? ''
    const r2AccessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
    const r2SecretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const r2Bucket = Deno.env.get('R2_BUCKET') || 'memoria-b2b-photo-testing'

    if (!r2AccessKeyId || !r2SecretAccessKey) {
      return new Response(JSON.stringify({ error: 'R2 not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()
    const hashData = encoder.encode(`${eventId}-${fileName}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', hashData)
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('').slice(0, 16)

    const r2ObjectKeyFinal = `events/${eventId}/photos/${hashHex}`

    const r2 = new S3Client({
      region: 'auto',
      endpoint: r2Endpoint || undefined,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    })

    const command = new PutObjectCommand({
      Bucket: r2Bucket,
      Key: r2ObjectKeyFinal,
    })
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 })

    return new Response(JSON.stringify({
      uploadUrl,
      r2ObjectKey: r2ObjectKeyFinal,
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