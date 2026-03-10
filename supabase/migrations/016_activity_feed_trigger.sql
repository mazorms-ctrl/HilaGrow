-- ============================================================================
-- Migration 016: Activity Feed Auto-Trigger
--
-- Problem:
--   The activity_feed table is never populated automatically.
--   updateTask() only updates tasks rows; nothing writes feed entries.
--   So the "פעילות אחרונה" section is always empty and never updates.
--
-- Fix:
--   Add an AFTER INSERT OR UPDATE trigger on tasks that:
--     • Detects the most meaningful change (progress > due_date > title > metadata)
--     • Skips system-only changes (is_leaf, progress_mode alone)
--     • Skips if auth.uid() is NULL (background/service calls)
--     • Inserts exactly ONE activity_feed row per meaningful user action
--
--   SECURITY DEFINER so the function can bypass RLS and INSERT on behalf
--   of the authenticated user (auth.uid() is still set in the session).
--
-- Also:
--   Enable Supabase Realtime for the tasks table so the React client
--   receives live task-change events.
-- ============================================================================


-- ── 1. Enable Realtime for tasks (idempotent) ─────────────────────────────────

DO $$
BEGIN
  -- Only add if not already a member of the publication
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
    RAISE NOTICE 'tasks added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'tasks already in supabase_realtime — skipped';
  END IF;
END;
$$;


-- ── 2. Trigger function ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_action  TEXT;
  v_content TEXT;
BEGIN

  -- ── Only log actions from an authenticated session ──────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;


  -- ════════════════════════════════════════════════════════════════════════════
  -- INSERT: task created
  -- ════════════════════════════════════════════════════════════════════════════
  IF TG_OP = 'INSERT' THEN
    v_action  := 'task_created';
    v_content := NEW.title;

  -- ════════════════════════════════════════════════════════════════════════════
  -- UPDATE: detect the most meaningful change; skip system-only writes
  -- ════════════════════════════════════════════════════════════════════════════
  ELSIF TG_OP = 'UPDATE' THEN

    -- Skip when only internal columns changed (is_leaf, progress_mode, updated_at).
    -- These are written by fn_sync_task_dashboard_data; they are not user actions.
    IF OLD.title         IS NOT DISTINCT FROM NEW.title
       AND OLD.metadata       IS NOT DISTINCT FROM NEW.metadata
       AND OLD.progress_manual IS NOT DISTINCT FROM NEW.progress_manual
       AND OLD.due_date        IS NOT DISTINCT FROM NEW.due_date
       AND OLD.priority        IS NOT DISTINCT FROM NEW.priority
       AND OLD.assigned_to     IS NOT DISTINCT FROM NEW.assigned_to
    THEN
      RETURN NEW;
    END IF;

    -- Priority order: progress → due_date → title → metadata → other
    IF OLD.progress_manual IS DISTINCT FROM NEW.progress_manual
       AND NEW.progress_manual IS NOT NULL
    THEN
      v_action  := 'progress_updated';
      v_content := 'התקדמות עודכנה ל-' || NEW.progress_manual::TEXT || '%';

    ELSIF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      v_action  := 'task_updated';
      v_content := CASE
        WHEN NEW.due_date IS NULL THEN 'תאריך יעד הוסר'
        ELSE 'תאריך יעד עודכן ל-' || TO_CHAR(NEW.due_date AT TIME ZONE 'Asia/Jerusalem', 'DD/MM/YYYY')
      END;

    ELSIF OLD.title IS DISTINCT FROM NEW.title THEN
      v_action  := 'task_updated';
      v_content := 'כותרת שונתה ל: ' || NEW.title;

    ELSIF OLD.priority IS DISTINCT FROM NEW.priority THEN
      v_action  := 'task_updated';
      v_content := 'עדיפות שונתה ל-' || COALESCE(NEW.priority, 'ללא');

    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      v_action  := 'task_updated';
      v_content := 'שינוי אחריות';

    ELSE
      -- metadata changed (characterization, goals, KPIs, etc.)
      v_action  := 'task_updated';
      v_content := 'פרטי המשימה עודכנו';
    END IF;

  END IF;

  -- ── Write the feed entry ────────────────────────────────────────────────────
  INSERT INTO activity_feed (task_id, user_id, action_type, content)
  VALUES (NEW.id, v_user_id, v_action, v_content);

  RETURN NEW;

END;
$$;


-- ── 3. Attach trigger AFTER INSERT OR UPDATE ──────────────────────────────────

DROP TRIGGER IF EXISTS trg_log_task_activity ON tasks;

CREATE TRIGGER trg_log_task_activity
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_task_activity();


-- ── 4. Verify setup ───────────────────────────────────────────────────────────

-- Confirm trigger is attached
SELECT
  tgname        AS trigger_name,
  tgenabled     AS enabled,
  tgtype        AS trigger_type
FROM pg_trigger
WHERE tgrelid = 'tasks'::REGCLASS
  AND tgname = 'trg_log_task_activity';

-- Confirm Realtime publication
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
