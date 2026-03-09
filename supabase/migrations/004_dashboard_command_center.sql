-- ============================================================================
-- Migration 004: Dashboard Command Center
-- Adds tree-structure support, SLA due dates, activity feed, and comment threading.
-- Safe to re-run: all DDL uses IF NOT EXISTS / IF EXISTS guards.
-- ============================================================================


-- ── 1. Extend tasks table ────────────────────────────────────────────────────

-- Tree structure: a task can be a sub-task of another task.
-- Self-referential FK deferred to avoid insertion-order issues.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

-- is_leaf = true  → execution-level task (has no children / is a leaf node)
-- is_leaf = false → summary/parent task whose progress rolls up from children
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_leaf BOOLEAN NOT NULL DEFAULT TRUE;

-- Direct due_date for SLA tracking (separate from milestone due dates)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);


-- ── 2. Create activity_feed table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_feed (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT        NOT NULL,   -- e.g. 'status_changed', 'progress_updated'
  content     TEXT,                   -- human-readable description of the change
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_task_id    ON activity_feed(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id    ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at);

-- updated_at auto-maintenance (reuses the function from schema.sql)
DROP TRIGGER IF EXISTS update_activity_feed_updated_at ON activity_feed;
CREATE TRIGGER update_activity_feed_updated_at
  BEFORE UPDATE ON activity_feed
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the feed (collaborative workspace)
DROP POLICY IF EXISTS "Authenticated users read activity_feed" ON activity_feed;
CREATE POLICY "Authenticated users read activity_feed" ON activity_feed
  FOR SELECT TO authenticated USING (true);

-- Any authenticated user can insert feed entries (system or UI can log events)
DROP POLICY IF EXISTS "Authenticated users insert activity_feed" ON activity_feed;
CREATE POLICY "Authenticated users insert activity_feed" ON activity_feed
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only the entry author can update their own feed entry
DROP POLICY IF EXISTS "Users update own activity_feed entries" ON activity_feed;
CREATE POLICY "Users update own activity_feed entries" ON activity_feed
  FOR UPDATE TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the entry author can delete their own feed entry
DROP POLICY IF EXISTS "Users delete own activity_feed entries" ON activity_feed;
CREATE POLICY "Users delete own activity_feed entries" ON activity_feed
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── 3. Extend task_comments: link a comment to a feed entry ─────────────────
-- Nullable: regular comments are unaffected; a non-null value makes the comment
-- a direct reply to a specific activity_feed entry.

ALTER TABLE task_comments
  ADD COLUMN IF NOT EXISTS activity_id UUID
    REFERENCES activity_feed(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_comments_activity_id ON task_comments(activity_id);


-- ── 4. Enable Realtime for activity_feed ─────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE activity_feed;


-- ============================================================================
-- Summary of changes
-- ============================================================================
-- tasks
--   + parent_id      UUID  → tasks(id)          (tree hierarchy)
--   + is_leaf        BOOL  DEFAULT TRUE          (leaf vs summary task)
--   + due_date       TIMESTAMPTZ                 (SLA deadline)
--
-- activity_feed (new)
--   id, task_id, user_id, action_type, content, created_at, updated_at
--   RLS: authenticated read/insert-own/update-own/delete-own
--   Realtime: enabled
--
-- task_comments
--   + activity_id    UUID  → activity_feed(id)   (thread a comment on a feed entry)
-- ============================================================================
