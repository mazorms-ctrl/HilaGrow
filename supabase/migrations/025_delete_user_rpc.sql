-- ── Migration 025: Permanent user deletion RPC ───────────────────────────────
--
-- Problem: supabase.from('profiles').delete() is silently blocked by RLS
-- (no DELETE policy exists) and even if it succeeded, it would only remove
-- the profile row — the auth.users record would remain, allowing the user
-- to log back in.
--
-- Fix: A SECURITY DEFINER function that runs as the DB owner, verifies the
-- caller is an admin, then deletes from auth.users. The CASCADE on
-- profiles(id) → auth.users(id) removes the profile row automatically.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins may call this function
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: only admins can delete users';
  END IF;

  -- Prevent admins from accidentally deleting themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Delete the auth user; profiles + cascade-linked rows are removed automatically
  DELETE FROM auth.users WHERE id = target_user_id;

  -- Verify the row was actually found and deleted
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', target_user_id;
  END IF;
END;
$$;

-- Allow authenticated users to call the function (internal check enforces admin-only)
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
