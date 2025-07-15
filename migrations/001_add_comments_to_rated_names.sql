-- Migration 001: Add comments field to rated_names table
-- This migration adds a comments field to store shared comments for both parents

-- Add comments column to rated_names table
ALTER TABLE rated_names 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- Add comment to track this migration
COMMENT ON COLUMN rated_names.comments IS 'Shared comments for both parents about this name'; 