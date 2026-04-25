-- Full schema fix: create all missing tables + correct RLS for signup
-- This is the single SQL file to run on Supabase SQL Editor

-- ============================================================
-- Create missing tables first (needed by 001_rls_policies.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS couple_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eventId UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  accessType TEXT NOT NULL DEFAULT 'couple',
  guestName TEXT,
  guestEmail TEXT,
  accessToken TEXT UNIQUE,
  tokenExpiry TIMESTAMPTZ,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_face_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eventId UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  photoId UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  faceId TEXT NOT NULL,
  confidence FLOAT,
  indexedAt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_face_index_face_id ON ai_face_index(faceId);
CREATE INDEX IF NOT EXISTS idx_ai_face_index_event_id ON ai_face_index(eventId);

-- ============================================================
-- Studios RLS: allow anyone to INSERT (signup), auth users to SELECT/UPDATE own
-- ============================================================
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous studio creation" ON studios;
CREATE POLICY "Allow anonymous studio creation" ON studios
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own studio" ON studios;
CREATE POLICY "Users can view own studio" ON studios
  FOR SELECT USING (id IN (SELECT studioId FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own studio" ON studios;
CREATE POLICY "Users can update own studio" ON studios
  FOR UPDATE USING (id IN (SELECT studioId FROM users WHERE id = auth.uid()));

-- ============================================================
-- Users RLS: user can only insert/select/update their own record
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated user signup" ON users;
CREATE POLICY "Allow authenticated user signup" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- Events RLS: studio members can CRUD their studio's events
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view events by qrCode" ON events;
CREATE POLICY "Public can view events by qrCode" ON events
  FOR SELECT USING (qrCode IS NOT NULL AND status != 'draft');

DROP POLICY IF EXISTS "Studios can view own events" ON events;
CREATE POLICY "Studios can view own events" ON events
  FOR SELECT USING (studioId IN (SELECT studioId FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Studios can create own events" ON events;
CREATE POLICY "Studios can create own events" ON events
  FOR INSERT WITH CHECK (studioId IN (SELECT studioId FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Studios can update own events" ON events;
CREATE POLICY "Studios can update own events" ON events
  FOR UPDATE USING (studioId IN (SELECT studioId FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Studios can delete own events" ON events;
CREATE POLICY "Studios can delete own events" ON events
  FOR DELETE USING (studioId IN (SELECT studioId FROM users WHERE id = auth.uid()));

-- ============================================================
-- Ceremonies RLS
-- ============================================================
ALTER TABLE ceremonies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View ceremonies for accessible events" ON ceremonies;
CREATE POLICY "View ceremonies for accessible events" ON ceremonies
  FOR SELECT USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Manage ceremonies for own events" ON ceremonies;
CREATE POLICY "Manage ceremonies for own events" ON ceremonies
  FOR ALL USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

-- ============================================================
-- Photos RLS
-- ============================================================
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View photos for accessible events" ON photos;
CREATE POLICY "View photos for accessible events" ON photos
  FOR SELECT USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Upload photos to own events" ON photos;
CREATE POLICY "Upload photos to own events" ON photos
  FOR INSERT WITH CHECK (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Studios can update photos" ON photos;
CREATE POLICY "Studios can update photos" ON photos
  FOR UPDATE USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Studios can delete photos" ON photos;
CREATE POLICY "Studios can delete photos" ON photos
  FOR DELETE USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

-- ============================================================
-- couple_access RLS
-- ============================================================
ALTER TABLE couple_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View couple_access for own events" ON couple_access;
CREATE POLICY "View couple_access for own events" ON couple_access
  FOR SELECT USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Manage couple_access for own events" ON couple_access;
CREATE POLICY "Manage couple_access for own events" ON couple_access
  FOR ALL USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Insert couple_access for couple/guest" ON couple_access;
CREATE POLICY "Insert couple_access for couple/guest" ON couple_access
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- access_logs RLS
-- ============================================================
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View access_logs for own events" ON access_logs;
CREATE POLICY "View access_logs for own events" ON access_logs
  FOR SELECT USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Insert access_logs for couple/family/guest" ON access_logs;
CREATE POLICY "Insert access_logs for couple/family/guest" ON access_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- ai_face_index RLS
-- ============================================================
ALTER TABLE ai_face_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View ai_face_index for own events" ON ai_face_index;
CREATE POLICY "View ai_face_index for own events" ON ai_face_index
  FOR SELECT USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Insert ai_face_index for system" ON ai_face_index;
CREATE POLICY "Insert ai_face_index for system" ON ai_face_index
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Manage ai_face_index for own events" ON ai_face_index;
CREATE POLICY "Manage ai_face_index for own events" ON ai_face_index
  FOR ALL USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

-- ============================================================
-- photo_faces RLS (from migration 005)
-- ============================================================
ALTER TABLE photo_faces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view photo_faces" ON photo_faces;
CREATE POLICY "Users can view photo_faces" ON photo_faces
  FOR SELECT USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "Insert photo_faces for indexing" ON photo_faces;
CREATE POLICY "Insert photo_faces for indexing" ON photo_faces
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Manage photo_faces for own events" ON photo_faces;
CREATE POLICY "Manage photo_faces for own events" ON photo_faces
  FOR ALL USING (
    eventId IN (SELECT id FROM events WHERE studioId IN (SELECT studioId FROM users WHERE id = auth.uid()))
  );

-- ============================================================
-- plans table RLS
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View plans for own studio" ON plans;
CREATE POLICY "View plans for own studio" ON plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert plans for own studio" ON plans;
CREATE POLICY "Insert plans for own studio" ON plans
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update plans for own studio" ON plans;
CREATE POLICY "Update plans for own studio" ON plans
  FOR UPDATE USING (true);