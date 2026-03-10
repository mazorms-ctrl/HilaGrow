-- ============================================================================
-- Migration 009: Refine 'Active Task' Definition — Idea vs Working Stage
--
-- Problem:
--   Tasks at 0% with no due date and no activity entries are ideas / backlog
--   items, not work in progress. The old views treated all leaf tasks with
--   status < 100 as "active", inflating the KPI count.
--
-- New rule — a leaf task is ACTIVE when ANY of the following is true:
--   (a) status_percent > 0          → work has started
--   (b) due_date IS NOT NULL        → a deadline has been committed to
--       (this covers the overdue case: if it's late it can never be an idea)
--   (c) has an activity_feed entry  → someone logged an update on it
--
-- Tasks that satisfy NONE of the above are IDEAS and are excluded from:
--   • the active_leaf_tasks view (ProjectTaskList)
--   • the active_tasks KPI count
--
-- The overdue_tasks KPI is unaffected: due_date < NOW() implies (b) above,
-- so every overdue task is already counted as active.
--
-- group_progress_stats is intentionally unchanged: leaf_task_count shows
-- ALL leaf tasks (ideas + active) as a capacity view. current_work already
-- filters to status_percent < 100 so it naturally prefers active tasks.
-- ============================================================================


-- ── Recreate active_leaf_tasks ───────────────────────────────────────────────

DROP VIEW IF EXISTS active_leaf_tasks CASCADE;

CREATE OR REPLACE VIEW active_leaf_tasks
  WITH (security_invoker = on)
AS
SELECT
  t.id,
  t.group_id,
  t.parent_id,
  t.title,
  t.description,
  t.owner_name,
  t.assigned_to,
  t.created_by,
  t.priority,
  t.due_date,
  t.progress_mode,
  t.progress_manual,
  t.metadata,
  t.created_at,
  t.updated_at,
  -- Computed progress
  status_pct.value                          AS status_percent,
  -- Group context
  g.name                                    AS group_name,
  g.color                                   AS group_color,
  g.project_id,
  -- Project context
  p.name                                    AS project_name
FROM tasks t
CROSS JOIN LATERAL (
  SELECT
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
    END AS value
) AS status_pct
JOIN groups   g ON g.id = t.group_id
JOIN projects p ON p.id = g.project_id
WHERE t.is_leaf = TRUE
  AND status_pct.value < 100
  -- ── Active filter: exclude pure ideas (0 % + no deadline + no activity) ──
  AND (
    status_pct.value  > 0
    OR t.due_date     IS NOT NULL
    OR EXISTS (SELECT 1 FROM activity_feed af WHERE af.task_id = t.id)
  )
ORDER BY t.due_date ASC NULLS LAST;

GRANT SELECT ON active_leaf_tasks TO authenticated;

COMMENT ON VIEW active_leaf_tasks IS
  'Leaf tasks in the Working Stage (not complete, and active: has progress, '
  'deadline, or activity-feed entry). Ordered by due_date for SLA triage. '
  'Pure ideas (0%, no deadline, no activity) are excluded.';


-- ── Recreate dashboard_kpis ──────────────────────────────────────────────────

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
    END AS status_percent,
    -- Pre-compute whether any activity has been logged (avoids correlated
    -- subquery inside the outer aggregate filters).
    EXISTS (
      SELECT 1 FROM activity_feed af WHERE af.task_id = t.id
    ) AS has_activity
  FROM tasks t
  WHERE t.is_leaf = TRUE
)
SELECT
  -- Active = not done AND (has progress OR has deadline OR has activity)
  -- "Overdue but 0%" is always active because due_date IS NOT NULL satisfies (b).
  COUNT(*) FILTER (
    WHERE status_percent < 100
      AND (status_percent > 0 OR due_date IS NOT NULL OR has_activity)
  )                                                                    AS active_tasks,

  -- Overdue = past deadline and not done (always active by definition)
  COUNT(*) FILTER (
    WHERE due_date < NOW() AND status_percent < 100
  )                                                                    AS overdue_tasks,

  -- Days until the furthest open deadline (NULL if no due dates set)
  EXTRACT(DAY FROM (
    MAX(due_date) FILTER (WHERE status_percent < 100) - NOW()
  ))::INTEGER                                                          AS days_remaining

FROM leaf_progress;

GRANT SELECT ON dashboard_kpis TO authenticated;

COMMENT ON VIEW dashboard_kpis IS
  'Single-row workspace KPI summary. '
  'active_tasks = leaf tasks in Working Stage (progress > 0, or has deadline, '
  'or has activity). Ideas (0%, no deadline, no activity) are excluded. '
  'overdue_tasks = open tasks past their due_date (always active).';


-- ── Diagnostic: show the new counts and a sample of what changed ─────────────

-- KPI snapshot with new definition
SELECT
  active_tasks,
  overdue_tasks,
  days_remaining
FROM dashboard_kpis;

-- Breakdown: which tasks are now classified as Ideas vs Active
SELECT
  CASE
    WHEN t.due_date IS NOT NULL                                       THEN 'Active (has deadline)'
    WHEN t.progress_mode = 'manual' AND COALESCE(t.progress_manual,0) > 0 THEN 'Active (has progress)'
    WHEN EXISTS (SELECT 1 FROM activity_feed af WHERE af.task_id = t.id)  THEN 'Active (has activity)'
    ELSE 'Idea (excluded)'
  END                          AS classification,
  COUNT(*)                     AS task_count
FROM tasks t
WHERE t.is_leaf = TRUE
GROUP BY 1
ORDER BY 1;
