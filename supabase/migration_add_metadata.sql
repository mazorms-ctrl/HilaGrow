-- Migration to add metadata fields to tasks table
-- This allows us to store additional fields from the MedicalTask interface

-- Add metadata column to store additional task information
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add priority field
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('P1', 'P2', 'P3'));

-- Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN (metadata);

-- Create index for priority
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Update the tasks table comment
COMMENT ON COLUMN tasks.metadata IS 'Additional task metadata including department, processName, problemStatement, goal, kpiName, baseline, target, measurementCadence, startDate, dueDate, stakeholders, risksBlockers, dependencies, links';
COMMENT ON COLUMN tasks.priority IS 'Task priority: P1 (high), P2 (medium), P3 (low)';
