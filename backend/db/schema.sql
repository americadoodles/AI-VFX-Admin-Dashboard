-- Database Schema for Auto Video Generation Backend
-- Supports social login (OAuth) and traditional email/password authentication

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100),
    password VARCHAR(255), -- NULL for OAuth-only users
    auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'github', etc.
    provider_user_id VARCHAR(255), -- OAuth provider's user ID
    avatar_url TEXT,
    is_confirmed BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing users table (for migrations)
DO $$
BEGIN
    -- Add auth_provider column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_provider') THEN
        ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email';
    END IF;
    
    -- Add provider_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'provider_user_id') THEN
        ALTER TABLE users ADD COLUMN provider_user_id VARCHAR(255);
    END IF;
    
    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Add is_confirmed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_confirmed') THEN
        ALTER TABLE users ADD COLUMN is_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- OAuth accounts table (for linking multiple OAuth providers to one user)
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github', 'facebook', etc.
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    avatar_url TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider) -- One OAuth account per provider per user
);

-- Add unique constraint if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'oauth_accounts_user_id_provider_key'
    ) THEN
        ALTER TABLE oauth_accounts ADD CONSTRAINT oauth_accounts_user_id_provider_key 
        UNIQUE(user_id, provider);
    END IF;
END $$;

-- Indexes for performance (only create if they don't exist and columns exist)
DO $$
BEGIN
    -- Create index on email if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
            CREATE INDEX idx_users_email ON users(email);
        END IF;
    END IF;
    
    -- Create index on auth_provider if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_provider') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_auth_provider') THEN
            CREATE INDEX idx_users_auth_provider ON users(auth_provider);
        END IF;
    END IF;
    
    -- Create index on provider_user_id if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'provider_user_id') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_provider_user_id') THEN
            CREATE INDEX idx_users_provider_user_id ON users(provider_user_id);
        END IF;
    END IF;
    
    -- Create indexes on oauth_accounts if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'oauth_accounts') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_oauth_accounts_user_id') THEN
            CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_oauth_accounts_provider') THEN
            CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_oauth_accounts_provider_user_id') THEN
            CREATE INDEX idx_oauth_accounts_provider_user_id ON oauth_accounts(provider, provider_user_id);
        END IF;
    END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER update_oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
