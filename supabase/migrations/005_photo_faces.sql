-- ============================================================
-- Photo face index for AWS Rekognition face search
-- Maps Rekognition FaceId -> Supabase photo.id
-- Note: All columns use TEXT instead of UUID since PostgreSQL IDs are TEXT
-- ============================================================

CREATE TABLE IF NOT EXISTS photo_faces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "photoId" TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  "faceId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  "indexedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast face_id lookups during search
CREATE INDEX IF NOT EXISTS idx_photo_faces_face_id ON photo_faces("faceId");

-- Index for event-scoped queries (when searching within one event)
CREATE INDEX IF NOT EXISTS idx_photo_faces_event_id ON photo_faces("eventId");

-- Unique constraint: one face per photo (Rekognition may return same face_id for same photo on re-index)
CREATE UNIQUE INDEX idx_photo_faces_unique ON photo_faces("photoId", "faceId");
