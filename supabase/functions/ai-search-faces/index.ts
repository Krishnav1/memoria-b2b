import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// AWS Rekognition client — imported in production via npm package
// deno add npm:@aws-sdk/client-rekognition

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const formData = await req.formData()
    const selfie = formData.get('selfie') as File | null
    const eventId = formData.get('eventId') as string | null

    if (!selfie || !eventId) {
      return new Response(JSON.stringify({ error: 'Missing selfie or eventId' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // TODO: Replace with real AWS Rekognition in production
    // const rekognition = new RekognitionClient({ region: 'ap-south-1' })
    // const imageBytes = await selfie.arrayBuffer()
    //
    // const detectCommand = new DetectFacesCommand({
    //   Image: { Bytes: imageBytes },
    //   QualityFilter: 'AUTO',
    //   FaceAttributes: 'DEFAULT',
    // })
    //
    // const { FaceDetails } = await rekognition.send(detectCommand)
    // if (!FaceDetails || FaceDetails.length === 0) {
    //   return new Response(JSON.stringify({ photoIds: [] }), { headers: CORS_HEADERS })
    // }
    //
    // const searchCommand = new SearchFacesByImageCommand({
    //   CollectionId: `event-${eventId}`,
    //   Image: { Bytes: imageBytes },
    //   FaceMatchThreshold: 80,
    //   MaxFaces: 50,
    // })
    //
    // const { FaceMatches } = await rekognition.send(searchCommand)
    // const photoIds = FaceMatches?.map(m => m.Face?.FaceId).filter(Boolean) || []

    // Demo: return empty results (replace with real Rekognition in production)
    console.log('AI face search placeholder — selfie:', selfie.name, 'eventId:', eventId)

    return new Response(JSON.stringify({
      photoIds: [],
      message: 'AWS Rekognition not yet configured. In production, this returns matching photo IDs.',
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
