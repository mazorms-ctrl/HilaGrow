-- =============================================================
-- Auth Infrastructure Migration
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- ── 1. profiles table ────────────────────────────────────────
-- Mirrors auth.users. Auto-populated by the trigger below on signup.

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Reuse the existing updated_at trigger function from schema.sql
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profiles RLS: each user can only read/write their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ── 2. Auto-create profile on signup ─────────────────────────
-- Fires after every new row in auth.users (email signup or OAuth).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Drop and recreate so re-running this script is safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ── 3. Add created_by to tasks ───────────────────────────────
-- Nullable so existing tasks are unaffected.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);


-- ── 4. Update RLS policies ───────────────────────────────────
-- Replace the anonymous allow-all policies with authenticated-only access.
-- All logged-in users share the workspace (collaborative model).

-- Drop old permissive anonymous policies (names from schema.sql)
DROP POLICY IF EXISTS "Allow all operations" ON public.projects;
DROP POLICY IF EXISTS "Allow all operations" ON public.groups;
DROP POLICY IF EXISTS "Allow all operations" ON public.tasks;
DROP POLICY IF EXISTS "Allow all operations" ON public.milestones;
DROP POLICY IF EXISTS "Allow all operations" ON public.people;
DROP POLICY IF EXISTS "Allow all operations" ON public.task_watchers;
DROP POLICY IF EXISTS "Allow all operations" ON public.email_outbox;

-- Public dashboard: anyone (including anonymous) can READ tasks
-- Only authenticated users can INSERT / UPDATE / DELETE

-- projects
CREATE POLICY "Public read access"
  ON public.projects FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users write access"
  ON public.projects FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- groups
CREATE POLICY "Public read access"
  ON public.groups FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users write access"
  ON public.groups FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- tasks
CREATE POLICY "Public read access"
  ON public.tasks FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users write access"
  ON public.tasks FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- milestones
CREATE POLICY "Public read access"
  ON public.milestones FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users write access"
  ON public.milestones FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- people / task_watchers / email_outbox — authenticated only (no public read)
CREATE POLICY "Authenticated users full access"
  ON public.people FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access"
  ON public.task_watchers FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access"
  ON public.email_outbox FOR ALL TO authenticated
  USING (true) WITH CHECK (true);


-- =============================================================
-- After running this script:
-- 1. Enable Google provider in Supabase Dashboard →
--    Authentication → Providers → Google
--    (requires a Google Cloud OAuth client ID + secret)
-- 2. Add your Vercel deployment URL to:
--    Authentication → URL Configuration → Redirect URLs
-- =============================================================
