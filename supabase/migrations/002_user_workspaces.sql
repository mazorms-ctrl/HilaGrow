-- Migration: Add user ownership to projects and enforce per-user data isolation
-- Run this in your Supabase SQL editor

-- 1. Add user_id column to projects (nullable first so existing rows don't break)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create an index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- 3. Drop the old open-access policies
DROP POLICY IF EXISTS "Allow all on projects"   ON projects;
DROP POLICY IF EXISTS "Allow all on groups"     ON groups;
DROP POLICY IF EXISTS "Allow all on tasks"      ON tasks;
DROP POLICY IF EXISTS "Allow all on milestones" ON milestones;

-- 4. Projects: users can only see and manage their own projects
CREATE POLICY "Users manage own projects" ON projects
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Groups: accessible only if the parent project belongs to the current user
CREATE POLICY "Users manage groups in own projects" ON groups
  FOR ALL
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

-- 6. Tasks: accessible only through owned groups → projects
CREATE POLICY "Users manage tasks in own projects" ON tasks
  FOR ALL
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

-- 7. Milestones: accessible through owned tasks → groups → projects
CREATE POLICY "Users manage milestones in own projects" ON milestones
  FOR ALL
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

-- 8. Optional: create a profiles table if it doesn't exist yet
--    (AuthContext reads from this table for full_name / avatar_url)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON profiles;
CREATE POLICY "Users view own profile" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create a profile row on sign-up
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
