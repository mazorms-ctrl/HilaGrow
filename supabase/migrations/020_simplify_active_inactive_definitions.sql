-- ============================================================================
-- Migration 020: Simplify Active / Inactive Task Definitions
--
-- Old rule (009/010): a task was "active" if it had progress > 0 OR a due_date
--   OR an activity_feed entry. This meant a brand-new task appeared as "active"
--   the moment it was created (because task_created was logged).
--
-- New rule:
--   ACTIVE   = due_date IS NOT NULL  OR  status_percent > 0
--   INACTIVE = due_date IS NULL      AND status_percent = 0  (or NULL)
--
-- The activity_feed check is removed from both views and the KPI query.
-- ============================================================================


-- ── 1. active_leaf_tasks ─────────────────────────────────────────────────────

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
  status_pct.value                          AS status_percent,
  g.name                                    AS group_name,
  g.color                                   AS group_color,
  g.project_id,
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
  -- Active = has a due_date OR has progress. No activity-feed check.
  AND (
    t.due_date        IS NOT NULL
    OR status_pct.value > 0
  )
ORDER BY t.due_date ASC NULLS LAST;

GRANT SELECT ON active_leaf_tasks TO authenticated;

COMMENT ON VIEW active_leaf_tasks IS
  'Leaf tasks in the Working Stage: not complete, and has a due_date or progress > 0. '
  'Tasks with no due_date and 0% progress are excluded (they appear in idea_leaf_tasks). '
  'Ordered by due_date for SLA triage.';


-- ── 2. idea_leaf_tasks ───────────────────────────────────────────────────────

DROP VIEW IF EXISTS idea_leaf_tasks CASCADE;

CREATE OR REPLACE VIEW idea_leaf_tasks
  WITH (security_invoker = on)
AS
SELECT
  t.id,
  t.group_id,
  t.parent_id,
  t.title,
  t.owner_name,
  t.assigned_to,
  t.priority,
  t.due_date,
  t.progress_mode,
  t.progress_manual,
  t.created_at,
  t.updated_at,
  status_pct.value                          AS status_percent,
  g.name                                    AS group_name,
  g.color                                   AS group_color,
  g.project_id,
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
  -- Inactive = no due_date AND 0% progress. Activity feed is irrelevant.
  AND t.due_date IS NULL
  AND status_pct.value = 0
ORDER BY t.created_at DESC;

GRANT SELECT ON idea_leaf_tasks TO authenticated;

COMMENT ON VIEW idea_leaf_tasks IS
  'Leaf tasks with no due_date and 0% progress — inactive / backlog ideas. '
  'The complement of active_leaf_tasks. Activity-feed entries are ignored.';


-- ── 3. dashboard_kpis ────────────────────────────────────────────────────────

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
  -- Active = not done AND (has due_date OR has progress)
  COUNT(*) FILTER (
    WHERE status_percent < 100
      AND (due_date IS NOT NULL OR status_percent > 0)
  )                                                                    AS active_tasks,

  -- Overdue = past deadline and not done
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
  'active_tasks = leaf tasks with a due_date or progress > 0 (not complete). '
  'Ideas (0%, no due_date) are excluded. '
  'overdue_tasks = open tasks past their due_date.';


-- ── Diagnostic ───────────────────────────────────────────────────────────────

SELECT active_tasks, overdue_tasks, days_remaining FROM dashboard_kpis;

SELECT
  CASE
    WHEN due_date IS NOT NULL THEN 'Active (has due_date)'
    WHEN progress_manual > 0  THEN 'Active (has progress)'
    ELSE                           'Inactive (idea/backlog)'
  END  AS classification,
  COUNT(*) AS task_count
FROM tasks
WHERE is_leaf = TRUE
GROUP BY 1
ORDER BY 1;
