-- Add breakdown fields to generation_jobs for storing AI-analyzed shot components
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS subject_action TEXT;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS custom_idea TEXT;
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS suggested_prompt TEXT;
