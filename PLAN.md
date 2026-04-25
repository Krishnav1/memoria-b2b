# R2 Upload Wiring Plan

## Context
The R2 upload demo stub exists but has 5 production gaps. This plan wires it to real Cloudflare R2 + Supabase.

## What Already Exists
- `supabase/functions/presigned-url/index.ts` — Edge Function with manual presigned URL construction (needs AWS SDK)
- `apps/studio/app/dashboard/events/[id]/upload/page.tsx` — Upload UI with stub error handling
- `apps/studio/app/dashboard/events/[id]/page.tsx` — Event detail with `handleDeliver()` stub

## NOT in Scope
- WhatsApp message template design (just the API wiring)
- Photo gallery UI redesign
- Deduplication logic (SHA-256 already planned but not wired)

## Sub-Problems

| # | Sub-problem | Existing code | File |
|---|-------------|---------------|------|
| 1 | Replace manual presigned URL construction with AWS SDK | Lines 78-84 in Edge Function | `supabase/functions/presigned-url/index.ts` |
| 2 | Add GB pool enforcement before issuing presigned URLs | TODO at line 52 | `supabase/functions/presigned-url/index.ts` |
| 3 | Track `photoGbUsed` after upload completes | Photo insert at line 108 | `apps/studio/app/dashboard/events/[id]/upload/page.tsx` |
| 4 | Wire WhatsApp Cloud API in `handleDeliver()` | Stub at lines 91-104 | `apps/studio/app/dashboard/events/[id]/page.tsx` |
| 5 | Improve upload error UX | Bare `catch(err)` at line 119 | `apps/studio/app/dashboard/events/[id]/upload/page.tsx` |

## Implementation

### Fix 1: Wire `@aws-sdk/s3-request-presigner` in Edge Function

Replace manual SigV4 construction at `supabase/functions/presigned-url/index.ts:78-84` with:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${r2AccountId}.r2.dev`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const command = new PutObjectCommand({ Bucket: r2Bucket, Key: r2ObjectKey })
const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 })
```

### Fix 2: GB Pool Check in Edge Function

Before issuing URL, check `studios.photoGbUsed` vs `plans.monthlyGbLimit`:
```typescript
// TODO: Check GB pool limit before issuing URL
const { data: studio } = await supabase
  .from('studios')
  .select('photoGbUsed, plans(monthlyGbLimit)')
  .eq('id', studioId)
  .single()

const gbLimit = studio.plans?.monthlyGbLimit ?? 0
if ((studio.photoGbUsed + fileSizeGB) > gbLimit) {
  return new Response(JSON.stringify({ error: 'GB pool exceeded' }), { status: 403 })
}
```

### Fix 3: `photoGbUsed` Tracking in Upload Page

After successful upload + photo insert, update `events.photoGbUsed`:
```typescript
// After successful upload and photo insert
const fileSizeGB = file.size / (1024 * 1024 * 1024)
await supabase.rpc('increment_photo_gb_used', {
  event_id: eventId,
  gb_amount: fileSizeGB
})
```

### Fix 4: WhatsApp Cloud API in `handleDeliver()`

Replace `alert()` with WhatsApp API call:
```typescript
const magicLinkUrl = `${window.location.origin}/e/${event.qrCode}?token=${token}`
await fetch('https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_WHATSAPP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: event.couplePhone.replace(/\D/g, ''),
    type: 'text',
    text: { body: `Your wedding photos are ready! ${magicLinkUrl}` }
  })
})
```

### Fix 5: Upload Error UX

Replace bare `catch(err)` with structured error:
```typescript
catch(err) {
  let message = 'Upload failed. Please try again.'
  if (err.message?.includes('403')) message = 'Storage limit reached. Contact your studio.'
  if (err.message?.includes('size')) message = 'File too large. Max 100MB per photo.'
  setError(message)
}
```

## Dream State
Studio uploads photo -> Edge Function checks GB pool -> issues presigned URL -> browser uploads directly to R2 -> on completion, Supabase records photo and increments GB counter. Couple receives WhatsApp link. All production-ready, not a demo stub.

## Error & Rescue Registry
| Error | Cause | Fix |
|-------|-------|-----|
| 403 on upload | GB pool exceeded | Clear error message, prevent upload |
| R2 credential bad | Wrong env vars | Log which cred failed |
| WhatsApp API fail | Rate limit or bad token | Fall back to showing link |
| Duplicate photo | SHA-256 collision | Accept, dedupe on read |

## Failure Modes Registry
| Mode | Severity | Mitigation |
|------|----------|------------|
| R2 down | High | Presigned URL fails gracefully |
| WhatsApp rate limit | Medium | Show magic link as fallback |
| GB counter drift | Low | Periodic reconciliation job (deferred) |
