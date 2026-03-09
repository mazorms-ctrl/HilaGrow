-- ============================================================================
-- Migration 005: Dashboard Statistical Views
--
-- Creates three read-only views for the Command Center dashboard.
--
-- Progress model:
--   tasks.progress_mode = 'manual' → use tasks.progress_manual (0-100)
--   tasks.progress_mode = 'auto'   → derive from milestones:
--                                    (done_count / total_count) * 100
--
-- Security model:
--   All views use security_invoker = on so they run under the calling user's
--   identity and RLS context — authenticated users see all workspace data per
--   the collaborative policies already defined in 002/003.
--   SELECT is explicitly granted to the authenticated role.
--   The anon role receives no grants, keeping the views private.
-- ============================================================================


-- ── Shared inline helper ─────────────────────────────────────────────────────
-- The expression below computes effective progress % for a leaf task.
-- It is inlined in each view rather than extracted to a function so that
-- the query planner can push predicates through it cleanly.
--
--   CASE
--     WHEN t.progress_mode = 'manual' THEN COALESCE(t.progress_manual, 0)
--     ELSE COALESCE(
--       (SELECT (COUNT(*) FILTER (WHERE m.done) * 100
--                / NULLIF(COUNT(*), 0))::INTEGER
--        FROM milestones m WHERE m.task_id = t.id),
--       0                              ← no milestones yet = 0 %
--     )
--   END


-- ── 1. active_leaf_tasks ─────────────────────────────────────────────────────
-- Filtered view of leaf tasks that are not yet complete (status < 100).
-- Ordered by due_date ASC NULLS LAST for SLA priority.
-- Includes group and project context so the UI can render without extra joins.

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
ORDER BY t.due_date ASC NULLS LAST;

GRANT SELECT ON active_leaf_tasks TO authenticated;

COMMENT ON VIEW active_leaf_tasks IS
  'Leaf tasks in progress (status 0–99), ordered by due_date for SLA triage. '
  'Includes computed status_percent, group name/color, and project name.';


-- ── 2. dashboard_kpis ────────────────────────────────────────────────────────
-- Single-row aggregate view of workspace-wide KPIs.
--
--   active_tasks   – leaf tasks with status < 100 (not yet complete)
--   overdue_tasks  – leaf tasks past due_date that are not yet complete
--   days_remaining – calendar days from now to the latest due_date among
--                    all non-completed leaf tasks (negative = already overdue)

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
  COUNT(*)  FILTER (WHERE status_percent < 100)                    AS active_tasks,

  -- Tasks that missed their deadline and are still open
  COUNT(*)  FILTER (WHERE due_date < NOW() AND status_percent < 100) AS overdue_tasks,

  -- Days until the furthest-out deadline among open tasks
  -- (returns NULL when no due dates are set; negative when all are overdue)
  EXTRACT(DAY FROM (
    MAX(due_date) FILTER (WHERE status_percent < 100) - NOW()
  ))::INTEGER                                                        AS days_remaining
FROM leaf_progress;

GRANT SELECT ON dashboard_kpis TO authenticated;

COMMENT ON VIEW dashboard_kpis IS
  'Single-row workspace KPI summary: active_tasks (not-done leaf tasks), '
  'overdue_tasks, days_remaining until latest open due_date.';


-- ── 3. group_progress_stats ──────────────────────────────────────────────────
-- Per-group aggregates for the dashboard group cards.
--
--   avg_progress      – mean status_percent across all leaf tasks in the group
--   leaf_task_count   – total number of leaf tasks in the group
--   completed_count   – leaf tasks at 100 %
--   overdue_count     – open leaf tasks past their due_date
--   current_work      – title of the most recently updated leaf task
--                       (acts as "what is this group working on right now")

DROP VIEW IF EXISTS group_progress_stats CASCADE;

CREATE OR REPLACE VIEW group_progress_stats
  WITH (security_invoker = on)
AS
WITH leaf_progress AS (
  SELECT
    t.id,
    t.group_id,
    t.title,
    t.due_date,
    t.updated_at,
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
  g.id                                                               AS group_id,
  g.project_id,
  g.name                                                             AS group_name,
  g.color                                                            AS group_color,
  g.order                                                            AS group_order,
  p.name                                                             AS project_name,

  -- Progress aggregates
  COUNT(lp.id)                                                       AS leaf_task_count,
  COUNT(lp.id) FILTER (WHERE lp.status_percent = 100)               AS completed_count,
  COUNT(lp.id) FILTER (WHERE lp.due_date < NOW()
                         AND lp.status_percent < 100)               AS overdue_count,
  ROUND(COALESCE(AVG(lp.status_percent), 0))::INTEGER               AS avg_progress,

  -- "Current work": most recently touched open leaf task in this group
  (
    SELECT lp2.title
    FROM   leaf_progress lp2
    WHERE  lp2.group_id      = g.id
      AND  lp2.status_percent < 100
    ORDER  BY lp2.updated_at DESC
    LIMIT  1
  )                                                                  AS current_work

FROM groups   g
JOIN projects p ON p.id = g.project_id
LEFT JOIN leaf_progress lp ON lp.group_id = g.id
GROUP BY g.id, g.project_id, g.name, g.color, g.order, p.name
ORDER BY g.project_id, g.order;

GRANT SELECT ON group_progress_stats TO authenticated;

COMMENT ON VIEW group_progress_stats IS
  'Per-group dashboard card stats: avg_progress, task counts, overdue count, '
  'and the title of the most recently updated open leaf task (current_work).';


-- ============================================================================
-- Summary
-- ============================================================================
-- active_leaf_tasks     – leaf tasks with status < 100, SLA-sorted, with
--                         computed status_percent, group and project context
-- dashboard_kpis        – single-row: active_tasks, overdue_tasks,
--                         days_remaining
-- group_progress_stats  – per-group: avg_progress, leaf_task_count,
--                         completed_count, overdue_count, current_work
--
-- All views:
--   security_invoker = on  → caller's RLS context is respected
--   GRANT SELECT TO authenticated → anon role has no access
-- ============================================================================
