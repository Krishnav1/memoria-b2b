# Memoria B2B — Technical Reference

**Status:** Ready for Implementation
**Version:** 0.1
**Last Updated:** 2026-04-22

---

## 1. Overview

Memoria is a B2B platform for wedding photographers to deliver photos to couples and guests.

### Apps
- **Studio Dashboard** — `studio.memorias.in` — Photographer-facing web app
- **Guest PWA** — `g.memorias.in` — Passwordless web experience for guests/couples

### Tech Stack
| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Supabase (Postgres, Auth, Edge Functions, Realtime) |
| Storage | Cloudflare R2 |
| Payments | Razorpay |
| Messaging | WhatsApp Cloud API, Resend |
| Face Recognition | AWS Rekognition (Phase 2) |
| Hosting | Vercel |
| Monorepo | pnpm + Turbo |

### Project Structure
```
memoria-b2b/
├── apps/
│   ├── studio/          # Photographer dashboard (Next.js 15)
│   └── pwa/             # Guest/Couple PWA (Next.js 15, PWA mode)
├── packages/
│   ├── ui/              # Shared UI components (later)
│   ├── api-client/      # Supabase types + client
│   └── config/          # Shared configs (tsconfig, eslint, prettier)
├── supabase/
│   ├── migrations/      # SQL migrations
│   └── functions/       # Edge Functions
├── scripts/
└── docs/
```

---

## 2. User Roles & Access

| Role | Description |
|------|-------------|
| **Photographer** | Studio owner, pays for plans, uploads photos, manages events |
| **Studio Member** | Team member (editor/viewer), accesses studio under photographer |
| **Guest** | Scans QR at wedding, uploads photos, views guest-visible ceremonies |
| **Couple** | Primary couple (bride/groom), gets magic link, full access |
| **Family** | Invited by couple (up to 5), sees family + guest ceremonies |

### Access Paths

| Path | URL | Auth | Sees |
|------|-----|------|------|
| Guest | `g.memorias.in/e/[qr-code]` | Name + Phone OTP | Guest-visible ceremonies only |
| Couple/Family | `g.memorias.in/c/[magic-token]` | Phone OTP (binds token) | ALL ceremonies |

---

## 3. Data Model

### Core Tables

#### `studios`
Photographers/studio owners.
```sql
studios (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  upi_id TEXT,
  bio TEXT,
  slug TEXT UNIQUE NOT NULL,          -- memorias.in/p/[slug]
  plan_type TEXT DEFAULT 'trial',      -- studio_pro | wedding_plan | trial
  plan_tier TEXT,                      -- silver | gold | platinum
  gb_allocated BIGINT DEFAULT 0,
  gb_used BIGINT DEFAULT 0,
  subscription_status TEXT DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  razorpay_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### `studio_members`
Team access.
```sql
studio_members (
  id UUID PRIMARY KEY,
  studio_id UUID REFERENCES studios(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'viewer',          -- admin | editor | viewer
  UNIQUE(studio_id, user_id)
)
-- Index: idx_studio_members_composite (studio_id, user_id, role)
```

#### `events`
Wedding/events.
```sql
events (
  id UUID PRIMARY KEY,
  studio_id UUID REFERENCES studios(id),
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,            -- wedding | birthday | corporate | anniversary | other
  plan_type TEXT NOT NULL,             -- wedding_plan | studio_pro

  couple_name TEXT,
  couple_phone TEXT,
  couple_email TEXT,

  event_date DATE,
  delivery_date DATE,
  expiry_date TIMESTAMPTZ,            -- delivery_date + access_days
  access_days INT DEFAULT 90,

  gb_allocated BIGINT DEFAULT 0,
  gb_used BIGINT DEFAULT 0,

  status TEXT DEFAULT 'draft',        -- draft | upload_in_progress | ready_to_deliver | delivered | expiring_soon | expired | archived
  couple_access_token TEXT UNIQUE,

  downloads_blocked BOOLEAN DEFAULT false,
  downloads_blocked_at TIMESTAMPTZ,
  downloads_blocked_by UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
)
```

#### `ceremonies`
Events contain ceremonies (haldi, mehendi, wedding, reception, etc.).
```sql
ceremonies (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name TEXT NOT NULL,                  -- Haldi, Mehendi, Wedding Ceremony
  order_index INT DEFAULT 0,
  scheduled_time TIMESTAMPTZ,
  duration_minutes INT,
  gb_allocated BIGINT DEFAULT 0
)
```

#### `ceremony_visibility`
Per-ceremony visibility settings.
```sql
ceremony_visibility (
  id UUID PRIMARY KEY,
  ceremony_id UUID UNIQUE REFERENCES ceremonies(id),
  audience_type TEXT DEFAULT 'guest',  -- guest | family | couple_only
  is_active BOOLEAN DEFAULT true,
  locked_by_photographer BOOLEAN DEFAULT false,
  last_changed_by UUID,
  last_changed_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### `media_files`
Photos and videos.
```sql
media_files (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  ceremony_id UUID REFERENCES ceremonies(id),

  file_type TEXT,                      -- photo | video
  mime_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,

  r2_key TEXT NOT NULL,                -- R2 object key
  r2_thumbnail_key TEXT,
  r2_preview_key TEXT,
  r2_web_key TEXT,

  exif_data JSONB,
  width INT,
  height INT,
  duration_seconds INT,
  face_vectors JSONB,

  uploaded_by UUID,
  upload_session_id TEXT,
  status TEXT DEFAULT 'uploaded',      -- uploading | uploaded | processing | ready | error

  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
)
```

#### `guest_sessions`
Guest QR scan access.
```sql
guest_sessions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  device_info JSONB,
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  photos_uploaded INT DEFAULT 0
)
-- Index: idx_guest_sessions_phone (phone)
-- Index: idx_guest_sessions_otp (otp_code)
```

#### `couple_access`
Couple/family magic link access.
```sql
couple_access (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,                 -- couple_primary | couple_secondary | family
  magic_token TEXT UNIQUE NOT NULL,
  invited_by UUID,                     -- self-reference for family tracking
  invite_sent_at TIMESTAMPTZ,
  otp_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ
)
-- Index: idx_couple_access_token (magic_token)
-- Index: idx_couple_access_phone (phone)
```

#### `couple_settings`
Couple preferences per event.
```sql
couple_settings (
  id UUID PRIMARY KEY,
  event_id UUID UNIQUE REFERENCES events(id),
  allow_guest_uploads BOOLEAN DEFAULT true,
  guest_approval_required BOOLEAN DEFAULT false,
  max_family_members INT DEFAULT 5,
  download_allowed_for_guests BOOLEAN DEFAULT true,
  face_search_enabled BOOLEAN DEFAULT true,
  couple_can_view_all BOOLEAN DEFAULT true,
  notify_on_guest_upload BOOLEAN DEFAULT true,
  notify_on_family_join BOOLEAN DEFAULT true
)
```

#### `storage_pools`
Atomic GB tracking for Studio Pro.
```sql
storage_pools (
  id UUID PRIMARY KEY,
  studio_id UUID UNIQUE REFERENCES studios(id),
  gb_allocated BIGINT NOT NULL,
  gb_used BIGINT DEFAULT 0,
  version INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### Atomic Storage Functions
```sql
-- Reserve GB (prevents overselling)
reserve_storage(p_studio_id UUID, p_bytes BIGINT) RETURNS BOOLEAN
-- Uses row-level lock with NOWAIT

-- Release GB back to pool
release_storage(p_studio_id UUID, p_bytes BIGINT) RETURNS BOOLEAN
```

---

## 4. Visibility System

### Levels
| Level | Who Sees |
|-------|----------|
| **Guest** | Guests (QR), Family, Couple |
| **Family** | Family (magic link), Couple |
| **Couple-only** | Couple only |

### Controls
- **Photographer:** Sets default per ceremony, can lock so couple cannot override
- **Couple:** Can override photographer's defaults (if not locked), can block all guest access

### Switch Off Downloads
- Photographer blocks downloads until payment confirmed
- When blocked: couple sees gallery but download button shows "Downloads locked by photographer"
- Guest sees: no download option
- When unblocked: all downloads available immediately

---

## 5. Subscription Models

### Studio Pro (Monthly)
| Feature | Details |
|---------|---------|
| GB Pool | Shared pool across all events |
| Events | Any type (birthday, corporate, etc.) |
| Access Duration | Photographer sets (7/15/30/days) |
| GB Release | Returns to pool when event closed |
| PWA Template | Standard (simpler) |
| ZIP Download | Yes, before expiry |
| Price | ₹599-3,499/month |

### Wedding Plans (Per-Wedding)
| Feature | Details |
|---------|---------|
| GB | Fixed per wedding |
| Events | 1 per plan |
| Access Window | 3 months fixed from delivery |
| GB Release | N/A (one-time purchase) |
| PWA Template | Wedding (full controls) |
| Couple Upsells | Extend ₹299/yr, Permanent ₹799, Memory Book ₹399 |
| Price | ₹799-2,499/wedding |

---

## 6. Authentication Flows

### Studio Auth (Photographer)
1. User enters phone number
2. Supabase Auth sends OTP (`signInWithOtp`)
3. User enters 6-digit OTP
4. `verifyOtp` creates session
5. On signup: create studio + studio_member record

### Guest Auth (QR Path)
1. Guest scans QR code
2. Enters name + phone
3. Edge Function `guest-otp` creates session, sends OTP
4. Guest enters OTP
5. Edge Function verifies OTP, marks `verified_at`
6. Guest can browse gallery + upload photos

### Couple/Family Auth (Magic Link)
1. Photographer delivers event → sends magic link via WhatsApp
2. User clicks link → enters phone
3. Edge Function `couple-magic-link` verifies token + event status
4. User enters OTP (Supabase Auth)
5. Session created, token bound to phone

---

## 7. API Design (Edge Functions)

### `guest-otp`
**Purpose:** Create guest session and send OTP

**Request:**
```json
{ "event_id": "uuid", "name": "Rahul", "phone": "9876543210" }
```

**Response (200):**
```json
{ "success": true, "session_id": "uuid", "message": "OTP sent" }
```

**Security checks:**
- Event must exist (404 if not)
- Event must be `delivered` or `ready_to_deliver` (403 if not)

---

### `couple-magic-link`
**Purpose:** Create couple access and generate magic link

**Request:**
```json
{ "event_id": "uuid", "name": "Rahul", "phone": "9876543210", "email": "rahul@example.com", "role": "couple_primary" }
```

**Response (200):**
```json
{ "success": true, "access_id": "uuid", "magic_link": "https://g.memorias.in/c/token", "expires_at": "2026-07-22T00:00:00Z" }
```

**Security checks:**
- Event must exist (404 if not)
- Event must be `delivered` or `ready_to_deliver` (403 if not)
- Phone must match `couple_phone` if set (403 if mismatch)

---

### `toggle-downloads`
**Purpose:** Block/unblock downloads for an event

**Auth:** Requires photographer admin token

**Request:**
```json
{ "event_id": "uuid", "blocked": true }
```

**Response (200):**
```json
{ "success": true, "downloads_blocked": true }
```

---

## 8. Upload Flow

### Presigned URL Pattern (Phase 2)
```
Browser → Edge Function (get presigned URL) → R2 (direct upload)
                                    ↓
                            Supabase (DB update)
```

Photos upload directly to R2, never touch our servers.

---

## 9. File Naming Conventions

| Path | Purpose |
|------|---------|
| `supabase/functions/auth/guest-otp.ts` | Guest OTP Edge Function |
| `supabase/functions/auth/couple-magic-link.ts` | Magic link Edge Function |
| `supabase/functions/events/toggle-downloads.ts` | Download toggle Edge Function |
| `apps/studio/app/(auth)/login/page.tsx` | Studio login page |
| `apps/studio/app/(auth)/signup/page.tsx` | Studio signup page |
| `apps/studio/app/(dashboard)/events/[id]/settings/page.tsx` | Event settings |
| `apps/pwa/app/e/[qr]/page.tsx` | Guest access page |
| `apps/pwa/app/c/[token]/page.tsx` | Couple access page |
| `packages/api-client/types/database.ts` | Supabase types |
| `packages/api-client/lib/browser.ts` | Browser Supabase client |
| `packages/api-client/lib/server.ts` | Server Supabase client |

---

## 10. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cloudflare R2 (later)
R2_ACCOUNT_ID=your-r2-account-id
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=memoria-photos

# Razorpay (later)
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-secret

# WhatsApp Cloud API (later)
WHATSAPP_ACCESS_TOKEN=your-token
WHATSAPP_PHONE_NUMBER_ID=your-number-id

# Resend (later)
RESEND_API_KEY=your-resend-key

# App URLs
NEXT_PUBLIC_STUDIO_URL=http://localhost:3000
NEXT_PUBLIC_PWA_URL=http://localhost:3001
```

---

## 11. RLS Policies

All tables have Row Level Security enabled:

| Table | Policy |
|-------|--------|
| `studios` | Photographers access own studio |
| `events` | Studio members access studio events |
| `ceremonies` | Access via event |
| `media_files` | Access via event |
| `guest_sessions` | Insert only (no update via client) |
| `couple_access` | Insert only for magic link creation |

---

## 12. Security Hardening (Applied)

After `/plan-eng-review`, these security measures are in the plan:

1. **Event verification** — Guest OTP verifies event status before creating session
2. **Phone verification** — Magic link verifies phone matches couple's registered phone
3. **Auto-generated IDs** — Studio ID uses `crypto.randomUUID()`, not auth.uid()
4. **Rollback on failure** — Signup rolls back studio if membership insert fails
5. **Composite index** — `idx_studio_members_composite(studio_id, user_id, role)` for RLS performance

---

## 13. Test Requirements

### Edge Function Tests
- `guest-otp.test.ts` — invalid event, status check, missing fields, upsert
- `couple-magic-link.test.ts` — not found, status check, phone mismatch

### Page Tests
- `apps/pwa/app/e/[qr]/page.test.ts` — OTP flow, invalid QR, resend
- `apps/studio/app/(auth)/signup/page.test.ts` — rollback behavior

---

## 14. Out of Scope (Phase 1)

- AI Photo Enhancement
- AI Quality Score
- AI Smile Detection
- AI chatbot
- Live Gallery (real-time uploads)
- Video teaser reel
- Mobile app (Play Store)
- RAW file support
- Multi-language UI
- Print ordering
- Commission system

---

## 15. Open Questions

1. Photo storage strategy — Full originals vs compressed?
2. Plan tiers and pricing — GB amounts, pricing TBD
3. Studio Pro event limits — Unlimited or capped?
4. Memory Book PDF — What exactly is this?
5. Extend plan pricing for Studio Pro — TBD
6. Photographer portfolio link — Which tier includes white-label?

---

*Document generated: 2026-04-22*
*Source: Platform Design Spec + Foundation Implementation Plan*
