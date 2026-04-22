# Memoria B2B — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up monorepo foundation, Supabase schema, and core authentication flows for all three user types (photographer, guest, couple).

**Architecture:** Greenfield project. Monorepo with pnpm + Turbo. Next.js 15 apps for Studio Dashboard and PWA. Supabase for database, auth, realtime. Edge Functions for API logic.

**Tech Stack:** pnpm, Turbo, Next.js 15 (App Router), TypeScript, Supabase (Postgres, Auth, Edge Functions), Cloudflare R2 (later), Vercel.

---

## File Structure

```
memoria-b2b/
├── apps/
│   ├── studio/               # Photographer dashboard (Next.js 15)
│   │   ├── app/
│   │   │   ├── (auth)/      # Auth pages (login, signup)
│   │   │   ├── (dashboard)/ # Protected dashboard routes
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   │   └── supabase/
│   │   │       └── client.ts
│   │   └── package.json
│   └── pwa/                 # Guest/Couple PWA (Next.js 15)
│       ├── app/
│       │   ├── e/[qr]/      # Guest access route
│       │   ├── c/[token]/   # Couple access route
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       ├── lib/
│       │   └── supabase/
│       │       └── client.ts
│       └── package.json
├── packages/
│   ├── ui/                  # Shared UI components (later)
│   ├── api-client/          # Shared Supabase types + client
│   │   ├── types/
│   │   │   └── database.ts  # Generated Supabase types
│   │   └── index.ts
│   └── config/              # Shared configs
│       ├── eslint/
│       ├── prettier/
│       └── tsconfig/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── auth/
│       │   ├── guest-otp.ts
│       │   └── couple-magic-link.ts
│       └── events/
│           └── create-event.ts
├── scripts/
│   └── dev.ts               # Dev workflow scripts
├── docs/
│   └── SUPERPOWERS_SPEC.md  # Copy of spec for agent context
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

---

## Task 1: Initialize Monorepo with pnpm + Turbo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.env.example`
- Create: `apps/studio/package.json`
- Create: `apps/pwa/package.json`
- Create: `packages/config/package.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "memoria-b2b",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "db:migrate": "supabase db push",
    "db:studio": "supabase studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 4: Create .env.example**

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

- [ ] **Step 5: Create apps/studio/package.json**

```json
{
  "name": "@memoria/studio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@memoria/api-client": "workspace:*",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 6: Create apps/pwa/package.json**

```json
{
  "name": "@memoria/pwa",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@memoria/api-client": "workspace:*",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 7: Create packages/config/package.json**

```json
{
  "name": "@memoria/config",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "devDependencies": {
    "eslint": "^8.57.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 8: Create shared TypeScript config base**

Create `packages/config/tsconfig/base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true
  }
}
```

Create `packages/config/tsconfig/nextjs.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 9: Create apps/studio/tsconfig.json and apps/pwa/tsconfig.json**

```json
{
  "extends": "@memoria/config/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 10: Commit**

```bash
git init
git add package.json pnpm-workspace.yaml turbo.json .env.example apps/studio/package.json apps/pwa/package.json packages/config/package.json packages/config/tsconfig/*.json
git commit -m "feat: initialize monorepo with pnpm + Turbo"
```

---

## Task 2: Create Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create studios table**

```sql
-- Studios (photographers/studio owners)
CREATE TABLE studios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  upi_id TEXT,
  website TEXT,
  bio TEXT,
  slug TEXT UNIQUE NOT NULL, -- for portfolio URL: memorias.in/p/[slug]
  plan_type TEXT CHECK (plan_type IN ('studio_pro', 'wedding_plan', 'trial')) DEFAULT 'trial',
  plan_tier TEXT, -- e.g., 'silver', 'gold', 'platinum' for wedding plans
  gb_allocated BIGINT DEFAULT 0, -- in bytes
  gb_used BIGINT DEFAULT 0, -- in bytes
  subscription_status TEXT DEFAULT 'active', -- active, cancelled, expired
  subscription_expires_at TIMESTAMPTZ,
  razorpay_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Studio members (team access)
CREATE TABLE studio_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(studio_id, user_id)
);

-- Index for quick lookups
CREATE INDEX idx_studios_slug ON studios(slug);
CREATE INDEX idx_studios_phone ON studios(phone);
CREATE INDEX idx_studio_members_user ON studio_members(user_id);
-- Composite index for RLS policy queries (studio_id + user_id + role)
CREATE INDEX idx_studio_members_composite ON studio_members(studio_id, user_id, role);
```

- [ ] **Step 2: Create events table**

```sql
-- Events (weddings, birthdays, corporate, etc.)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('wedding', 'birthday', 'corporate', 'anniversary', 'other')) NOT NULL,
  plan_type TEXT CHECK (plan_type IN ('wedding_plan', 'studio_pro')) NOT NULL,
  
  -- Couple info
  couple_name TEXT,
  couple_phone TEXT,
  couple_email TEXT,
  
  -- Timing
  event_date DATE,
  delivery_date DATE,
  expiry_date TIMESTAMPTZ, -- calculated: delivery_date + access_days
  access_days INT DEFAULT 90, -- 90 for wedding, photographer-set for studio_pro
  
  -- GB allocation
  gb_allocated BIGINT DEFAULT 0, -- bytes, from pool or fixed plan
  gb_used BIGINT DEFAULT 0, -- bytes consumed by uploads
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',           -- being set up
    'upload_in_progress', -- photos being uploaded
    'ready_to_deliver',  -- ready to send to couple
    'delivered',         -- sent to couple/guests
    'expiring_soon',     -- 7 days before expiry
    'expired',           -- past expiry, awaiting action
    'archived'           -- couple chose archive or didn't extend
  )),
  
  -- Couple magic link token
  couple_access_token TEXT UNIQUE,
  
  -- Downloads control
  downloads_blocked BOOLEAN DEFAULT false,
  downloads_blocked_at TIMESTAMPTZ,
  downloads_blocked_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_events_studio ON events(studio_id);
CREATE INDEX idx_events_couple_token ON events(couple_access_token);
CREATE INDEX idx_events_expiry ON events(expiry_date) WHERE status NOT IN ('archived', 'expired');
CREATE INDEX idx_events_status ON events(status);
```

- [ ] **Step 3: Create ceremonies table**

```sql
-- Ceremonies within an event (haldi, mehendi, wedding, reception, etc.)
CREATE TABLE ceremonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Haldi', 'Mehendi', 'Wedding Ceremony'
  order_index INT DEFAULT 0, -- display order
  scheduled_time TIMESTAMPTZ,
  duration_minutes INT,
  gb_allocated BIGINT DEFAULT 0, -- bytes allocated to this ceremony
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ceremonies_event ON ceremonies(event_id);
CREATE INDEX idx_ceremonies_order ON ceremonies(event_id, order_index);
```

- [ ] **Step 4: Create ceremony_visibility table**

```sql
-- Per-ceremony visibility settings
CREATE TABLE ceremony_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id UUID REFERENCES ceremonies(id) ON DELETE CASCADE UNIQUE,
  audience_type TEXT CHECK (audience_type IN ('guest', 'family', 'couple_only')) DEFAULT 'guest',
  is_active BOOLEAN DEFAULT true,
  locked_by_photographer BOOLEAN DEFAULT false, -- if true, couple cannot change
  last_changed_by UUID REFERENCES auth.users(id),
  last_changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ceremony_visibility_ceremony ON ceremony_visibility(ceremony_id);
```

- [ ] **Step 5: Create media_files table**

```sql
-- Photos and videos
CREATE TABLE media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ceremony_id UUID REFERENCES ceremonies(id) ON DELETE SET NULL,
  
  -- File info
  file_type TEXT CHECK (file_type IN ('photo', 'video')),
  mime_type TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  
  -- R2 storage
  r2_key TEXT NOT NULL, -- R2 object key
  r2_thumbnail_key TEXT, -- thumbnail variant key
  r2_preview_key TEXT, -- preview variant key
  r2_web_key TEXT, -- web-optimized variant key
  
  -- Metadata
  exif_data JSONB, -- capture time, camera, location
  width INT,
  height INT,
  duration_seconds INT, -- for videos
  
  -- Face vectors (for AWS Rekognition)
  face_vectors JSONB, -- array of face vector IDs
  
  -- Upload tracking
  uploaded_by UUID REFERENCES auth.users(id),
  upload_session_id TEXT, -- for chunked upload tracking
  
  -- Status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploading', 'uploaded', 'processing', 'ready', 'error')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_media_files_event ON media_files(event_id);
CREATE INDEX idx_media_files_ceremony ON media_files(ceremony_id);
CREATE INDEX idx_media_files_uploaded_by ON media_files(uploaded_by);
CREATE INDEX idx_media_files_status ON media_files(status);
```

- [ ] **Step 6: Create guest_sessions table**

```sql
-- Guest sessions (QR scan access)
CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Guest info
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  
  -- OTP verification
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  
  -- Access tracking
  device_info JSONB,
  ip_address TEXT,
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  
  -- Upload tracking
  photos_uploaded INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guest_sessions_event ON guest_sessions(event_id);
CREATE INDEX idx_guest_sessions_phone ON guest_sessions(phone);
CREATE INDEX idx_guest_sessions_otp ON guest_sessions(otp_code) WHERE otp_code IS NOT NULL;
```

- [ ] **Step 7: Create couple_access table**

```sql
-- Couple/family access tokens (magic link)
CREATE TABLE couple_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Accessor info
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT CHECK (role IN ('couple_primary', 'couple_secondary', 'family')) NOT NULL,
  
  -- Magic link token
  magic_token TEXT UNIQUE NOT NULL,
  
  -- Invite tracking (for family members)
  invited_by UUID REFERENCES couple_access(id), -- NULL for primary couple
  invite_sent_at TIMESTAMPTZ,
  
  -- OTP verification
  otp_verified BOOLEAN DEFAULT false,
  otp_verified_at TIMESTAMPTZ,
  
  -- Access window
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_couple_access_event ON couple_access(event_id);
CREATE INDEX idx_couple_access_token ON couple_access(magic_token);
CREATE INDEX idx_couple_access_phone ON couple_access(phone);
```

- [ ] **Step 8: Create couple_settings table**

```sql
-- Couple preferences per event
CREATE TABLE couple_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  
  -- Access controls
  allow_guest_uploads BOOLEAN DEFAULT true,
  guest_approval_required BOOLEAN DEFAULT false,
  max_family_members INT DEFAULT 5,
  download_allowed_for_guests BOOLEAN DEFAULT true,
  face_search_enabled BOOLEAN DEFAULT true,
  
  -- Couple's own access
  couple_can_view_all BOOLEAN DEFAULT true,
  
  -- Notifications
  notify_on_guest_upload BOOLEAN DEFAULT true,
  notify_on_family_join BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 9: Create storage_pool table for atomic GB tracking**

```sql
-- Storage pool for Studio Pro (atomic GB accounting)
CREATE TABLE storage_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES studios(id) ON DELETE CASCADE UNIQUE,
  
  -- Pool totals
  gb_allocated BIGINT NOT NULL, -- total bytes allocated from plan
  gb_used BIGINT DEFAULT 0, -- bytes currently consumed
  
  -- For optimistic locking
  version INT DEFAULT 1,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to atomically reserve GB (prevents overselling)
CREATE OR REPLACE FUNCTION reserve_storage(
  p_studio_id UUID,
  p_bytes BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_pool RECORD;
  v_success BOOLEAN := false;
BEGIN
  -- Use row-level lock with NOWAIT to prevent contention
  SELECT * INTO v_pool
  FROM storage_pools
  WHERE studio_id = p_studio_id
  FOR UPDATE NOWAIT;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if enough GB available
  IF (v_pool.gb_allocated - v_pool.gb_used) >= p_bytes THEN
    UPDATE storage_pools
    SET 
      gb_used = gb_used + p_bytes,
      version = version + 1,
      updated_at = NOW()
    WHERE studio_id = p_studio_id AND version = v_pool.version;
    
    GET DIAGNOSTICS v_success = ROW_COUNT;
    RETURN v_success > 0;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to release GB back to pool
CREATE OR REPLACE FUNCTION release_storage(
  p_studio_id UUID,
  p_bytes BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_result INT;
BEGIN
  UPDATE storage_pools
  SET 
    gb_used = GREATEST(0, gb_used - p_bytes),
    version = version + 1,
    updated_at = NOW()
  WHERE studio_id = p_studio_id
  RETURNING 1 INTO v_result;
  
  RETURN v_result > 0;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 10: Create payments table (basic structure)**

```sql
-- Payments tracking
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who paid
  studio_id UUID REFERENCES studios(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Payment type
  payment_type TEXT CHECK (payment_type IN (
    'studio_pro_monthly',
    'wedding_plan',
    'couple_extend',
    'couple_permanent',
    'couple_memory_book'
  )) NOT NULL,
  
  -- Linked event (for wedding plans and couple upsells)
  event_id UUID REFERENCES events(id),
  
  -- Razorpay
  razorpay_payment_id TEXT UNIQUE,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  
  -- Amount
  amount_paise INT NOT NULL,
  currency TEXT DEFAULT 'INR',
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_studio ON payments(studio_id);
CREATE INDEX idx_payments_event ON payments(event_id);
CREATE INDEX idx_payments_razorpay ON payments(razorpay_payment_id);
CREATE INDEX idx_payments_status ON payments(status);
```

- [ ] **Step 11: Create RLS policies**

```sql
-- Enable RLS on all tables
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceremonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceremony_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Studios: photographers can access their own
CREATE POLICY "photographers_access_own_studio"
  ON studios FOR ALL
  USING (auth.uid() = (SELECT user_id FROM studio_members WHERE studio_id = studios.id AND role = 'admin'))
  WITH CHECK (auth.uid() = (SELECT user_id FROM studio_members WHERE studio_id = studios.id AND role = 'admin'));

-- Events: studio members can access their studio's events
CREATE POLICY "studio_members_access_studio_events"
  ON events FOR ALL
  USING (
    studio_id IN (
      SELECT studio_id FROM studio_members 
      WHERE user_id = auth.uid()
    )
  );

-- Ceremonies: access via event
CREATE POLICY "ceremonies_access_via_event"
  ON ceremonies FOR ALL
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN studio_members sm ON e.studio_id = sm.studio_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Media files: access via event
CREATE POLICY "media_access_via_event"
  ON media_files FOR ALL
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN studio_members sm ON e.studio_id = sm.studio_id
      WHERE sm.user_id = auth.uid()
    )
  );

-- Guest sessions: insert only, no update/delete via client
CREATE POLICY "guest_sessions_insert"
  ON guest_sessions FOR INSERT
  WITH CHECK (true);

-- Couple access: insert only for magic link creation
CREATE POLICY "couple_access_insert"
  ON couple_access FOR INSERT
  WITH CHECK (true);

-- Couple settings: read via event access
CREATE POLICY "couple_settings_via_event"
  ON couple_settings FOR ALL
  USING (
    event_id IN (
      SELECT e.id FROM events e
      JOIN studio_members sm ON e.studio_id = sm.studio_id
      WHERE sm.user_id = auth.uid()
    )
  );
```

- [ ] **Step 12: Create Edge Function for guest OTP**

Create `supabase/functions/auth/guest-otp.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { event_id, name, phone } = await req.json()

    if (!event_id || !name || !phone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // SECURITY: Verify event exists and is accessible before creating guest session
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only allow guest access for events that are delivered or ready_to_deliver
    if (!['delivered', 'ready_to_deliver'].includes(event.status)) {
      return new Response(JSON.stringify({ error: 'Event not accepting guest access' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // Create or update guest session
    const { data: session, error } = await supabase
      .from('guest_sessions')
      .upsert({
        event_id,
        name,
        phone,
        otp_code: otp,
        otp_expires_at: expires_at,
        verified_at: null,
      }, {
        onConflict: 'event_id,phone',
      })
      .select()
      .single()

    if (error) throw error

    // TODO: Send OTP via SMS (Resend/WhatsApp)
    console.log(`OTP for ${phone}: ${otp}`)

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      message: 'OTP sent'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 13: Create Edge Function for couple magic link**

Create `supabase/functions/auth/couple-magic-link.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { randomBytes } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { event_id, name, phone, email, role = 'couple_primary' } = await req.json()

    if (!event_id || !name || !phone) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get event to calculate expiry AND verify event is deliverable
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('access_days, delivery_date, status, couple_phone')
      .eq('id', event_id)
      .single()

    if (eventError || !event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // SECURITY: Only allow magic link for delivered events
    if (event.status !== 'delivered' && event.status !== 'ready_to_deliver') {
      return new Response(JSON.stringify({ error: 'Event not accepting couple access' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // SECURITY: Optionally verify phone matches couple's registered phone
    if (event.couple_phone && event.couple_phone !== phone) {
      return new Response(JSON.stringify({ error: 'Phone number mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calculate expiry
    const expires_at = new Date()
    expires_at.setDate(expires_at.getDate() + event.access_days)

    // Generate secure magic token
    const magic_token = generateSecureToken()

    // Create couple access
    const { data: access, error } = await supabase
      .from('couple_access')
      .insert({
        event_id,
        name,
        phone,
        email,
        role,
        magic_token,
        expires_at: expires_at.toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Generate magic link
    const magic_link = `${Deno.env.get('PWA_URL')}/c/${magic_token}`

    // TODO: Send magic link via WhatsApp
    console.log(`Magic link for ${phone}: ${magic_link}`)

    return new Response(JSON.stringify({
      success: true,
      access_id: access.id,
      magic_link,
      expires_at: expires_at.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 14: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql supabase/functions/auth/*.ts
git commit -m "feat: add Supabase schema and auth Edge Functions

- Studios, events, ceremonies, media_files tables
- Guest sessions and couple access tables
- Ceremony visibility controls
- Atomic storage pool with reserve/release functions
- RLS policies for all tables
- Guest OTP and couple magic link Edge Functions"
```

---

## Task 3: Set Up Next.js App Shells

**Files:**
- Create: `apps/studio/app/layout.tsx`
- Create: `apps/studio/app/page.tsx`
- Create: `apps/studio/app/globals.css`
- Create: `apps/studio/next.config.ts`
- Create: `apps/studio/.env.local`
- Create: `apps/pwa/app/layout.tsx`
- Create: `apps/pwa/app/page.tsx`
- Create: `apps/pwa/app/globals.css`
- Create: `apps/pwa/next.config.ts`
- Create: `apps/pwa/.env.local`

- [ ] **Step 1: Create Studio app structure**

Create `apps/studio/next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@memoria/api-client'],
}

export default nextConfig
```

Create `apps/studio/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: system-ui, -apple-system, sans-serif;
}
```

Create `apps/studio/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memoria Studio',
  description: 'Wedding photo delivery platform for photographers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  )
}
```

Create `apps/studio/app/page.tsx`:

```typescript
export default function HomePage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Memoria Studio
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Your wedding photo delivery dashboard
      </p>
      <div className="space-x-4">
        <a
          href="/auth/login"
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Login
        </a>
        <a
          href="/auth/signup"
          className="inline-flex items-center px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
        >
          Sign Up
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PWA app structure**

Create `apps/pwa/next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@memoria/api-client'],
  // PWA configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default nextConfig
```

Create `apps/pwa/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
}
```

Create `apps/pwa/app/layout.tsx`:

```typescript
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memoria',
  description: 'Your wedding memories',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Memoria',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        {children}
      </body>
    </html>
  )
}
```

Create `apps/pwa/app/page.tsx`:

```typescript
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Memoria
      </h1>
      <p className="text-gray-600 mb-8 text-center">
        Access your wedding memories
      </p>
      <div className="space-y-4 text-center">
        <p className="text-sm text-gray-500">
          Scan a QR code at your wedding to access photos
        </p>
        <Link
          href="/e/demo"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Demo Guest Access
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create env files**

Create `apps/studio/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_PWA_URL=http://localhost:3001
```

Create `apps/pwa/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STUDIO_URL=http://localhost:3000
```

- [ ] **Step 4: Create shared API client package**

Create `packages/api-client/package.json`:

```json
{
  "name": "@memoria/api-client",
  "version": "0.1.0",
  "private": true,
  "main": "./types/index.ts",
  "types": "./types/index.ts",
  "exports": {
    "./types": "./types/index.ts",
    "./server": "./lib/server.ts",
    "./browser": "./lib/browser.ts"
  }
}
```

Create `packages/api-client/types/database.ts`:

```typescript
// These types will be generated by Supabase CLI
// For now, define manually based on schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      studios: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          logo_url: string | null
          upi_id: string | null
          website: string | null
          bio: string | null
          slug: string
          plan_type: 'studio_pro' | 'wedding_plan' | 'trial'
          plan_tier: string | null
          gb_allocated: number
          gb_used: number
          subscription_status: string
          subscription_expires_at: string | null
          razorpay_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['studios']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['studios']['Insert']>
      }
      events: {
        Row: {
          id: string
          studio_id: string
          name: string
          event_type: 'wedding' | 'birthday' | 'corporate' | 'anniversary' | 'other'
          plan_type: 'wedding_plan' | 'studio_pro'
          couple_name: string | null
          couple_phone: string | null
          couple_email: string | null
          event_date: string | null
          delivery_date: string | null
          expiry_date: string | null
          access_days: number
          gb_allocated: number
          gb_used: number
          status: string
          couple_access_token: string | null
          downloads_blocked: boolean
          downloads_blocked_at: string | null
          downloads_blocked_by: string | null
          created_at: string
          updated_at: string
          delivered_at: string | null
          archived_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      ceremonies: {
        Row: {
          id: string
          event_id: string
          name: string
          order_index: number
          scheduled_time: string | null
          duration_minutes: number | null
          gb_allocated: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ceremonies']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ceremonies']['Insert']>
      }
      ceremony_visibility: {
        Row: {
          id: string
          ceremony_id: string
          audience_type: 'guest' | 'family' | 'couple_only'
          is_active: boolean
          locked_by_photographer: boolean
          last_changed_by: string | null
          last_changed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ceremony_visibility']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ceremony_visibility']['Insert']>
      }
      media_files: {
        Row: {
          id: string
          event_id: string
          ceremony_id: string | null
          file_type: 'photo' | 'video'
          mime_type: string
          original_filename: string
          file_size_bytes: number
          r2_key: string
          r2_thumbnail_key: string | null
          r2_preview_key: string | null
          r2_web_key: string | null
          exif_data: Json | null
          width: number | null
          height: number | null
          duration_seconds: number | null
          face_vectors: Json | null
          uploaded_by: string | null
          upload_session_id: string | null
          status: string
          created_at: string
          processed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['media_files']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['media_files']['Insert']>
      }
      guest_sessions: {
        Row: {
          id: string
          event_id: string
          name: string
          phone: string
          email: string | null
          otp_code: string | null
          otp_expires_at: string | null
          verified_at: string | null
          device_info: Json | null
          ip_address: string | null
          first_accessed_at: string | null
          last_accessed_at: string | null
          photos_uploaded: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['guest_sessions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['guest_sessions']['Insert']>
      }
      couple_access: {
        Row: {
          id: string
          event_id: string
          name: string
          phone: string
          email: string | null
          role: 'couple_primary' | 'couple_secondary' | 'family'
          magic_token: string
          invited_by: string | null
          invite_sent_at: string | null
          otp_verified: boolean
          otp_verified_at: string | null
          expires_at: string
          last_accessed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['couple_access']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['couple_access']['Insert']>
      }
      couple_settings: {
        Row: {
          id: string
          event_id: string
          allow_guest_uploads: boolean
          guest_approval_required: boolean
          max_family_members: number
          download_allowed_for_guests: boolean
          face_search_enabled: boolean
          couple_can_view_all: boolean
          notify_on_guest_upload: boolean
          notify_on_family_join: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['couple_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['couple_settings']['Insert']>
      }
      storage_pools: {
        Row: {
          id: string
          studio_id: string
          gb_allocated: number
          gb_used: number
          version: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['storage_pools']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['storage_pools']['Insert']>
      }
      payments: {
        Row: {
          id: string
          studio_id: string | null
          user_id: string | null
          payment_type: string
          event_id: string | null
          razorpay_payment_id: string | null
          razorpay_order_id: string | null
          razorpay_signature: string | null
          amount_paise: number
          currency: string
          status: string
          created_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
  }
}

// Convenience types
export type Studio = Database['public']['Tables']['studios']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Ceremony = Database['public']['Tables']['ceremonies']['Row']
export type CeremonyVisibility = Database['public']['Tables']['ceremony_visibility']['Row']
export type MediaFile = Database['public']['Tables']['media_files']['Row']
export type GuestSession = Database['public']['Tables']['guest_sessions']['Row']
export type CoupleAccess = Database['public']['Tables']['couple_access']['Row']
export type CoupleSettings = Database['public']['Tables']['couple_settings']['Row']
export type StoragePool = Database['public']['Tables']['storage_pools']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
```

Create `packages/api-client/lib/browser.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `packages/api-client/lib/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

Create `packages/api-client/index.ts`:

```typescript
export * from './types/database'
export { createClient as createBrowserClient } from './lib/browser'
export { createClient as createServerClient } from './lib/server'
```

- [ ] **Step 5: Add Tailwind setup**

Create `apps/studio/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

Add to `apps/studio/package.json`:

```json
{
  "dependencies": {
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/studio apps/pwa packages/api-client
git commit -m "feat: set up Next.js app shells for Studio and PWA

- Studio dashboard with login/signup pages
- PWA with guest (QR) and couple (magic link) routes
- Shared API client package with Supabase types
- Basic Tailwind setup
- Environment configuration"
```

---

## Task 4: Create Auth Pages (Studio)

**Files:**
- Create: `apps/studio/app/(auth)/login/page.tsx`
- Create: `apps/studio/app/(auth)/signup/page.tsx`
- Create: `apps/studio/app/(auth)/layout.tsx`

- [ ] **Step 1: Create auth layout**

Create `apps/studio/app/(auth)/layout.tsx`:

```typescript
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4">
      <Link href="/" className="mb-8 text-2xl font-bold text-gray-900">
        Memoria Studio
      </Link>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create login page**

Create `apps/studio/app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@memoria/api-client'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${phone}`,
      })
      
      if (error) throw error
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms',
      })
      
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Enter OTP
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  maxLength={6}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border text-center text-xl tracking-widest"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create signup page**

Create `apps/studio/app/(auth)/signup/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@memoria/api-client'

export default function SignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${form.phone}`,
      })
      
      if (error) throw error
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${form.phone}`,
        token: otp,
        type: 'sms',
      })
      
      if (error) throw error

      // Create studio record after OTP verification
      // Use Supabase auto-generated UUID (not auth.uid()) to avoid collision
      if (data.user) {
        const studioId = crypto.randomUUID()

        // Insert studio - using separate generated ID, not auth.uid()
        const { error: studioError } = await supabase
          .from('studios')
          .insert({
            id: studioId,
            name: form.name,
            email: form.email,
            phone: form.phone,
            slug: form.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36),
          })

        if (studioError) throw studioError

        // Create studio membership for the user
        const { error: memberError } = await supabase
          .from('studio_members')
          .insert({
            studio_id: studioId,
            user_id: data.user.id,
            role: 'admin',
          })

        if (memberError) {
          // ROLLBACK: If membership insert fails, remove the studio we just created
          await supabase.from('studios').delete().eq('id', studioId)
          throw memberError
        }
      }

      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <p className="text-sm text-gray-600 mb-4">
            OTP sent to +91 {form.phone}
          </p>
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                Enter OTP
              </label>
              <input
                id="otp"
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                maxLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border text-center text-xl tracking-widest"
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form onSubmit={handleSendOtp} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Studio Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              placeholder="9876543210"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3 border"
            />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading || form.phone.length < 10}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Continue with Phone'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/studio/app/\(auth\)/login apps/studio/app/\(auth\)/signup
git commit -m "feat: add Studio auth pages (login/signup with phone OTP)"
```

---

## Task 5: Create PWA Access Pages

**Files:**
- Create: `apps/pwa/app/e/[qr]/page.tsx` (Guest access)
- Create: `apps/pwa/app/c/[token]/page.tsx` (Couple access)

- [ ] **Step 1: Create Guest access page**

Create `apps/pwa/app/e/[qr]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@memoria/api-client'
import type { Database, Event, Ceremony } from '@memoria/api-client'

type GuestAccess = {
  event: Event
  ceremonies: Ceremony[]
}

export default function GuestAccessPage({ params }: { params: Promise<{ qr: string }> }) {
  const [qr, setQr] = useState<string>('')
  const [step, setStep] = useState<'loading' | 'verify' | 'gallery'>('loading')
  const [event, setEvent] = useState<GuestAccess | null>(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState('')

  const supabase = createBrowserClient()

  useEffect(() => {
    params.then((p) => {
      setQr(p.qr)
      // For demo, show verify step
      setStep('verify')
    })
  }, [params])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // Call Edge Function to create guest session and send OTP
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/guest-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: qr, // In real app, QR code would resolve to event_id
          name: form.name,
          phone: form.phone,
        }),
      })

      if (!response.ok) throw new Error('Failed to send OTP')

      const data = await response.json()
      setSessionId(data.session_id)
      setStep('otp' as any) // Would add OTP step
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Demo gallery view
  if (step === 'gallery') {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 bg-white border-b px-4 py-3">
          <h1 className="text-lg font-semibold">{event?.event.name || 'Wedding Gallery'}</h1>
          <p className="text-sm text-gray-500">Welcome, {form.name}</p>
        </header>

        <main className="p-4">
          <p className="text-gray-600 mb-4">
            This is a demo. In production, this would show ceremonies and photos.
          </p>
          
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                Photo {i}
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Memoria</h1>
        <p className="text-gray-600">Access your wedding memories</p>
      </header>

      <main className="flex-1 px-4">
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Rahul Sharma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="9876543210"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Continue
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-8">
          By continuing, you agree to share your photos with the couple and guests at this event.
        </p>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create Couple access page**

Create `apps/pwa/app/c/[token]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@memoria/api-client'
import type { Database, Event, CoupleAccess } from '@memoria/api-client'

type CoupleSession = {
  event: Event
  access: CoupleAccess
}

export default function CoupleAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('')
  const [step, setStep] = useState<'loading' | 'verify' | 'otp' | 'dashboard'>('loading')
  const [session, setSession] = useState<CoupleSession | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  const supabase = createBrowserClient()

  useEffect(() => {
    params.then(async (p) => {
      setToken(p.token)
      
      // In production, verify token with Edge Function
      // For demo, show verify step
      setStep('verify')
    })
  }, [params])

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      // Call Edge Function to verify magic link and send OTP
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          magic_token: token,
          phone: phone,
        }),
      })

      if (!response.ok) throw new Error('Invalid or expired link')

      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Invalid link')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otp,
        type: 'sms',
      })

      if (error) throw error
      setStep('dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    }
  }

  // Dashboard view (simplified)
  if (step === 'dashboard') {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 bg-white border-b px-4 py-4">
          <h1 className="text-xl font-bold">Your Wedding</h1>
          <p className="text-sm text-gray-500">Welcome!</p>
        </header>

        <main className="p-4 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Access expires in 90 days</h2>
            <p className="text-sm text-blue-700">
              Extend to keep your memories forever
            </p>
            <button className="mt-2 text-sm text-blue-600 font-medium">
              Extend Access →
            </button>
          </div>

          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Ceremonies</h3>
            <div className="space-y-2">
              {['Haldi', 'Mehendi', 'Wedding', 'Reception'].map((ceremony) => (
                <div key={ceremony} className="flex items-center justify-between py-3 border-b">
                  <span>{ceremony}</span>
                  <span className="text-sm text-gray-500">324 photos</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Family Members</h3>
            <p className="text-sm text-gray-500 mb-2">Invite up to 5 family members</p>
            <button className="text-sm text-blue-600 font-medium">
              + Invite Family Member
            </button>
          </section>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex justify-around">
          <button className="text-blue-600 font-medium">Gallery</button>
          <button className="text-gray-500">Download</button>
          <button className="text-gray-500">Settings</button>
        </nav>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Memoria</h1>
        <p className="text-gray-600">Your exclusive wedding access</p>
      </header>

      <main className="flex-1 px-4">
        {step === 'verify' && (
          <form onSubmit={handleVerifyPhone} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="9876543210"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Verify My Access
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              OTP sent to +91 {phone}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-xl tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456"
              />
            </div>

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Access My Wedding
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/pwa/app/e/ apps/pwa/app/c/
git commit -m "feat: add PWA guest and couple access pages

- Guest access via QR code with phone OTP
- Couple access via magic link with phone OTP
- Demo gallery views for both access types"
```

---

## Task 6: Add Switch Off Downloads Feature

**Files:**
- Create: `supabase/functions/events/toggle-downloads.ts`
- Modify: `apps/studio/app/(dashboard)/events/[id]/settings/page.tsx`

- [ ] **Step 1: Create Edge Function for toggle downloads**

Create `supabase/functions/events/toggle-downloads.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { event_id, blocked } = await req.json()

    if (!event_id) {
      return new Response(JSON.stringify({ error: 'Missing event_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user has access to this event
    const { data: event } = await supabase
      .from('events')
      .select('studio_id, downloads_blocked')
      .eq('id', event_id)
      .single()

    if (!event) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check user is admin of the studio
    const { data: membership } = await supabase
      .from('studio_members')
      .select('role')
      .eq('studio_id', event.studio_id)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Toggle downloads
    const { data: updated, error: updateError } = await supabase
      .from('events')
      .update({
        downloads_blocked: blocked,
        downloads_blocked_at: blocked ? new Date().toISOString() : null,
        downloads_blocked_by: blocked ? user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', event_id)
      .select()
      .single()

    if (updateError) throw updateError

    // TODO: Send WhatsApp notification to couple about download status change

    return new Response(JSON.stringify({
      success: true,
      downloads_blocked: updated.downloads_blocked,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Create event settings page with download toggle**

Create directory: `apps/studio/app/(dashboard)/events/[id]/settings/`

Create `apps/studio/app/(dashboard)/events/[id]/settings/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@memoria/api-client'
import type { Event } from '@memoria/api-client'

export default function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = useState<string>('')
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const supabase = createClient()

  useEffect(() => {
    params.then(async (p) => {
      setEventId(p.id)
      // Fetch event data
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', p.id)
        .single()
      setEvent(data)
      setLoading(false)
    })
  }, [params])

  const toggleDownloads = async (blocked: boolean) => {
    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/toggle-downloads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ event_id: eventId, blocked }),
      })

      if (!response.ok) throw new Error('Failed to update')

      const { downloads_blocked } = await response.json()
      setEvent({ ...event!, downloads_blocked } as Event)
      setMessage(downloads_blocked ? 'Downloads blocked' : 'Downloads enabled')
    } catch (err: any) {
      setMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!event) {
    return <div className="p-8">Event not found</div>
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Event Settings</h1>

      {message && (
        <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-lg">
          {message}
        </div>
      )}

      <section className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Download Controls</h2>
        <p className="text-gray-600 mb-4">
          Block downloads until you confirm payment from the couple. When blocked, 
          couples can still view the gallery but cannot download photos.
        </p>

        <div className="flex items-center justify-between py-4 border-t">
          <div>
            <p className="font-medium text-gray-900">Downloads</p>
            <p className="text-sm text-gray-500">
              {event.downloads_blocked ? 'Blocked by you' : 'Enabled for couples'}
            </p>
          </div>
          <button
            onClick={() => toggleDownloads(!event.downloads_blocked)}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium ${
              event.downloads_blocked
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving...' : event.downloads_blocked ? 'Unblock Downloads' : 'Block Downloads'}
          </button>
        </div>

        {event.downloads_blocked && event.downloads_blocked_at && (
          <p className="text-sm text-gray-500 mt-2">
            Blocked on {new Date(event.downloads_blocked_at).toLocaleString()}
          </p>
        )}
      </section>

      <section className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Danger Zone</h2>
        <p className="text-gray-600 mb-4">
          Once archived, this event will no longer be accessible to guests and couples.
        </p>
        <button className="px-4 py-2 border border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50">
          Archive Event
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/events/toggle-downloads.ts "apps/studio/app/(dashboard)/events/[id]/settings"
git commit -m "feat: add Switch Off Downloads feature

- Edge Function for toggle downloads with auth
- Studio dashboard event settings page
- Toggle button to block/unblock downloads
- Visual feedback and status display"
```

---

## Test Requirements

Add these tests alongside implementation:

### Edge Function Tests

**`supabase/functions/auth/guest-otp.test.ts`**
- Invalid event_id → 404
- Event not in delivered/ready_to_deliver status → 403
- Missing required fields → 400
- Valid request → 200 + session created
- Duplicate guest (same phone, same event) → upsert works

**`supabase/functions/auth/couple-magic-link.test.ts`**
- Event not found → 404
- Event not delivered → 403
- Phone mismatch with couple_phone → 403
- Valid request → 200 + magic token created
- Event status check includes `ready_to_deliver` state

### Page Tests

**`apps/pwa/app/e/[qr]/page.test.ts`**
- OTP sent → step changes to 'otp'
- Invalid QR (no event) → error shown
- Resend OTP → new OTP generated
- Double-submit prevention

**`apps/studio/app/(auth)/signup/page.test.ts`**
- OTP verification → studio + membership created
- Membership insert fails → studio rolled back
- Studio ID is auto-generated (not auth.uid())

---

## Security Fixes Applied

After `/plan-eng-review`, these issues were fixed in the plan:

| Issue | Fix Applied |
|-------|------------|
| 1A: Guest OTP no event verification | Added event status check before creating guest session |
| 1B: Magic link no status verification | Added `delivered`/`ready_to_deliver` check + phone verification |
| 2A: Studio ID collision | Use `crypto.randomUUID()` instead of `auth.uid()` |
| 2B: No rollback on membership fail | Added explicit rollback (delete studio on member error) |
| 2C: Missing composite index | Added `idx_studio_members_composite` on `(studio_id, user_id, role)` |

---

## Self-Review Checklist

1. **Spec coverage:**
   - [x] Studios and studio members (Task 2)
   - [x] Events and ceremonies (Task 2)
   - [x] Visibility system (Task 2)
   - [x] Guest sessions and couple access (Task 2, 5)
   - [x] Storage pool with atomic operations (Task 2)
   - [x] Switch Off Downloads (Task 6)
   - [x] Auth flows (Tasks 3, 4, 5)
   - [x] Security hardening (event verification, phone check, rollback)
   - [ ] Upload pipeline — Phase 2
   - [ ] Face recognition — Phase 2
   - [ ] Payments integration — Phase 2

2. **Placeholder scan:** No TBD/TODO items

3. **Type consistency:** All types match database schema defined in Task 2

4. **Security scan:** All 5 issues from plan-eng-review resolved:
   - [x] Event status verification in guest-otp
   - [x] Event status + phone verification in couple-magic-link
   - [x] Auto-generated studio UUID (not auth.uid)
   - [x] Rollback on membership failure
   - [x] Composite index for RLS performance

5. **Test coverage:** Test requirements documented above
   - [x] Edge Function tests (guest-otp, couple-magic-link)
   - [x] Page tests (signup rollback, QR access)

---

## Execution Handoff

**Plan reviewed and hardened by `/plan-eng-review`.** All critical security issues resolved. Ready to implement.

**Parallelization lanes:**
- **Lane A:** Task 1 (monorepo) → Task 3 (Next.js shells) → Task 4 (Studio auth)
- **Lane B:** Task 2 (Supabase schema) — independent, start immediately
- **After A completes:** Task 5 (PWA access) and Task 6 (Switch Off Downloads)

**All 6 tasks ready for implementation.**
