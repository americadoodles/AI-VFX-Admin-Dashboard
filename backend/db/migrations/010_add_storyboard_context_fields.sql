-- Migration 010: Add storyboard context fields to generation_jobs
-- These columns support story-aware storyboard generation where each shot
-- carries narrative context (where_in_story, reason_for_shot) and structured
-- visual metadata (background_environment, style_lighting).

ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS where_in_story TEXT DEFAULT '';
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS reason_for_shot TEXT DEFAULT '';
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS background_environment TEXT DEFAULT '';
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS style_lighting TEXT DEFAULT '';
