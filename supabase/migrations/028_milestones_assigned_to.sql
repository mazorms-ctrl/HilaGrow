-- =============================================================
-- Migration 028: Add assigned_to column to milestones table
-- and relax RLS so any project participant can manage milestones.
--
-- Root cause of milestone persistence bug:
--   1. updateTask upsert included `assigned_to` but the column
--      was never created → every insert failed after the delete,
--      silently wiping milestones on every save.
--   2. RLS policies only allowed the project CREATOR to write
--      milestones. Participants / assignees were blocked.
-- =============================================================

-- 1. Add assigned_to column (safe no-op if it already exists)
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS assigned_to UUID
    REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_milestones_assigned_to
  ON milestones(assigned_to);

-- 2. Expand INSERT policy: project owner OR task assignee OR task participant
DROP POLICY IF EXISTS "Users insert milestones in own projects" ON milestones;

CREATE POLICY "Users insert milestones in own projects" ON milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups  g  ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      LEFT JOIN task_participants tp ON tp.task_id = t.id
      WHERE t.id = task_id
        AND (
          p.user_id       = auth.uid()   -- project creator
          OR t.assigned_to = auth.uid()  -- task assignee
          OR tp.profile_id = auth.uid()  -- task participant
        )
    )
  );

-- 3. Expand UPDATE policy
DROP POLICY IF EXISTS "Users update milestones in own projects" ON milestones;

CREATE POLICY "Users update milestones in own projects" ON milestones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups  g  ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      LEFT JOIN task_participants tp ON tp.task_id = t.id
      WHERE t.id = milestones.task_id
        AND (
          p.user_id       = auth.uid()
          OR t.assigned_to = auth.uid()
          OR tp.profile_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups  g  ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      LEFT JOIN task_participants tp ON tp.task_id = t.id
      WHERE t.id = milestones.task_id
        AND (
          p.user_id       = auth.uid()
          OR t.assigned_to = auth.uid()
          OR tp.profile_id = auth.uid()
        )
    )
  );

-- 4. Expand DELETE policy
DROP POLICY IF EXISTS "Users delete milestones in own projects" ON milestones;

CREATE POLICY "Users delete milestones in own projects" ON milestones
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups  g  ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      LEFT JOIN task_participants tp ON tp.task_id = t.id
      WHERE t.id = milestones.task_id
        AND (
          p.user_id       = auth.uid()
          OR t.assigned_to = auth.uid()
          OR tp.profile_id = auth.uid()
        )
    )
  );
