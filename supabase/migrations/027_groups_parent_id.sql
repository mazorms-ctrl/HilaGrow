-- Migration 027: Add parent_id to groups table
-- Enables category nesting in the Big Picture WBS editor.
-- A group with parent_id set is displayed as a sub-category under its parent.

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_groups_parent_id ON groups(parent_id);
