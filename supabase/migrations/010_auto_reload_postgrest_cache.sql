-- Migration 010: Auto-reload PostgREST schema cache on any DDL change
-- This is the PERMANENT fix — any future ALTER TABLE / CREATE TABLE will
-- automatically notify PostgREST to reload its schema cache, preventing 42703 errors.

-- Create a trigger function that fires pg_notify after schema changes
CREATE OR REPLACE FUNCTION public.notify_schema_change()
RETURNS event_trigger AS $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing event triggers if they exist
DROP EVENT TRIGGER IF EXISTS on_schema_change_notify_pgrst;
DROP EVENT TRIGGER IF EXISTS on_schema_start_notify_pgrst;

-- Create the event trigger for DDL_COMMAND_END events
-- This fires AFTER any ALTER/CREATE/DROP statement completes
CREATE EVENT TRIGGER on_schema_change_notify_pgrst
  ON ddl_command_end
  EXECUTE FUNCTION public.notify_schema_change();

-- Also notify on schema change start (covers some cases ddl_command_end misses)
CREATE EVENT TRIGGER on_schema_start_notify_pgrst
  ON ddl_command_start
  EXECUTE FUNCTION public.notify_schema_change();
