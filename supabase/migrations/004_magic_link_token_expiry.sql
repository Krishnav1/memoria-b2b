-- ============================================================
-- Add magic link token expiry for security
-- Tokens expire after 7 days by default
-- ============================================================

ALTER TABLE events
ADD COLUMN IF NOT EXISTS magicLinkTokenExpiry TIMESTAMPTZ;

-- Add index for quick token lookup
CREATE INDEX IF NOT EXISTS idx_events_magicLinkToken ON events(magicLinkToken)
  WHERE magicLinkToken IS NOT NULL;
