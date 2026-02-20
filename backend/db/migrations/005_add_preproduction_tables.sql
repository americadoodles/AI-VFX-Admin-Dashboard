-- Migration: Add pre-production tables and project fields
-- Stores Characters, Environments, References, Shots and project-level settings

-- Add pre-production fields to projects table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'script'
    ) THEN
        ALTER TABLE projects ADD COLUMN script TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'additional_notes'
    ) THEN
        ALTER TABLE projects ADD COLUMN additional_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'aspect_ratio'
    ) THEN
        ALTER TABLE projects ADD COLUMN aspect_ratio VARCHAR(10) DEFAULT '9:16';
    END IF;
END $$;

-- Characters table
CREATE TABLE IF NOT EXISTS project_characters (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'New Character',
    description TEXT DEFAULT '',
    image_urls JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Environments table
CREATE TABLE IF NOT EXISTS project_environments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'New Environment',
    description TEXT DEFAULT '',
    image_urls JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- References table
CREATE TABLE IF NOT EXISTS project_references (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'New Reference',
    image_urls JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pre-production Shots table (separate from generation_jobs which are storyboard shots)
CREATE TABLE IF NOT EXISTS project_shots (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'New Shot',
    script_line TEXT DEFAULT '',
    image_urls JSONB DEFAULT '[]'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_characters_project_id') THEN
        CREATE INDEX idx_project_characters_project_id ON project_characters(project_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_environments_project_id') THEN
        CREATE INDEX idx_project_environments_project_id ON project_environments(project_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_references_project_id') THEN
        CREATE INDEX idx_project_references_project_id ON project_references(project_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_project_shots_project_id') THEN
        CREATE INDEX idx_project_shots_project_id ON project_shots(project_id);
    END IF;
END $$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_project_characters_updated_at ON project_characters;
CREATE TRIGGER update_project_characters_updated_at
    BEFORE UPDATE ON project_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_environments_updated_at ON project_environments;
CREATE TRIGGER update_project_environments_updated_at
    BEFORE UPDATE ON project_environments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_references_updated_at ON project_references;
CREATE TRIGGER update_project_references_updated_at
    BEFORE UPDATE ON project_references
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_shots_updated_at ON project_shots;
CREATE TRIGGER update_project_shots_updated_at
    BEFORE UPDATE ON project_shots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
