-- ============================================================================
-- Migration 010: idea_leaf_tasks view
--
-- Mirrors active_leaf_tasks but for the OPPOSITE bucket:
-- leaf tasks that have 0% progress, no due_date, and no activity_feed entry.
-- These are pure ideas / backlog items shown at the bottom of the dashboard.
-- ============================================================================

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
  -- Computed progress (always 0 for ideas, but kept for type consistency)
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
  AND status_pct.value = 0
  AND t.due_date IS NULL
  AND NOT EXISTS (SELECT 1 FROM activity_feed af WHERE af.task_id = t.id)
ORDER BY t.created_at DESC;

GRANT SELECT ON idea_leaf_tasks TO authenticated;

COMMENT ON VIEW idea_leaf_tasks IS
  'Leaf tasks with 0% progress, no due_date, and no activity — pure ideas/backlog. '
  'The complement of active_leaf_tasks.';
