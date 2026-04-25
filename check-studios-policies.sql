-- Check RLS policies on studios table
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'studios';