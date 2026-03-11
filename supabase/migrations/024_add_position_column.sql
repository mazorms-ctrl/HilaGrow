-- =============================================================
-- Migration 024: Add position column to profiles
-- Run in Supabase SQL Editor
-- =============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS position TEXT;

-- =============================================================
-- Verify: SELECT email, department, position FROM public.profiles;
-- =============================================================
