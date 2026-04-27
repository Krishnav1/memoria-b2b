import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import {
  RekognitionClient,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  DescribeCollectionCommand,
  CreateCollectionCommand,
} from 'https://esm.sh/@aws-sdk/client-rekognition'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const formData = await req.formData()
    const action = formData.get('action') as string

    // Auth: verify user has access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const rekognition = new RekognitionClient({
      region: Deno.env.get('AWS_REGION') ?? 'ap-south-1',
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    })

    // ============================================================
    // ACTION: index — index faces from a newly uploaded photo
    // Called by upload page AFTER photo is inserted into Supabase
    // ============================================================
    if (action === 'index') {
      const eventId = formData.get('eventId') as string
      const photoId = formData.get('photoId') as string
      const r2ObjectKey = formData.get('r2ObjectKey') as string

      if (!eventId || !photoId || !r2ObjectKey) {
        return new Response(JSON.stringify({ error: 'Missing eventId, photoId, or r2ObjectKey' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      // Verify event ownership
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, studioId')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        return new Response(JSON.stringify({ error: 'Event not found' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      // Verify user belongs to the studio that owns this event
      const { data: userData } = await supabase
        .from('users')
        .select('studioId')
        .eq('id', user.id)
        .single()

      if (!userData || userData.studioId !== event.studioId) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      // Ensure collection exists for this event
      const collectionId = `event-${eventId}`
      try {
        await rekognition.send(new DescribeCollectionCommand({ CollectionId: collectionId }))
      } catch {
        try {
          await rekognition.send(new CreateCollectionCommand({ CollectionId: collectionId }))
        } catch (createErr: any) {
          if (!createErr.message?.includes('already exists')) {
            return new Response(JSON.stringify({ error: 'Failed to create collection: ' + createErr.message }), {
              status: 500,
              headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            })
          }
        }
      }

      // Fetch photo from R2
      const r2Bucket = Deno.env.get('R2_BUCKET') ?? ''
      const r2Endpoint = Deno.env.get('R2_ENDPOINT') ?? ''
      const r2PublicUrl = `${r2Endpoint}/${r2Bucket}/${r2ObjectKey}`

      let imageBytes: ArrayBuffer
      try {
        const r2Res = await fetch(r2PublicUrl)
        if (!r2Res.ok) {
          return new Response(JSON.stringify({ error: 'Failed to fetch photo from R2: ' + r2Res.status }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          })
        }
        imageBytes = await r2Res.arrayBuffer()
      } catch (fetchErr: any) {
        return new Response(JSON.stringify({ error: 'R2 fetch failed: ' + fetchErr.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      // Index faces
      const indexCommand = new IndexFacesCommand({
        CollectionId: collectionId,
        Image: { Bytes: new Uint8Array(imageBytes) },
        QualityFilter: 'AUTO',
        FaceAttributes: 'DEFAULT',
      })

      let indexedFaces: string[] = []
      try {
        const indexResult = await rekognition.send(indexCommand)
        indexedFaces = (indexResult.FaceRecords ?? [])
          .map(r => r.Face?.FaceId)
          .filter(Boolean) as string[]
      } catch (indexErr: any) {
        console.error('IndexFaces error:', indexErr.message)
        // If no faces found, that's fine — proceed with 0 indexed faces
      }

      // Save face_id -> photo_id mappings to photo_faces table
      if (indexedFaces.length > 0) {
        const inserts = indexedFaces.map(faceId => ({
          photo_id: photoId,
          face_id: faceId,
          event_id: eventId,
        }))

        const { error: insertError } = await supabase
          .from('photo_faces')
          .upsert(inserts, { onConflict: 'photo_id,face_id' })

        if (insertError) {
          console.error('photo_faces insert error:', insertError.message)
        }
      }

      return new Response(JSON.stringify({
        success: true,
        photoId,
        facesIndexed: indexedFaces.length,
        faceIds: indexedFaces,
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // ============================================================
    // ACTION: search — find photos matching a selfie
    // Called by PWA gallery when couple uses "Find My Photos"
    // ============================================================
    if (action === 'search') {
      const selfie = formData.get('selfie') as File | null
      const eventId = formData.get('eventId') as string

      if (!selfie || !eventId) {
        return new Response(JSON.stringify({ error: 'Missing selfie or eventId' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      const collectionId = `event-${eventId}`

      // Verify event exists
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', eventId)
        .single()

      if (eventError || !event) {
        return new Response(JSON.stringify({ error: 'Event not found' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      // Detect faces in the selfie
      const selfieBytes = await selfie.arrayBuffer()
      const detectCommand = new SearchFacesByImageCommand({
        CollectionId: collectionId,
        Image: { Bytes: new Uint8Array(selfieBytes) },
        FaceMatchThreshold: 80,
        MaxFaces: 50,
      })

      let matchedFaceIds: string[] = []
      try {
        const searchResult = await rekognition.send(detectCommand)
        matchedFaceIds = (searchResult.FaceMatches ?? [])
          .map(m => m.Face?.FaceId)
          .filter(Boolean) as string[]
      } catch (searchErr: any) {
        // Collection might not exist yet — return empty
        if (!searchErr.message?.includes('CollectionDoesNotExist')) {
          console.error('SearchFacesByImage error:', searchErr.message)
        }
      }

      if (matchedFaceIds.length === 0) {
        return new Response(JSON.stringify({
          photoIds: [],
          message: 'No matching faces found in this event gallery.',
        }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      // Map face IDs back to photo IDs
      const { data: faceMatches, error: dbError } = await supabase
        .from('photo_faces')
        .select('photo_id')
        .eq('event_id', eventId)
        .in('face_id', matchedFaceIds)

      if (dbError) {
        return new Response(JSON.stringify({ error: 'Database query failed: ' + dbError.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      }

      // Deduplicate photo_ids (one photo may have multiple faces matched)
      const uniquePhotoIds = [...new Set((faceMatches ?? []).map(f => f.photo_id))]

      return new Response(JSON.stringify({
        photoIds: uniquePhotoIds,
        matchCount: uniquePhotoIds.length,
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Unknown action
    return new Response(JSON.stringify({ error: 'Invalid action. Use "index" or "search".' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error('ai-search-faces error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})