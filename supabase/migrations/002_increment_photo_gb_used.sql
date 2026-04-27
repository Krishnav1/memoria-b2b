-- ============================================================
-- Increment photoGBUsed after successful upload
-- Called via supabase.rpc('increment_photo_gb_used', {...})
-- Note: camelCase columns use double-quotes
-- ============================================================

CREATE OR REPLACE FUNCTION increment_photo_gb_used(event_id UUID, gb_amount NUMERIC)
RETURNS VOID AS $$
  UPDATE events
  SET "photoGbUsed" = COALESCE("photoGbUsed", 0) + gb_amount
  WHERE id = event_id::TEXT;
$$ LANGUAGE sql SECURITY DEFINER;

-- Allow authenticated users to call this function for their studio's events
CREATE POLICY "Increment photoGB for own events" ON events
  FOR UPDATE USING (
    "studioId" IN (SELECT "studioId" FROM users WHERE id = auth.uid()::TEXT)
  );

-- Note: The SECURITY DEFINER function runs with elevated privileges,
-- so we also need EXECUTE permission on the function itself
GRANT EXECUTE ON FUNCTION increment_photo_gb_used TO authenticated;
