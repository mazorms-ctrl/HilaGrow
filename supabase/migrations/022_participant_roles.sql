-- =============================================================
-- Migration 022: Participant Roles & Department Column
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- ── 1. Expand role CHECK constraint to include 'assignee' and 'participant' ──
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'assignee', 'participant', 'user'));
-- 'user' is kept temporarily so existing rows stay valid during migration.

-- ── 2. Migrate existing 'user' roles → 'participant' ─────────────────────────
UPDATE public.profiles
  SET role = 'participant'
  WHERE role = 'user';

-- ── 3. Set default for new signups to 'participant' ───────────────────────────
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'participant';

-- ── 4. Update on_auth_user_created trigger to default 'participant' ──────────
-- Find the trigger function and update the hardcoded default if present.
-- The trigger inserts with DEFAULT which now resolves to 'participant' above,
-- so no trigger body change is needed as long as it doesn't hardcode 'user'.

-- ── 5. Add department column ──────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT;

-- ── 6. is_assignee_or_admin() helper (for future RLS use) ────────────────────
CREATE OR REPLACE FUNCTION public.is_assignee_or_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'assignee')
  );
$$;

-- ── 7. Ensure mazorms@gmail.com remains admin ────────────────────────────────
UPDATE public.profiles
  SET role = 'admin'
  WHERE email = 'mazorms@gmail.com';

-- =============================================================
-- Verify:
--   SELECT id, email, role, department FROM public.profiles ORDER BY role;
-- =============================================================
