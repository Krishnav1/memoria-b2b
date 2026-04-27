-- Add missing photoGbUsed column to studios table
-- The trigger 003_photo_gb_trigger tries to update this column but it was never created
-- Note: camelCase columns use double-quotes
ALTER TABLE studios ADD COLUMN IF NOT EXISTS "photoGbUsed" DOUBLE PRECISION DEFAULT 0;

-- Backfill: calculate photoGbUsed from events for studios that have events
UPDATE studios s
SET "photoGbUsed" = (
  SELECT COALESCE(SUM(e."photoGbUsed"), 0)
  FROM events e
  WHERE e."studioId" = s.id
)
WHERE EXISTS (SELECT 1 FROM events e WHERE e."studioId" = s.id AND e."photoGbUsed" > 0);
