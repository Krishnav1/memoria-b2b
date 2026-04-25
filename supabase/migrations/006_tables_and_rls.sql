-- ============================================================
-- 006: Create missing tables + RLS for studios/users/signup
-- Handles tables that don't exist yet so 001 can apply cleanly
-- ============================================================

-- Create couple_access table if not exists
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

-- Create ai_face_index table if not exists (maps faces to photos for search)
CREATE TABLE IF NOT EXISTS ai_face_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eventId UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  photoId UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  faceId TEXT NOT NULL,
  confidence FLOAT,
  indexedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for face search
CREATE INDEX IF NOT EXISTS idx_ai_face_index_face_id ON ai_face_index(faceId);
CREATE INDEX IF NOT EXISTS idx_ai_face_index_event_id ON ai_face_index(eventId);

-- ============================================================
-- RLS for Studios and Users (critical for signup)
-- ============================================================

ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Studios: any authenticated user can create their studio
DROP POLICY IF EXISTS "Authenticated users can create studios" ON studios;
CREATE POLICY "Authenticated users can create studios" ON studios
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own studio" ON studios;
CREATE POLICY "Users can view own studio" ON studios
  FOR SELECT USING (
    id IN (SELECT studioId FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Studio owners can update their studio" ON studios;
CREATE POLICY "Studio owners can update their studio" ON studios
  FOR UPDATE USING (
    id IN (SELECT studioId FROM users WHERE id = auth.uid())
  );

-- Users: users can only see/manage their own record
DROP POLICY IF EXISTS "Users can insert own record" ON users;
CREATE POLICY "Users can insert own record" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (id = auth.uid());