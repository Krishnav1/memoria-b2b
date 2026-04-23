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
    const { eventId, phone, message } = await req.json()

    if (!eventId || !phone) {
      return new Response(JSON.stringify({ error: 'Missing eventId or phone' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get event and magic link
    const { data: event } = await supabase
      .from('events')
      .select('id, coupleName, magicLinkToken')
      .eq('id', eventId)
      .single()

    if (!event?.magicLinkToken) {
      return new Response(JSON.stringify({ error: 'Magic link not generated. Run deliver first.' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const magicLink = `https://memoria.in/c/${event.magicLinkToken}`
    const displayName = event.coupleName || 'your couple'

    // TODO: Replace with real WhatsApp Cloud API in production
    // const whatsappApiUrl = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`
    // const payload = {
    //   messaging_product: 'whatsapp',
    //   to: phone.replace('+', ''),
    //   type: 'template',
    //   template: {
    //     name: 'magic_link',
    //     language: { code: 'en' },
    //     components: [{
    //       type: 'body',
    //       components: [{ type: 'text', text: `${displayName}'s wedding photos are ready! ${magicLink}` }]
    //     }]
    //   }
    // }
    //
    // const whatsappRes = await fetch(whatsappApiUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(payload),
    // })

    // Demo: simulate success
    console.log('WhatsApp send placeholder — to:', phone, 'link:', magicLink)

    // Log the delivery attempt
    await supabase.from('access_logs').insert({
      eventId,
      visitorType: 'couple',
      visitorToken: event.magicLinkToken,
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'WhatsApp message would be sent in production with real WhatsApp Cloud API credentials.',
      link: magicLink,
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
