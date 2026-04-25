-- ============================================================
-- Photo face index for AWS Rekognition face search
-- Maps Rekognition FaceId -> Supabase photo.id
-- ============================================================

CREATE TABLE photo_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  face_id TEXT NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast face_id lookups during search
CREATE INDEX idx_photo_faces_face_id ON photo_faces(face_id);

-- Index for event-scoped queries (when searching within one event)
CREATE INDEX idx_photo_faces_event_id ON photo_faces(event_id);

-- Unique constraint: one face per photo (Rekognition may return same face_id for same photo on re-index)
CREATE UNIQUE INDEX idx_photo_faces_unique ON photo_faces(photo_id, face_id);
