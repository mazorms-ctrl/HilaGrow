-- ============================================================================
-- Migration 003: Task Page Expansion
-- Resolves schema drift and adds discussion support
-- ============================================================================

-- ── 1. Add missing columns to tasks table ──────────────────────────────────

-- Add assigned_to (profile UUID reference) if not exists
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS assigned_to UUID 
    REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Ensure progress_mode and progress_manual exist (from original schema)
-- These should already exist but adding IF NOT EXISTS for safety
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS progress_mode TEXT NOT NULL DEFAULT 'auto' 
    CHECK (progress_mode IN ('auto', 'manual'));

ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS progress_manual INTEGER 
    CHECK (progress_manual >= 0 AND progress_manual <= 100);


-- ── 2. Create task_participants table ──────────────────────────────────────
-- Links tasks to participating profile IDs

CREATE TABLE IF NOT EXISTS task_participants (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_task_participants_task_id ON task_participants(task_id);
CREATE INDEX IF NOT EXISTS idx_task_participants_profile_id ON task_participants(profile_id);

-- Enable RLS for task_participants
ALTER TABLE task_participants ENABLE ROW LEVEL SECURITY;

-- Participants are visible/editable by anyone who can see the parent task
-- (relies on the existing tasks RLS policies)
CREATE POLICY "Task participants follow task access" ON task_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = task_participants.task_id
        AND (p.user_id = auth.uid() OR auth.role() = 'authenticated')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = task_participants.task_id
        AND (p.user_id = auth.uid() OR auth.role() = 'authenticated')
    )
  );


-- ── 3. Create task_comments table for realtime discussion ──────────────────

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author_id ON task_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Enable RLS for task_comments
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments on tasks they can access
CREATE POLICY "Comments follow task read access" ON task_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = task_comments.task_id
    )
  );

-- Authenticated users can create comments on tasks they can access
CREATE POLICY "Authenticated users can create comments" ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = task_comments.task_id
    )
    AND auth.uid() = author_id
  );

-- Users can update/delete their own comments
CREATE POLICY "Users can update own comments" ON task_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own comments" ON task_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Apply updated_at trigger to task_comments
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ── 4. Enable Realtime for task_comments ───────────────────────────────────
-- This allows Supabase Realtime subscriptions to work

ALTER PUBLICATION supabase_realtime ADD TABLE task_comments;


-- ── 5. Add enriched metadata fields structure documentation ─────────────────
-- Update the metadata comment to reflect the expanded lifecycle fields

COMMENT ON COLUMN tasks.metadata IS 'Enriched task lifecycle metadata including:
  - Context: department, processName, problemStatement, goal, targetAudience, desiredImpact, scope, outOfScope
  - Current state: currentState, baseline, painPoints, constraints, existingProcess, evidence
  - Specification: proposedSolution, deliverables, assumptions, requiredDecisions, acceptanceCriteria
  - KPI: kpiName, baseline, target, sourceOfTruth, measurementCadence, metricOwner
  - Timeline: startDate, dueDate (also milestones in separate table)
  - People: stakeholders (array), approvers (array)
  - Risks: risksBlockers, dependencies, links, mitigationPlan, escalationPath
  - Outcome: finalDeliverable, rolloutNotes, measuredResult, lessonsLearned';


-- ============================================================================
-- After running this migration:
-- 1. task_participants table exists and is ready for profile associations
-- 2. task_comments table is ready for realtime discussion
-- 3. Schema drift is resolved between app code and database
-- 4. Realtime subscriptions are enabled for comments
-- ============================================================================
