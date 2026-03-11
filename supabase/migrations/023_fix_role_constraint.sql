-- =============================================================
-- Migration 023: Fix role constraint — allow assignee/participant/admin
-- Run in Supabase SQL Editor
-- =============================================================

-- Drop the old constraint (021 only allowed 'admin' | 'user')
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add the updated constraint with all valid values
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'assignee', 'participant', 'user'));

-- Migrate any remaining 'user' rows to 'participant'
UPDATE public.profiles
  SET role = 'participant'
  WHERE role = 'user';

-- Set default for new signups
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'participant';

-- Protect the super-admin
UPDATE public.profiles
  SET role = 'admin'
  WHERE email = 'mazorms@gmail.com';

-- =============================================================
-- Verify: SELECT email, role FROM public.profiles ORDER BY role;
-- =============================================================
