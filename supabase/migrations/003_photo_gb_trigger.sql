-- ============================================================
-- Auto-increment photoGBUsed when photos are inserted
-- Replaces client-side RPC call which was unreliable
-- ============================================================

-- Create the trigger function
CREATE OR REPLACE FUNCTION increment_photo_gb_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  file_size_gb NUMERIC;
BEGIN
  -- Calculate file size in GB from fileSizeBytes (stored in bytes)
  file_size_gb := (NEW.fileSizeBytes::NUMERIC) / (1024 * 1024 * 1024);

  -- Increment events.photoGbUsed
  UPDATE events
  SET photoGbUsed = COALESCE(photoGbUsed, 0) + file_size_gb
  WHERE id = NEW.eventId;

  -- Increment studios.photoGbUsed (via the event's studio)
  UPDATE studios
  SET photoGbUsed = COALESCE(photoGbUsed, 0) + file_size_gb
  WHERE id = (SELECT studioId FROM events WHERE id = NEW.eventId);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on photos table
DROP TRIGGER IF EXISTS on_photo_insert ON photos;
CREATE TRIGGER on_photo_insert
  AFTER INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION increment_photo_gb_on_insert();

-- Drop the old RPC-based function (superseded by trigger)
DROP FUNCTION IF EXISTS increment_photo_gb_used(UUID, NUMERIC);
