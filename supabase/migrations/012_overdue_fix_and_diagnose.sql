-- ============================================================================
-- Migration 012: Overdue KPI — simplest possible fix + full diagnosis
--
-- Run this in Supabase SQL Editor.
-- The SELECT blocks at the bottom print the investigation results.
-- ============================================================================


-- ── Step 1: Backfill due_date for EVERY task that still has NULL ──────────────
-- (covers any task created before the trigger was deployed)

UPDATE tasks
SET    due_date = (metadata->>'dueDate')::TIMESTAMPTZ
WHERE  due_date IS NULL
  AND  (metadata->>'dueDate') IS NOT NULL
  AND  (metadata->>'dueDate') <> '';


-- ── Step 2: Recreate dashboard_kpis with the simplest possible overdue logic ──
--
--   overdue_tasks = every task in the system where:
--     • due_date < NOW()           (deadline has passed)
--     • computed status < 100 %    (not yet done)
--
--   No is_leaf filter. No assigned_to filter. No activity filter.
--   Global scope — if it has a past date and isn't finished, it's overdue.

DROP VIEW IF EXISTS dashboard_kpis CASCADE;

CREATE OR REPLACE VIEW dashboard_kpis
  WITH (security_invoker = on)
AS
SELECT

  -- ── Active tasks: leaf tasks in the Working Stage ─────────────────────────
  (
    SELECT COUNT(*)
    FROM tasks t
    WHERE t.is_leaf = TRUE
      AND CASE
            WHEN t.progress_mode = 'manual'
              THEN COALESCE(t.progress_manual, 0)
            ELSE COALESCE(
              (SELECT (COUNT(*) FILTER (WHERE m.done) * 100
                       / NULLIF(COUNT(*), 0))::INTEGER
               FROM milestones m WHERE m.task_id = t.id),
              0
            )
          END < 100
      AND (
        -- has started
        CASE WHEN t.progress_mode = 'manual' THEN COALESCE(t.progress_manual, 0)
             ELSE COALESCE(
               (SELECT (COUNT(*) FILTER (WHERE m.done) * 100
                        / NULLIF(COUNT(*), 0))::INTEGER
                FROM milestones m WHERE m.task_id = t.id), 0)
        END > 0
        -- or has a deadline (includes overdue tasks)
        OR t.due_date IS NOT NULL
        -- or someone logged activity
        OR EXISTS (SELECT 1 FROM activity_feed af WHERE af.task_id = t.id)
      )
  )                                                                    AS active_tasks,

  -- ── Overdue tasks: simplest possible global count ─────────────────────────
  (
    SELECT COUNT(*)
    FROM tasks t
    WHERE t.due_date < NOW()
      AND CASE
            WHEN t.progress_mode = 'manual'
              THEN COALESCE(t.progress_manual, 0)
            ELSE COALESCE(
              (SELECT (COUNT(*) FILTER (WHERE m.done) * 100
                       / NULLIF(COUNT(*), 0))::INTEGER
               FROM milestones m WHERE m.task_id = t.id),
              0
            )
          END < 100
  )                                                                    AS overdue_tasks,

  -- ── Days remaining: nearest open deadline across ALL tasks ────────────────
  (
    SELECT EXTRACT(DAY FROM (MIN(t.due_date) - NOW()))::INTEGER
    FROM tasks t
    WHERE t.due_date > NOW()
      AND CASE
            WHEN t.progress_mode = 'manual'
              THEN COALESCE(t.progress_manual, 0)
            ELSE COALESCE(
              (SELECT (COUNT(*) FILTER (WHERE m.done) * 100
                       / NULLIF(COUNT(*), 0))::INTEGER
               FROM milestones m WHERE m.task_id = t.id),
              0
            )
          END < 100
  )                                                                    AS days_remaining;

GRANT SELECT ON dashboard_kpis TO authenticated;

COMMENT ON VIEW dashboard_kpis IS
  'active_tasks  = incomplete leaf tasks with progress/deadline/activity. '
  'overdue_tasks = ALL tasks (any depth) where due_date < NOW() and not done. '
  'days_remaining = days to nearest upcoming open deadline.';


-- ══════════════════════════════════════════════════════════════════════════════
-- DIAGNOSIS — results printed immediately after the fix is applied
-- ══════════════════════════════════════════════════════════════════════════════

-- A. KPI snapshot with new view
SELECT
  active_tasks,
  overdue_tasks,
  days_remaining
FROM dashboard_kpis;

-- B. Specific tasks the sidebar shows as expired
SELECT
  id,
  title,
  is_leaf,
  progress_mode,
  progress_manual,
  metadata->>'dueDate'   AS metadata_due_date,
  due_date               AS due_date_column,
  due_date < NOW()       AS overdue_flag
FROM tasks
WHERE title IN ('שולחנות עגולים', 'הקמת חדר כושר')
ORDER BY title;

-- C. Full list of every task the new view considers overdue
SELECT
  t.title,
  t.is_leaf,
  t.due_date,
  CASE
    WHEN t.progress_mode = 'manual' THEN COALESCE(t.progress_manual, 0)
    ELSE COALESCE(
      (SELECT (COUNT(*) FILTER (WHERE m.done) * 100 / NULLIF(COUNT(*), 0))::INTEGER
       FROM milestones m WHERE m.task_id = t.id), 0)
  END                    AS status_percent
FROM tasks t
WHERE t.due_date < NOW()
ORDER BY t.due_date;
