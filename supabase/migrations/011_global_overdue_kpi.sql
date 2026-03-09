-- ============================================================================
-- Migration 011: Global Overdue KPI — Source of Truth for Project Health
--
-- Problem:
--   dashboard_kpis.overdue_tasks used a `leaf_progress` CTE filtered by
--   is_leaf = TRUE.  Parent / branch tasks with an expired due_date were
--   completely invisible, so the overdue count was systematically under-
--   reported.  Tasks like 'שולחנות עגולים' that appear expired in the
--   sidebar were not counted in the KPI.
--
-- Fix:
--   Split the CTE into two scopes:
--     • leaf_progress   — leaf tasks only (drives active_tasks)
--     • all_progress    — every task regardless of is_leaf (drives overdue_tasks)
--
--   Overdue definition: due_date < NOW() AND status_percent < 100
--   No is_leaf restriction.  No assigned_to restriction.  Global scope.
--
--   active_tasks keeps the leaf-only + active-criteria definition
--   (has progress, or has deadline, or has activity).
--
--   days_remaining reads from ALL tasks with open deadlines (not just leaves)
--   so the countdown reflects the next real SLA in the project.
--
-- Also:
--   Full due_date backfill from metadata->>'dueDate' for every task where
--   the column is still NULL — fixes data-integrity gaps for non-leaf tasks
--   that were created before migration 008's trigger was in place.
-- ============================================================================


-- ── 1. Recreate dashboard_kpis with global overdue scope ─────────────────────

DROP VIEW IF EXISTS dashboard_kpis CASCADE;

CREATE OR REPLACE VIEW dashboard_kpis
  WITH (security_invoker = on)
AS
WITH
-- ── All tasks (any level): used for overdue_tasks + days_remaining ────────────
all_progress AS (
  SELECT
    t.id,
    t.due_date,
    CASE
      WHEN t.progress_mode = 'manual'
        THEN COALESCE(t.progress_manual, 0)
      ELSE COALESCE(
        (SELECT (COUNT(*) FILTER (WHERE m.done) * 100
                 / NULLIF(COUNT(*), 0))::INTEGER
         FROM milestones m
         WHERE m.task_id = t.id),
        0
      )
    END AS status_percent
  FROM tasks t
),
-- ── Leaf tasks only: used for active_tasks ────────────────────────────────────
leaf_progress AS (
  SELECT
    ap.id,
    ap.due_date,
    ap.status_percent,
    EXISTS (
      SELECT 1 FROM activity_feed af WHERE af.task_id = ap.id
    ) AS has_activity
  FROM all_progress ap
  JOIN tasks t ON t.id = ap.id
  WHERE t.is_leaf = TRUE
)
SELECT
  -- ── Active tasks: leaf tasks in the Working Stage ─────────────────────────
  -- (has started, or has a deadline, or someone logged activity on it)
  (
    SELECT COUNT(*)
    FROM leaf_progress lp
    WHERE lp.status_percent < 100
      AND (lp.status_percent > 0 OR lp.due_date IS NOT NULL OR lp.has_activity)
  )                                                                    AS active_tasks,

  -- ── Overdue tasks: ANY task (parent or leaf) past deadline, not done ──────
  -- Global scope — no is_leaf filter.
  (
    SELECT COUNT(*)
    FROM all_progress ap
    WHERE ap.due_date < NOW()
      AND ap.status_percent < 100
  )                                                                    AS overdue_tasks,

  -- ── Days remaining: nearest open deadline across ALL tasks ────────────────
  (
    SELECT EXTRACT(DAY FROM (
      MIN(ap.due_date) FILTER (WHERE ap.status_percent < 100) - NOW()
    ))::INTEGER
    FROM all_progress ap
    WHERE ap.due_date IS NOT NULL
  )                                                                    AS days_remaining;

GRANT SELECT ON dashboard_kpis TO authenticated;

COMMENT ON VIEW dashboard_kpis IS
  'Workspace KPI summary. '
  'active_tasks  = leaf tasks in Working Stage (progress>0, or deadline, or activity). '
  'overdue_tasks = ALL tasks (any level) with due_date < NOW() and not done — global scope. '
  'days_remaining = days to the nearest open deadline across all tasks (can be negative).';


-- ── 2. Full due_date backfill ─────────────────────────────────────────────────
-- Syncs due_date from metadata->>'dueDate' for EVERY task where the column is
-- NULL, including parent/branch tasks that the earlier migrations may have
-- missed because they targeted only leaf tasks.

UPDATE tasks
SET    due_date = (metadata->>'dueDate')::TIMESTAMPTZ
WHERE  due_date IS NULL
  AND  (metadata->>'dueDate') IS NOT NULL
  AND  (metadata->>'dueDate') <> '';


-- ── 3. Verify ─────────────────────────────────────────────────────────────────

-- KPI snapshot — overdue should now match what the sidebar shows
SELECT * FROM dashboard_kpis;

-- All tasks with an overdue due_date (for manual cross-check)
SELECT
  t.id,
  t.title,
  t.is_leaf,
  t.due_date,
  due_date < NOW()                              AS is_overdue,
  CASE
    WHEN t.progress_mode = 'manual' THEN COALESCE(t.progress_manual, 0)
    ELSE COALESCE(
      (SELECT (COUNT(*) FILTER (WHERE m.done) * 100 / NULLIF(COUNT(*), 0))::INTEGER
       FROM milestones m WHERE m.task_id = t.id), 0
    )
  END                                           AS status_percent
FROM tasks t
WHERE t.due_date < NOW()
ORDER BY t.due_date ASC;
