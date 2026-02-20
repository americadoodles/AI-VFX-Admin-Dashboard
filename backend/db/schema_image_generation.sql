-- Database Schema for Image Generation Features
-- Extends the base schema with tables for sessions, reference images, generation jobs, and generated images

-- Sessions table
-- Organizes generation requests into user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Session',
    thumbnail_url TEXT, -- URL to the first generated image thumbnail
    generated_count INTEGER DEFAULT 0, -- Number of images generated in this session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reference Images table
-- Stores uploaded reference images that users can use for generation
CREATE TABLE IF NOT EXISTS reference_images (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL, -- Optional: link to session if uploaded during a session
    gcp_bucket_path TEXT NOT NULL, -- Full path in GCP bucket: video-gen-image-bucket/path/to/image.jpg
    gcp_url TEXT NOT NULL, -- Public URL or signed URL to access the image
    thumbnail_url TEXT, -- URL to thumbnail version (256px max) for fast loading in UI
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT, -- Size in bytes
    mime_type VARCHAR(100), -- e.g., 'image/jpeg', 'image/png'
    width INTEGER, -- Image width in pixels
    height INTEGER, -- Image height in pixels
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generation Jobs table
-- Stores each generation request with all parameters and metadata
CREATE TABLE IF NOT EXISTS generation_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- User input parameters
    name TEXT, -- Optional shot name (user-editable)
    prompt TEXT NOT NULL, -- Original user prompt
    generated_prompt TEXT, -- AI-generated/enhanced prompt
    
    -- Visibility: when FALSE, shot is "closed" and hidden from main list
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Generation settings
    shot_type VARCHAR(50) DEFAULT 'None', -- ShotType enum value
    camera_angle VARCHAR(50) DEFAULT 'None', -- CameraAngle enum value
    style VARCHAR(50) DEFAULT 'None', -- Style enum value
    location TEXT, -- Location description
    lighting TEXT, -- Lighting conditions
    weather TEXT, -- Weather conditions
    is_custom_enabled BOOLEAN DEFAULT FALSE,
    aspect_ratio VARCHAR(20) DEFAULT '16:9', -- e.g., '16:9', '1:1', '9:16'
    number_of_shots INTEGER DEFAULT 1 CHECK (number_of_shots >= 1 AND number_of_shots <= 10),
    model_used VARCHAR(50) DEFAULT 'DALL-E', -- Model name used (e.g., 'DALL-E', 'DALL-E', etc.)
    
    -- Generation metadata
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT, -- Error message if generation failed
    generation_method VARCHAR(50), -- 'openai', 'fallback', etc.
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated Images table
-- Stores the output images from generation jobs
CREATE TABLE IF NOT EXISTS generated_images (
    id SERIAL PRIMARY KEY,
    generation_job_id INTEGER NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Image storage
    gcp_bucket_path TEXT NOT NULL, -- Full path: video-gen-image-bucket/generated/path/to/image.jpg
    gcp_url TEXT NOT NULL, -- Public URL or signed URL to access the image
    thumbnail_url TEXT, -- URL to thumbnail version (if generated)
    
    -- Image metadata
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT, -- Size in bytes
    mime_type VARCHAR(100) DEFAULT 'image/jpeg',
    width INTEGER, -- Image width in pixels
    height INTEGER, -- Image height in pixels
    
    -- Generation metadata
    prompt_used TEXT, -- The prompt that was used to generate this specific image
    generation_index INTEGER, -- Index of this image in the batch (1, 2, 3, etc.)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generation Job Reference Images junction table
-- Links reference images to generation jobs (many-to-many relationship)
CREATE TABLE IF NOT EXISTS generation_job_reference_images (
    id SERIAL PRIMARY KEY,
    generation_job_id INTEGER NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
    reference_image_id INTEGER NOT NULL REFERENCES reference_images(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(generation_job_id, reference_image_id) -- Prevent duplicate links
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reference_images_user_id ON reference_images(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_images_session_id ON reference_images(session_id);
CREATE INDEX IF NOT EXISTS idx_reference_images_uploaded_at ON reference_images(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_session_id ON generation_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_created_at ON generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_completed_at ON generation_jobs(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_images_generation_job_id ON generated_images(generation_job_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_session_id ON generated_images(session_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_job_ref_images_job_id ON generation_job_reference_images(generation_job_id);
CREATE INDEX IF NOT EXISTS idx_generation_job_ref_images_ref_id ON generation_job_reference_images(reference_image_id);

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generation_jobs_updated_at ON generation_jobs;
CREATE TRIGGER update_generation_jobs_updated_at
    BEFORE UPDATE ON generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update session thumbnail and count when images are generated
CREATE OR REPLACE FUNCTION update_session_on_image_generation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session thumbnail if this is the first image in the session
    IF NEW.session_id IS NOT NULL THEN
        UPDATE sessions
        SET 
            thumbnail_url = COALESCE(
                (SELECT gcp_url FROM generated_images 
                 WHERE session_id = NEW.session_id 
                 ORDER BY created_at ASC LIMIT 1),
                thumbnail_url
            ),
            generated_count = (
                SELECT COUNT(*) FROM generated_images 
                WHERE session_id = NEW.session_id
            ),
            updated_at = NOW()
        WHERE id = NEW.session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session when new image is generated
DROP TRIGGER IF EXISTS trigger_update_session_on_image_generation ON generated_images;
CREATE TRIGGER trigger_update_session_on_image_generation
    AFTER INSERT ON generated_images
    FOR EACH ROW
    EXECUTE FUNCTION update_session_on_image_generation();

-- Function to update session count when images are deleted
CREATE OR REPLACE FUNCTION update_session_on_image_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.session_id IS NOT NULL THEN
        UPDATE sessions
        SET 
            generated_count = (
                SELECT COUNT(*) FROM generated_images 
                WHERE session_id = OLD.session_id
            ),
            updated_at = NOW()
        WHERE id = OLD.session_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session when image is deleted
DROP TRIGGER IF EXISTS trigger_update_session_on_image_deletion ON generated_images;
CREATE TRIGGER trigger_update_session_on_image_deletion
    AFTER DELETE ON generated_images
    FOR EACH ROW
    EXECUTE FUNCTION update_session_on_image_deletion();
