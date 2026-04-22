 # Memoria B2B Platform — Design Specification

**Status:** Ready for Implementation
**Date:** 2026-04-22
**Version:** 0.2

---

## 1. Overview

Memoria is a B2B platform for wedding photographers to deliver photos to couples and guests. The platform consists of:

- **Studio Dashboard** — Photographer-facing web app for managing events, uploads, and deliveries
- **Guest PWA** — Passwordless web experience for wedding guests and couples
- **Backend** — Supabase (Postgres, Auth, Edge Functions, Realtime) + Cloudflare R2 storage
- **Integrations** — Razorpay (payments), WhatsApp Cloud API (messaging), Resend (email)

---

## 2. User Roles & Access

### 2.1 User Roles

| Role | Description |
|------|-------------|
| **Photographer** | Studio owner, pays for plans, uploads photos, manages events |
| **Studio Member** | Team member (editor/viewer), accesses studio under photographer's account |
| **Guest** | Scans QR at wedding, uploads photos, views guest-visible ceremonies |
| **Couple** | Primary couple (bride/groom), gets magic link, full access to all ceremonies |
| **Family** | Invited by couple (up to 5), sees family-visible + guest-visible ceremonies |

### 2.2 PWA Access Paths

**Guest Path** — `g.memorias.in/e/[qr-code]`
- Entry: QR scan (printed or displayed at venue)
- Auth: Name + Phone + OTP (passwordless)
- Sees: Only ceremonies marked "Guest visible" (current state)
- Actions: Browse gallery, upload photos (≤50), face search, video blessing, download ≤10 free

**Couple/Family Path** — `g.memorias.in/c/[magic-token]`
- Entry: Magic link sent via WhatsApp after photographer delivers
- Auth: Phone OTP (binds token to phone number)
- Sees: ALL ceremonies by default (couple has master access)
- Couple actions: Override visibility, block guests, approve uploads, invite family, unlimited downloads
- Family actions: View (family + guest ceremonies), upload, cannot change settings

---

## 3. Visibility System

### 3.1 Ceremony Visibility Levels

| Level | Who Sees It |
|-------|-------------|
| **Guest** | Guests (QR path), Family, Couple |
| **Family** | Family (magic link), Couple |
| **Couple-only** | Couple only |

### 3.2 Visibility Controls

**Photographer (Studio Dashboard):**
- Sets default visibility per ceremony when creating event
- Can **lock** a ceremony so couple cannot override
- Can revoke couple's ability to change visibility entirely

**Couple (PWA Settings):**
- Can override photographer's defaults (if not locked)
- Can make Guest → Private or Family → Guest
- Can **block all guest access** with one toggle
- Can reopen blocked access

**Data Model:**
```
ceremony_visibility
├── ceremony_id
├── audience_type ENUM('guest', 'family', 'couple_only')
├── is_active BOOLEAN
├── locked_by_photographer BOOLEAN
└── last_changed_by, last_changed_at

couple_access
├── event_id
├── phone, email
├── role ENUM('couple_primary', 'couple_secondary', 'family')
├── magic_link_token
├── invited_by (self-reference for family tracking)
└── expires_at

event_settings
├── event_id
├── downloads_blocked BOOLEAN (default: false)
├── blocked_at TIMESTAMP
├── blocked_by USER_ID
└── unblocked_at TIMESTAMP
```

### 3.3 Photographer Control: Switch Off Downloads

**Critical photographer feature** — Photographer can block downloads until payment received from couple.

**When blocked:**
- Couple/family see gallery but download button shows: "Downloads locked by photographer"
- Guest sees: No download option available
- WhatsApp message to couple: "Your gallery is ready! Photos will be unlocked once photographer confirms payment."

**When unblocked:**
- All downloads immediately available
- Couple notified via WhatsApp

---

## 4. Subscription Models

### 4.1 Studio Pro (Monthly Subscription)

- **GB Pool**: Shared pool across all events (e.g., 300GB for Growth plan)
- **Events**: Any event type (birthday, corporate, anniversary, etc.) — photographer decides per event
- **Access Duration**: Photographer sets when creating event (7 days / 15 days / 30 days / Until [date])
- **GB Release**: When photographer closes event, GB returns to pool immediately
- **Archive**: After access window closes, photos move to cold storage
- **PWA Template**: Standard template (simpler than Wedding Plan)
- **Expiry Notifications**: 2 days before + 1 day before warnings via WhatsApp
- **ZIP Download**: Couple can download all photos as ZIP before expiry (free)

### 4.2 Wedding Plans (Per-Wedding)

- **GB**: Fixed per wedding (Silver 25GB, Gold 50GB, Platinum 100GB — TBD)
- **Events**: For wedding events — photographer chooses Wedding Plan vs Studio Pro per event
- **Access Window**: 3 months fixed from delivery date
- **GB Release**: N/A — one-time purchase, not from pool
- **Archive**: Day 83 warning, Day 90 auto-archive, couple upsell triggers
- **PWA Template**: Wedding-specific template with full couple/family controls
- **Couple Upsells**: Extend (₹299/yr), Permanent (₹799), Memory Book (₹399)

### 4.3 Plan Comparison (TBD)

| Feature | Studio Pro | Wedding Plans |
|---------|------------|---------------|
| GB allocation | Pool (reusable) | Fixed per wedding |
| Event types | Any (birthday, corporate, etc.) | Wedding (photographer chooses) |
| Access duration | Photographer sets (7/15/30/days) | 3 months fixed |
| PWA template | Standard (simpler) | Wedding (full controls) |
| Couple upsells | Extend pricing TBD | Extend ₹299/yr, Permanent ₹799 |
| ZIP download | Yes, before expiry | Yes, before expiry |
| Price | ₹599-3,499/month | ₹799-2,499/wedding |

| Feature | Studio Pro | Wedding Plans |
|---------|------------|---------------|
| GB allocation | Pool (reusable) | Fixed per wedding |
| Event limit | Unlimited | 1 per plan |
| Access window | Photographer-controlled | 3 months fixed |
| Price | ₹599-3,499/month | ₹799-2,499/wedding |

---

## 5. Photo Storage Strategy

**Status:** TBD — User needs to decide

### Option A: Full Originals Always
- Upload: 40MB → Store 40MB
- Download: 40MB original
- Cost: Highest (200GB per 5000-photo wedding)
- User experience: Maximum quality

### Option B: Compressed Only
- Upload: 40MB → Compress to ~10MB → Store 10MB
- Download: 10MB (high quality, ~99% visually identical)
- Cost: 4x cheaper
- User experience: 99% won't notice difference

### Option C: Tiered by Access (Recommended pending decision)
- Active (0-90 days): Store 40MB originals
- Extended/Permanent: Keep originals
- Archived (not paid): Compress to 10MB, originals deleted
- Cost: Balanced

**Open Question:** What does the photographer deliver to couples directly? Does Memoria need to be the full delivery mechanism for 40MB originals?

---

## 6. AI Features

### Phase 1 AI (Launch Blockers)

| Feature | Description | Impact |
|---------|-------------|--------|
| **Face Recognition** | AWS Rekognition for face indexing and search. Guest uploads selfie → AI finds their photos. | Core value proposition |
| **AI Best Moments** | AI curates top 50/100/200 photos from event gallery. Uses composition, focus, emotion, uniqueness scoring. | Couples save hours of scrolling |

### AI Best Moments: Quality Standards
Must be **better than competitors** (Kwikpic, Samaro):
- Detects blurry/soft-focus photos → exclude automatically
- Detects closed eyes → exclude from "best"
- Detects duplicates (burst mode) → show one
- Composition scoring → prioritize rule-of-thirds, leading lines
- Emotion detection → prioritize smiling, candid moments
- Group photo detection → flag separately for couples
- Low-light detection → quality flag for evening ceremonies

### Phase 2 AI (Post-Launch)

- AI Photo Enhancement (lighting, color correction)
- AI Quality Score (flag blurry/duplicate photos before delivery)
- AI Smile Detection ("find all photos where everyone is smiling")
- AI chatbot for couple support

---

## 7. Photographer Portfolio Link

Each photographer gets a **shareable mini-website**:

**URL:** `memorias.in/p/[photographer-slug]`

**Contains:**
- Photographer's name, logo, bio
- Past weddings gallery (with permission)
- Services offered (wedding, pre-wedding, corporate)
- Reviews/testimonials
- WhatsApp contact button
- "View our recent work" → links to public gallery

**Plan tiers (TBD):**
- Free: "Powered by Memoria" badge
- Studio Pro: White-label, own domain

---

## 8. Revenue Model

### 6.1 Memoria Revenue (100% — No Commission)

| Revenue Stream | Amount | Who Pays |
|----------------|--------|----------|
| Wedding Plans | ₹799-2,499 | Photographer |
| Studio Pro | ₹599-3,499/month | Photographer |
| Extend Access | ₹299/year | Couple |
| Permanent Memory | ₹799 one-time | Couple |
| Memory Book PDF | ₹399 one-time | Couple |

### 6.2 What Memoria Does NOT Take
- No % of photographer's fees to couples
- No commission on any couple upsell
- Pure wholesale model

---

## 9. Project Structure

### 7.1 Monorepo (pnpm + Turbo)

```
memoria-b2b/
├── apps/
│   ├── studio/            # Photographer dashboard (Next.js 15)
│   │   ├── app/           # App Router
│   │   ├── components/
│   │   └── ...
│   └── pwa/              # Guest/Couple PWA (Next.js 15, PWA mode)
│       ├── app/
│       └── ...
├── packages/
│   ├── ui/               # Shared UI components
│   ├── api-client/       # Supabase types + client
│   └── config/           # tsconfig, eslint, prettier
├── supabase/
│   ├── migrations/        # SQL migrations
│   └── functions/        # Edge Functions
├── scripts/              # DevOps scripts
├── docs/                 # Documentation
├── turbo.json            # Turbo pipeline
├── pnpm-workspace.yaml   # pnpm workspace
└── .env.example
```

### 7.2 Key Technologies

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15 (App Router), TypeScript |
| Backend | Supabase (Postgres, Auth, Edge Functions, Realtime) |
| Storage | Cloudflare R2 |
| Payments | Razorpay |
| Messaging | WhatsApp Cloud API, Resend |
| Face Recognition | AWS Rekognition (Phase 2) |
| Hosting | Vercel |
| Monorepo | pnpm + Turbo |

---

## 10. Core Flows

### 8.1 Photographer: First Wedding

1. Sign up (phone OTP) → studio.memorias.in
2. Complete profile (name, logo, UPI ID for refunds)
3. Choose plan: Wedding Plan (per-wedding) OR Studio Pro (monthly)
4. Pay via Razorpay → Plan activates
5. Create event → Add ceremonies → Allocate GB
6. Upload photos (chunked, resumable, direct-to-R2)
7. Toggle guest upload, generate QR
8. Hit "Deliver" → WhatsApp sent to couple with magic link
9. Track access, receive payments

### 8.2 Guest: At Wedding

1. Scan QR → `g.memorias.in/e/[qr]`
2. Enter name + phone → OTP verification
3. Browse guest-visible ceremonies
4. Face search: upload selfie → AI finds photos
5. Upload own photos (max 50, counts against wedding GB)
6. Record video blessing
7. Download ≤10 free, >10 prompts app install

### 8.3 Couple: After Delivery

1. Receive WhatsApp magic link
2. Verify phone via OTP
3. View ALL ceremonies (private included)
4. Adjust visibility settings
5. Invite family members (up to 5)
6. Download unlimited
7. Purchase: Extend (₹299/yr), Permanent (₹799), Memory Book (₹399)

---

## 11. Out of Scope (Phase 1)

**AI Features (Phase 2+):**
- AI Photo Enhancement
- AI Quality Score (flag bad photos)
- AI Smile Detection
- AI chatbot for couple support
- Live Gallery during event (real-time uploads)
- Video teaser reel auto-generation

**Other (Future Phases):**
- Mobile app (Play Store) — Agency build, separate repo
- B2C Circles feature — Mobile app territory
- Year in Review — Phase 5
- RAW file support — JPEG/HEIC/MP4 only
- Multi-language UI — English + Hinglish only
- Print ordering integration
- Commission system — None (wholesale only)

---

## 12. Scale Considerations

### Phase 1 Scale (0–1,000 photographers)
Current architecture handles this comfortably:
- Supabase for database, auth, realtime
- R2 for storage (no egress fees)
- Edge Functions for serverless workloads
- Vercel for hosting

### Phase 2 Scale (1,000–10,000 photographers)
Monitor and add:
- Dedicated photo processing worker queue (instead of Edge Functions)
- Read replicas for Supabase (gallery queries separate from writes)
- R2 + Cloudflare CDN for photo delivery optimization

### Phase 3 Scale (10,000+ photographers)
Consider:
- Separate storage service with multi-region replication
- Event-driven architecture (event sourcing for audit logs)
- Dedicated infrastructure team

### Scale-Critical Design Decisions Already Made
- **Presigned URLs**: Browser uploads directly to R2 (not through Supabase) — handles upload volume
- **Atomic GB accounting**: Row-level locks on pool updates — prevents overselling storage
- **Realtime channel scoping**: Per-event channels — not broadcast to all users
- **Tiered storage**: Hot/cold lifecycle — reduces storage costs at scale

---

## 13. Open Questions

1. **Photo storage strategy** — Full originals vs compressed? Decision needed.
2. **Plan tiers and pricing** — GB amounts, pricing TBD.
3. **Studio Pro event limits** — Any limit per tier, or truly unlimited?
4. **Memory Book PDF** — What exactly is this? Content TBD.
5. **Extend plan pricing for Studio Pro** — Pricing TBD.
6. **Photographer portfolio link** — Which plan tier includes white-label? TBD.
7. **PWA template design** — Wedding-specific vs standard need visual design.

---

## 14. Next Steps

1. User reviews and approves this spec
2. Write implementation plan (Week 1 priorities)
3. Set up monorepo scaffold
4. Create Supabase schema + migrations
5. Build authentication flows
6. Build Studio Dashboard (event creation, upload)
7. Build Guest PWA (QR access, face search)
8. Build Couple PWA (magic link, visibility controls)
9. Integrate Razorpay, WhatsApp, Resend
10. QA and deploy

---

*Spec written: 2026-04-22*
