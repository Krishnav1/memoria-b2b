# Couple Gallery Plan

## Context
PR #4 shipped: R2 upload wiring, GB pool enforcement, WhatsApp delivery stub.
Next B2B feature: the couple-facing gallery that couples access via magic link.

The existing `/e/[qr]` PWA page handles guest phone verification. It needs a parallel
couple-only flow: magic link token → bypass verification → see full gallery including
"couple_only" ceremonies.

## What Already Exists
- `apps/pwa/app/e/[qr]/page.tsx` — Combined guest/couple page with ceremony tabs,
  photo grid placeholder, AI search stub, download stub
- `apps/studio/app/dashboard/events/[id]/page.tsx` — handleDeliver() sends magic link
  with token via WhatsApp (or fallback alert)
- Supabase `events.magicLinkToken` field — set on delivery

## NOT in Scope
- AI face search (separate feature, needs its own Edge Function)
- Actual R2 photo serving (needs R2 credentials + public bucket/CDN)
- WhatsApp API approval (business verification, separate track)
- Email fallback delivery

## Sub-Problems

| # | Sub-problem | Existing code | File |
|---|-------------|---------------|------|
| 1 | Validate magic link token, auto-login couple | TODO in page | `apps/pwa/app/e/[qr]/page.tsx` |
| 2 | Enforce "couple_only" ceremony visibility | No filter logic | `apps/pwa/app/e/[qr]/page.tsx` |
| 3 | Load actual photos from R2 (or mock) | Shows 📷 placeholder | `apps/pwa/app/e/[qr]/page.tsx` |
| 4 | Real download (presigned R2 URL) | Stub alert() | `apps/pwa/app/e/[qr]/page.tsx` |
| 5 | Couple-only ceremony edit toggle | None | `apps/pudio/app/e/[qr]` |

## User Story
Studio clicks "Deliver" → couple receives WhatsApp link with magic token →
couple opens `/e/wedding123?token=abc` → sees full gallery including private
ceremonies → downloads original full-res photos.

## Implementation

### Fix 1: Token Validation in `/e/[qr]/page.tsx`

On page load, check for `token` query param:
```typescript
// In useEffect, after QR validation:
const urlParams = new URLSearchParams(window.location.search)
const token = urlParams.get('token')

if (token && eventId) {
  // Verify token matches
  const { data: event } = await supabase
    .from('events')
    .select('magicLinkToken, couplePhone')
    .eq('id', eventId)
    .single()

  if (event?.magicLinkToken === token) {
    setIsCouple(true) // bypass phone verification, show couple-only ceremonies
    setStep('gallery')
    return
  }
}
```

### Fix 2: Couple-Only Visibility Filter

Add `isCouple` state. When filtering ceremonies or photos:
```typescript
// In loadPhotos:
let query = supabase
  .from('photos')
  .select('id, r2ObjectKey, fileName, ceremonyId')
  .eq('eventId', eventId)

// For couple-only ceremonies, include regardless:
if (!isCouple) {
  const coupleOnlyIds = ceremonies
    .filter(c => c.visibility === 'couple_only')
    .map(c => c.id)
  query = query.not('ceremonyId', 'in', `(${coupleOnlyIds.join(',')})`)
}
```

### Fix 3: R2 Photo Loading

Since R2 credentials aren't set up yet, use a mock image approach:
```typescript
// Replace 📷 placeholder with real URLs:
const r2Url = photo.r2ObjectKey
  ? `https://placeholder.memoria.workers.dev/${photo.r2ObjectKey}`
  : null

// In production: call Edge Function to get presigned read URL
// For now: use direct R2 public URL or placeholder
```

### Fix 4: Download Flow

```typescript
async function handleDownload(photo: Photo) {
  // Get presigned read URL from Edge Function
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, r2ObjectKey: photo.r2ObjectKey, action: 'read' }),
  })

  if (res.ok) {
    const { url } = await res.json()
    const a = document.createElement('a')
    a.href = url
    a.download = photo.fileName || 'photo.jpg'
    a.click()
  } else {
    alert('Download not available yet.')
  }
}
```

### Fix 5: Read Presigned URL Edge Function

Extend `supabase/functions/presigned-url/index.ts` to handle `action: 'read'`:
```typescript
// Add after existing PUT handler:
if (action === 'read') {
  const getCommand = new GetObjectCommand({ Bucket: r2Bucket, Key: r2ObjectKey })
  const readUrl = await getSignedUrl(r2, getCommand, { expiresIn: 3600 })
  return new Response(JSON.stringify({ url: readUrl }), { headers: CORS_HEADERS })
}
```

## Dream State
Couple clicks WhatsApp link → gallery loads instantly (token validated) →
full-res photos downloadable → couple_only ceremonies visible only to couple.

## Error & Rescue Registry
| Error | Cause | Fix |
|-------|-------|-----|
| Invalid/expired token | Token mismatch or event rescinded | Show guest verification fallback |
| R2 not configured | Missing env vars | Show placeholder with message |
| Photo not found in R2 | Key mismatch | Show broken image placeholder |

## Failure Modes Registry
| Mode | Severity | Mitigation |
|------|----------|------------|
| Token leaked | High | One-time use or short expiry (24h) |
| R2 down | Medium | Show placeholder, retry button |
| Couple phone changed | Low | Guest verification as fallback |
