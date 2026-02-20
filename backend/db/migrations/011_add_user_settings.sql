-- User settings table for AI provider / model preferences
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    ai_provider VARCHAR(20) DEFAULT 'openai',
    text_model VARCHAR(50) DEFAULT 'gpt-4o-mini',
    image_model VARCHAR(50) DEFAULT 'gpt-image-1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
