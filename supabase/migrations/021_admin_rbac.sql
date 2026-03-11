-- =============================================================
-- Migration 021: Admin RBAC
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- ── 1. Add role column to profiles ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('admin', 'user'));

-- ── 2. Grant admin to the designated super-user ──────────────
UPDATE public.profiles
  SET role = 'admin'
  WHERE email = 'mazorms@gmail.com';

-- ── 3. is_admin() helper — server-side check, used in RLS ────
-- SECURITY DEFINER so it always runs as postgres (bypasses RLS
-- when called from within a policy, preventing infinite recursion).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ── 4. RLS: only admins can change roles ─────────────────────
-- Users can update their own profile EXCEPT the role column.
-- Admins can update any profile including role.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (non-role fields)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Either the role isn't changing...
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      -- ...or the requester is an admin
      OR public.is_admin()
    )
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ── 5. Admin-only: read full user list including emails ───────
-- Regular users can already SELECT profiles (existing policy).
-- No extra policy needed — emails are already in the profiles table.
-- The admin dashboard will simply show all rows; the UI gates access.

-- =============================================================
-- Verify:
--   SELECT id, email, role FROM public.profiles ORDER BY role;
-- =============================================================
