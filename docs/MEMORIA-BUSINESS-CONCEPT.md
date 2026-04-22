# Memoria B2B — Business Concept Document

**Version:** 0.1
**Last Updated:** 2026-04-22

---

## 1. What is Memoria?

Memoria is a **B2B platform for wedding photographers** to deliver photos to couples and their guests.

### The Problem We Solve

Wedding photographers spend hours manually sharing photos with couples — via Google Drive links, WeTransfer, WhatsApp, etc. This is:
- **Time-consuming** — sorting, uploading, and sharing takes hours
- **Messy** — couples get links that expire, photos mixed up, no privacy controls
- **No upsell** — photographers have no way to offer premium features (extended access, prints, memory books)

### Our Solution

Photographers upload all wedding photos to Memoria, then send the couple a private link. The couple and guests can view, download, and purchase extras — all in one place.

**We handle the delivery, the privacy controls, and the upsells.**

---

## 2. The Two Products

### Studio Dashboard (Photographer Tool)

**What it is:** A web dashboard where photographers manage their business.

**URL:** `studio.memorias.in`

**What photographers do:**
- Sign up and set up their studio profile
- Choose a plan (monthly subscription or per-wedding)
- Create wedding events and upload photos
- Set which ceremonies are visible to guests (or private only to couple)
- Generate QR codes for guests to scan at the wedding
- Send magic links to the couple after delivery
- Control whether downloads are blocked (until payment is confirmed)
- Track how many GB their studio has used

**Think of it as:** The photographer's "control center" for photo delivery.

---

### Guest PWA (Couple & Guest Experience)

**What it is:** A mobile-friendly web app that wedding guests and the couple use.

**URL:** `g.memorias.in`

**Two ways to access:**

#### Guest Access (QR Scan)
- Guest scans a printed QR code at the wedding venue
- Enters their name and phone number (OTP verification)
- Can browse guest-visible ceremonies
- Can upload their own photos from the wedding (up to 50)
- Can download up to 10 photos for free

#### Couple Access (Magic Link)
- Couple receives a private link via WhatsApp after the photographer delivers
- Enters their phone and verifies with OTP
- Sees ALL ceremonies (including private ones)
- Can adjust visibility settings (make private ceremonies visible to guests, or block all guest access)
- Can invite up to 5 family members
- Can download unlimited photos
- Can purchase: Extend access, Permanent memory, Memory Book PDF

**Think of it as:** The couple and guests' private wedding gallery.

---

## 3. User Roles Explained

| Role | Who | What They See | What They Can Do |
|------|-----|---------------|------------------|
| **Photographer** | Studio owner | All events they created | Upload photos, manage events, block downloads, send links |
| **Studio Member** | Team member (editor/viewer) | Events in their studio | Help upload photos, view galleries (permission-based) |
| **Guest** | Wedding guest | Only "Guest visible" ceremonies | Browse gallery, upload own photos, download ≤10 free |
| **Couple** | Bride/Groom | ALL ceremonies | Everything + adjust settings, invite family, purchase upsells |
| **Family** | Couple's family | Family + Guest ceremonies | Browse, upload photos, cannot change settings |

---

## 4. How Visibility Works

Each ceremony (Haldi, Mehendi, Wedding, Reception) has a visibility setting:

| Setting | Who Sees It |
|---------|-------------|
| **Guest** | Guests (QR path), Family, Couple |
| **Family** | Family (magic link), Couple |
| **Couple-only** | Couple only |

**Photographer controls:** Sets the default visibility, can lock it so couple cannot change.

**Couple controls:** Can override photographer's defaults (if not locked) — make things more or less visible.

---

## 5. The "Switch Off Downloads" Feature

**Why it matters:** Photographers want payment before giving couples full access.

**How it works:**
- Photographer toggles "Downloads Blocked" for an event
- Couple can still SEE all photos, but cannot download them
- Once photographer confirms payment received, they unblock downloads
- Couple gets a WhatsApp notification that downloads are now available

**This is a key feature** — it gives photographers leverage to collect payment before delivery.

---

## 6. Subscription Models

### Studio Pro (Monthly Subscription)

For photographers who shoot many events.

**Pricing:** ₹599-3,499/month

**What's included:**
- Monthly GB pool shared across all events (e.g., 300GB)
- Any event type (weddings, birthdays, corporate, etc.)
- Photographer sets access duration (7 days, 15 days, 30 days, or custom date)
- When event closes, GB returns to the pool
- Standard PWA template (simpler)
- 2-day and 1-day expiry warnings via WhatsApp

**Best for:** Photographers who shoot frequently and want to reuse storage.

---

### Wedding Plans (Per-Wedding)

For photographers who want a fixed package per wedding.

**Pricing:** ₹799-2,499 per wedding

**What's included:**
- Fixed GB allocation per wedding (Silver 25GB, Gold 50GB, Platinum 100GB)
- 3-month access window from delivery date
- Wedding-specific PWA template (full couple/family controls)
- Couple upsells: Extend (₹299/year), Permanent (₹799), Memory Book (₹399)

**Best for:** Photographers who want predictable pricing per wedding.

---

### Plan Comparison

| Feature | Studio Pro | Wedding Plans |
|---------|------------|----------------|
| GB allocation | Pool (reusable) | Fixed per wedding |
| Event types | Any | Wedding only |
| Access duration | Photographer-controlled | 3 months fixed |
| Couple upsells | TBD | Extend ₹299/yr, Permanent ₹799 |
| ZIP download | Yes | Yes |
| Price | ₹599-3,499/month | ₹799-2,499/wedding |

---

## 7. Couple Upsells (Revenue for Couples)

These are add-ons couples can purchase:

| Upsell | Price | What They Get |
|--------|-------|---------------|
| **Extend Access** | ₹299/year | Keep gallery access beyond the 3-month window |
| **Permanent Memory** | ₹799 one-time | Keep photos forever |
| **Memory Book PDF** | ₹399 | Downloadable PDF album |

**Memoria takes 100% of this revenue — no commission to photographers.**

---

## 8. Revenue Model

| Revenue Stream | Amount | Who Pays |
|---------------|--------|----------|
| Wedding Plans | ₹799-2,499 | Photographer |
| Studio Pro | ₹599-3,499/month | Photographer |
| Extend Access | ₹299/year | Couple |
| Permanent Memory | ₹799 one-time | Couple |
| Memory Book PDF | ₹399 one-time | Couple |

**Important:** Memoria does NOT take any commission on the photographer's fees to couples. We are a wholesale model.

---

## 9. Key User Flows

### Flow 1: Photographer Sends Wedding to Couple

```
1. Photographer uploads all photos to Memoria
2. Photographer sets ceremony visibility (guest/family/couple)
3. Photographer hits "Deliver" button
4. Couple receives WhatsApp message with magic link
5. Couple verifies phone via OTP
6. Couple sees all photos, downloads unlimited
7. Couple can invite family members
8. Couple can purchase upsells (extend, permanent, memory book)
```

### Flow 2: Guest Accesses Wedding Photos

```
1. Guest sees QR code printed at wedding venue
2. Guest scans QR → opens g.memorias.in/e/[qr]
3. Guest enters name + phone → receives OTP
4. Guest verifies OTP
5. Guest browses guest-visible ceremonies
6. Guest can upload their own photos (max 50)
7. Guest can download up to 10 photos for free
```

### Flow 3: Couple Blocks Downloads Until Payment

```
1. Photographer delivers event but keeps downloads blocked
2. Couple sees gallery but download button shows "Locked"
3. Couple contacts photographer to arrange payment
4. Photographer confirms payment received
5. Photographer unblocks downloads in Studio Dashboard
6. Couple receives WhatsApp notification
7. Downloads now available
```

---

## 10. Key Features Summary

| Feature | Who Benefits | Description |
|---------|--------------|-------------|
| QR Guest Access | Photographer | Guests scan QR at venue, no app download needed |
| OTP Verification | Everyone | Phone-based auth, no passwords |
| Per-Ceremony Visibility | Couple + Photographer | Control what each part of wedding shows |
| Switch Off Downloads | Photographer | Block downloads until payment |
| Family Invites | Couple | Invite up to 5 family members |
| GB Pool Accounting | Photographer | Track storage usage across events |
| Couple Upsells | Photographer | Revenue from extend/permanent/memory book |
| Presigned URL Upload | Platform | Fast direct uploads, no server bottleneck |

---

## 11. Technology Decisions

| Decision | Why |
|----------|-----|
| **Phone OTP** | No passwords needed, works for all users |
| **Presigned URLs** | Photos upload directly to storage, not through our servers |
| **R2 Storage** | No egress fees, cheaper at scale |
| **Supabase** | Database + Auth + Edge Functions in one, easy setup |
| **Next.js PWA** | Works on mobile without app store approval |

---

## 12. What's NOT in Phase 1

To keep the first version focused:

- AI photo enhancement
- AI face recognition (Phase 2)
- Live gallery during event (real-time)
- Video teaser reels
- Mobile app (Play Store)
- Print ordering
- Multi-language support

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **Studio** | The photographer's account/business |
| **Event** | A single wedding or party |
| **Ceremony** | A part of the event (Haldi, Mehendi, Wedding, Reception) |
| **Magic Link** | Private link sent to couple via WhatsApp |
| **QR Code** | Code printed at venue for guests to scan |
| **GB Pool** | Shared storage that Studio Pro photographers get |
| **Wedding Plan** | Fixed GB allocation per wedding |
| **Upsell** | Extra purchase (extend access, memory book, etc.) |
| **PWA** | Progressive Web App — works on mobile like an app |

---

## 14. Architecture Overview

```
Photographer → Studio Dashboard → Supabase (manage events, photos)
                    ↓
              Cloudflare R2 (photo storage)

Couple/Guest → PWA → Supabase Auth (OTP)
                    ↓
              R2 (view/download photos)

WhatsApp → Couple receives magic link
Resend → Notifications
Razorpay → Payments
```

---

*Document generated: 2026-04-22*
*For internal use — share with developer teams for context*
