-- ============================================================================
-- Migration 006: Data Sync Fix
--
-- Fixes two root causes of the dashboard showing all zeros:
--
--  1. is_leaf flags: Migration 004 added is_leaf DEFAULT TRUE to existing rows.
--     Tasks that have children need is_leaf = FALSE so they are excluded from
--     the leaf-task aggregates; their children carry the actual progress.
--
--  2. progress_mode for legacy tasks: Tasks inserted before Migration 004
--     may have progress_manual populated but progress_mode still defaulting
--     to 'auto'. The LATERAL expression returns 0 for auto+no-milestones,
--     hiding real progress values. Set mode = 'manual' when manual value exists.
--
--  3. dashboard_kpis view bug: active_tasks used BETWEEN 1 AND 99, excluding
--     tasks at 0% progress. Recreated with status_percent < 100 so all
--     in-progress (and not-started) leaf tasks are counted as active.
-- ============================================================================


-- ── Step 1: Fix is_leaf flags ─────────────────────────────────────────────────
-- Any task that appears as a parent_id belongs to another task → it is a branch,
-- not a leaf. Mark those as is_leaf = FALSE; mark all others TRUE.

UPDATE tasks
SET    is_leaf = FALSE
WHERE  id IN (
  SELECT DISTINCT parent_id
  FROM   tasks
  WHERE  parent_id IS NOT NULL
);

UPDATE tasks
SET    is_leaf = TRUE
WHERE  id NOT IN (
  SELECT DISTINCT parent_id
  FROM   tasks
  WHERE  parent_id IS NOT NULL
);


-- ── Step 2: Fix progress_mode for legacy tasks ────────────────────────────────
-- Tasks that have an explicit manual progress value should use mode='manual'
-- so the LATERAL computation picks up progress_manual instead of returning 0.

UPDATE tasks
SET    progress_mode = 'manual'
WHERE  progress_manual IS NOT NULL
  AND  progress_manual > 0
  AND  progress_mode   = 'auto';


-- ── Step 3: Recreate dashboard_kpis with corrected active_tasks filter ────────
-- Old: COUNT(*) FILTER (WHERE status_percent BETWEEN 1 AND 99)
--      → tasks at 0% were silently excluded; all legacy tasks show 0
-- New: COUNT(*) FILTER (WHERE status_percent < 100)
--      → all leaf tasks that are not complete are counted as active

DROP VIEW IF EXISTS dashboard_kpis CASCADE;

CREATE OR REPLACE VIEW dashboard_kpis
  WITH (security_invoker = on)
AS
WITH leaf_progress AS (
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
  WHERE t.is_leaf = TRUE
)
SELECT
  -- All leaf tasks that are not yet complete (0% = not started counts as active)
  COUNT(*)  FILTER (WHERE status_percent < 100)                       AS active_tasks,

  -- Tasks that missed their deadline and are still open
  COUNT(*)  FILTER (WHERE due_date < NOW() AND status_percent < 100)  AS overdue_tasks,

  -- Days until the furthest-out deadline among open tasks
  EXTRACT(DAY FROM (
    MAX(due_date) FILTER (WHERE status_percent < 100) - NOW()
  ))::INTEGER                                                          AS days_remaining

FROM leaf_progress;

GRANT SELECT ON dashboard_kpis TO authenticated;

COMMENT ON VIEW dashboard_kpis IS
  'Single-row workspace KPI summary: active_tasks (not-done leaf tasks), '
  'overdue_tasks, days_remaining until latest open due_date.';


-- ── Diagnostics ───────────────────────────────────────────────────────────────
-- Run these selects after applying the migration to verify data is flowing.

-- Task breakdown by is_leaf and progress_mode
SELECT
  is_leaf,
  progress_mode,
  COUNT(*)                                    AS task_count,
  COUNT(*) FILTER (WHERE progress_manual > 0) AS has_manual_value,
  ROUND(AVG(COALESCE(progress_manual, 0)))    AS avg_manual_progress
FROM tasks
GROUP BY is_leaf, progress_mode
ORDER BY is_leaf DESC, progress_mode;

-- How many tasks feed into active_leaf_tasks
SELECT count(*) AS active_leaf_task_count FROM active_leaf_tasks;

-- KPI snapshot
SELECT * FROM dashboard_kpis;

-- Group-level stats
SELECT
  group_name,
  leaf_task_count,
  completed_count,
  overdue_count,
  avg_progress,
  current_work
FROM group_progress_stats
ORDER BY group_name;
