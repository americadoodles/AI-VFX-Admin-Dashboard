-- Add name and is_visible to generation_jobs for shot naming and close (hide) behavior.
-- Does NOT drop or create the table: only adds columns to the existing table if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'generation_jobs'
  ) THEN
    ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
  END IF;
END $$;
