-- Migration: Add projects table
-- Projects can contain multiple sessions

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add project_id column to sessions table (nullable for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions' 
        AND column_name = 'project_id'
    ) THEN
        ALTER TABLE sessions ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_projects_user_id') THEN
        CREATE INDEX idx_projects_user_id ON projects(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sessions_project_id') THEN
        CREATE INDEX idx_sessions_project_id ON sessions(project_id);
    END IF;
END $$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
