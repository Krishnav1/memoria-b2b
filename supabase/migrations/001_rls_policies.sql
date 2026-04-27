-- ============================================================
-- RLS Policies for Memoria B2B Platform
-- Photographer isolation: each studio only sees their own data
-- Note: All camelCase columns use double-quotes to preserve case
-- ============================================================

-- Events: photographers can only see events belonging to their studio
CREATE POLICY "Studios can view own events" ON events
  FOR SELECT USING (
    "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
  );

CREATE POLICY "Studios can create own events" ON events
  FOR INSERT WITH CHECK (
    "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
  );

CREATE POLICY "Studios can update own events" ON events
  FOR UPDATE USING (
    "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
  );

CREATE POLICY "Studios can delete own events" ON events
  FOR DELETE USING (
    "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
  );

-- Ceremonies: inherit event access via eventId
CREATE POLICY "View ceremonies for accessible events" ON ceremonies
  FOR SELECT USING (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

CREATE POLICY "Manage ceremonies for own events" ON ceremonies
  FOR ALL USING (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

-- Photos: inherit event access
CREATE POLICY "View photos for accessible events" ON photos
  FOR SELECT USING (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

CREATE POLICY "Upload photos to own events" ON photos
  FOR INSERT WITH CHECK (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

-- CoupleAccess: studio can manage, couple/family can read their own
CREATE POLICY "View couple_access for own events" ON couple_access
  FOR SELECT USING (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

CREATE POLICY "Manage couple_access for own events" ON couple_access
  FOR ALL USING (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

-- AccessLogs: studio can view, couple/family/guest can insert
CREATE POLICY "View access_logs for own events" ON access_logs
  FOR SELECT USING (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

CREATE POLICY "Insert access_logs for couple/family" ON access_logs
  FOR INSERT WITH CHECK (
    "visitorType" IN ('couple', 'family', 'guest')
  );

-- AiFaceIndex: studio can view, system can insert
CREATE POLICY "View ai_face_index for own events" ON ai_face_index
  FOR SELECT USING (
    "eventId" IN (
      SELECT id FROM events WHERE "studioId" IN (
        SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
      )
    )
  );

-- Public read for QR validation (no auth required)
CREATE POLICY "Public can view events by qrCode" ON events
  FOR SELECT USING (
    "qrCode" IS NOT NULL AND status != 'draft'
  );

-- ============================================================
-- Helper functions
-- ============================================================

-- Function to get studioId for current user
CREATE OR REPLACE FUNCTION get_user_studio_id()
RETURNS TEXT AS $$
  SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user owns an event
CREATE OR REPLACE FUNCTION user_owns_event(event_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE id = event_uuid::TEXT
    AND "studioId" = (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
  )
$$ LANGUAGE sql SECURITY DEFINER;
