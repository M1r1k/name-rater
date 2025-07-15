-- Simple Supabase schema for Name Rater App
-- Run this in your Supabase SQL editor

-- Rated names table (names that users have rated)
CREATE TABLE IF NOT EXISTS rated_names (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Name ratings table
CREATE TABLE IF NOT EXISTS name_ratings (
    id BIGSERIAL PRIMARY KEY,
    name_id BIGINT REFERENCES rated_names(id) ON DELETE CASCADE,
    dimension_key TEXT NOT NULL,
    parent_id TEXT NOT NULL, -- 'dad', 'mom', etc.
    rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name_id, dimension_key, parent_id)
);

-- Name weights table
CREATE TABLE IF NOT EXISTS name_weights (
    id BIGSERIAL PRIMARY KEY,
    dimension_key TEXT NOT NULL UNIQUE,
    weight INTEGER NOT NULL CHECK (weight >= 0 AND weight <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE rated_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE name_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE name_weights ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we're not using authentication)
CREATE POLICY "Allow all operations on rated_names" ON rated_names
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on name_ratings" ON name_ratings
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on name_weights" ON name_weights
    FOR ALL USING (true);

-- Insert default weights
INSERT INTO name_weights (dimension_key, weight) VALUES
    ('personalFeeling', 10),
    ('locality', 9),
    ('internationality', 8),
    ('transliterations', 7),
    ('shortVersion', 6),
    ('popularity', 5),
    ('ukrainianFriendly', 4),
    ('denmarkAttitude', 3),
    ('lastNameSound', 2),
    ('tragedeigh', 1)
ON CONFLICT (dimension_key) DO NOTHING; 