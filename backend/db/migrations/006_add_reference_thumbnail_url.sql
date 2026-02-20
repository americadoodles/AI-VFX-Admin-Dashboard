-- Migration: Add thumbnail_url column to reference_images table
-- This allows storing a pre-generated thumbnail for reference images,
-- matching the pattern already used for generated_images.

ALTER TABLE reference_images
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN reference_images.thumbnail_url IS 'URL to thumbnail version (256px max) for fast loading in UI';
