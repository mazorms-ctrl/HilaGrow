-- Add note column to milestones table
-- This migration adds support for milestone notes/descriptions

ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add comment for documentation
COMMENT ON COLUMN milestones.note IS 'Optional note or description for the milestone';
