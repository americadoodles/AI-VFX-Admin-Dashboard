-- Add sort_order so users can reorder shots within a session via drag-and-drop.
-- Backfill existing rows with id so the initial order matches creation order.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'generation_jobs'
  ) THEN
    ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    UPDATE generation_jobs SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL;
    -- Ensure is_visible NULLs (rows created before migration 001) default to TRUE
    UPDATE generation_jobs SET is_visible = TRUE WHERE is_visible IS NULL;
  END IF;
END $$;
