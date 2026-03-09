-- Migration: Add user ownership to projects and enforce collaborative workspace isolation
-- Run this in your Supabase SQL editor

-- ============================================================
-- 1. Enable RLS on all core tables
--    (policies are silently ignored until RLS is enabled)
-- ============================================================
ALTER TABLE projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Add user_id column to projects (nullable first)
-- ============================================================
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Remove any existing projects with no owner (orphaned rows would block the NOT NULL below).
-- If you have existing data you want to keep, assign them an owner first:
--   UPDATE projects SET user_id = '<your-user-uuid>' WHERE user_id IS NULL;
DELETE FROM projects WHERE user_id IS NULL;

-- Enforce NOT NULL now that orphaned rows are gone
ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- 3. Index for fast per-user lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- ============================================================
-- 4. Drop old open-access policies (idempotent)
-- ============================================================
DROP POLICY IF EXISTS "Allow all on projects"   ON projects;
DROP POLICY IF EXISTS "Allow all on groups"     ON groups;
DROP POLICY IF EXISTS "Allow all on tasks"      ON tasks;
DROP POLICY IF EXISTS "Allow all on milestones" ON milestones;

-- Drop new policies too so this migration can be re-run safely
DROP POLICY IF EXISTS "Authenticated users read projects"               ON projects;
DROP POLICY IF EXISTS "Users insert own projects"                       ON projects;
DROP POLICY IF EXISTS "Users update own projects"                       ON projects;
DROP POLICY IF EXISTS "Users delete own projects"                       ON projects;

DROP POLICY IF EXISTS "Authenticated users read groups"                 ON groups;
DROP POLICY IF EXISTS "Users insert groups in own projects"             ON groups;
DROP POLICY IF EXISTS "Users update groups in own projects"             ON groups;
DROP POLICY IF EXISTS "Users delete groups in own projects"             ON groups;

DROP POLICY IF EXISTS "Authenticated users read tasks"                  ON tasks;
DROP POLICY IF EXISTS "Users insert tasks in own projects"              ON tasks;
DROP POLICY IF EXISTS "Users update tasks in own projects"              ON tasks;
DROP POLICY IF EXISTS "Users delete tasks in own projects"              ON tasks;

DROP POLICY IF EXISTS "Authenticated users read milestones"             ON milestones;
DROP POLICY IF EXISTS "Users insert milestones in own projects"         ON milestones;
DROP POLICY IF EXISTS "Users update milestones in own projects"         ON milestones;
DROP POLICY IF EXISTS "Users delete milestones in own projects"         ON milestones;

-- ============================================================
-- Collaborative model: all authenticated users share the workspace.
-- All authenticated users can read everything.
-- Only the project owner can insert / update / delete.
-- ============================================================

-- 5. Projects
CREATE POLICY "Authenticated users read projects" ON projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own projects" ON projects
  FOR UPDATE TO authenticated
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own projects" ON projects
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6. Groups
CREATE POLICY "Authenticated users read groups" ON groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert groups in own projects" ON groups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update groups in own projects" ON groups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = groups.project_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = groups.project_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete groups in own projects" ON groups
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = groups.project_id
        AND p.user_id = auth.uid()
    )
  );

-- 7. Tasks
CREATE POLICY "Authenticated users read tasks" ON tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert tasks in own projects" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN projects p ON p.id = g.project_id
      WHERE g.id = group_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update tasks in own projects" ON tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN projects p ON p.id = g.project_id
      WHERE g.id = tasks.group_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN projects p ON p.id = g.project_id
      WHERE g.id = tasks.group_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete tasks in own projects" ON tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM groups g
      JOIN projects p ON p.id = g.project_id
      WHERE g.id = tasks.group_id
        AND p.user_id = auth.uid()
    )
  );

-- 8. Milestones
CREATE POLICY "Authenticated users read milestones" ON milestones
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert milestones in own projects" ON milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = task_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update milestones in own projects" ON milestones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = milestones.task_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = milestones.task_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete milestones in own projects" ON milestones
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN groups g ON g.id = t.group_id
      JOIN projects p ON p.id = g.project_id
      WHERE t.id = milestones.task_id
        AND p.user_id = auth.uid()
    )
  );

-- ============================================================
-- 9. Profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Index for email-based lookups (e.g. search / invite flows)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Drop all existing profile policies (idempotent)
DROP POLICY IF EXISTS "Users view own profile"               ON profiles;
DROP POLICY IF EXISTS "Authenticated users read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users manage own profile"             ON profiles;
DROP POLICY IF EXISTS "Users insert own profile"             ON profiles;
DROP POLICY IF EXISTS "Users update own profile"             ON profiles;

-- All authenticated users can read profiles (for owner / participant dropdowns)
CREATE POLICY "Authenticated users read all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Users can only write their own profile row
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 10. Auto-update updated_at whenever a profile row changes
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 11. Keep profiles.email in sync with auth.users.email
--     (prevents stale email after user changes their email)
-- ============================================================
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_profile_email();

-- ============================================================
-- 12. Auto-create a profile row on sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
