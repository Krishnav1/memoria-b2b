-- Simpler fix: completely open studios INSERT for now (no auth required)
-- Users will be scoped by their user record, not studios

DROP POLICY IF EXISTS "Allow anonymous studio creation" ON studios;
CREATE POLICY "Allow anonymous studio creation" ON studios
  FOR INSERT WITH CHECK (true);