-- Add selected_image_id to generation_jobs so the shot card can show only the chosen image.
-- When the referenced image is deleted, set to NULL.
ALTER TABLE generation_jobs
ADD COLUMN IF NOT EXISTS selected_image_id INTEGER REFERENCES generated_images(id) ON DELETE SET NULL;
