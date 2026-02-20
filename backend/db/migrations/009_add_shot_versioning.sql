-- Add versioning support to generation_jobs (shots)
-- parent_shot_id links version 2+ back to the root shot (version 1)
-- version_number tracks the version within a shot group
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS parent_shot_id INTEGER REFERENCES generation_jobs(id) ON DELETE CASCADE;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;
