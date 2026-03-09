-- ============================================================================
-- Migration 007: Back-fill tasks.due_date from metadata JSONB
--
-- Problem:
--   The sidebar computes "פג תוקף" from tasks.metadata->>'dueDate' (a date
--   string stored in the task's JSONB metadata field, e.g. '2026-02-15').
--   The dashboard_kpis view computes overdue_tasks from tasks.due_date
--   (a TIMESTAMPTZ column added in migration 004, defaulting to NULL).
--
--   Tasks created before migration 004 have due_date = NULL, so the KPI
--   view reports 0 overdue even when the sidebar shows "פג תוקף".
--
-- Fix:
--   For every task where due_date is still NULL but metadata contains a
--   valid dueDate string, cast that string to TIMESTAMPTZ and write it
--   into the due_date column.
--
-- Notes:
--   • The metadata dueDate is a date-only string ('YYYY-MM-DD').
--     Casting to TIMESTAMPTZ yields UTC midnight, matching how the sidebar
--     does new Date('YYYY-MM-DD') — both treat it as midnight UTC.
--   • Tasks where metadata->>'dueDate' is already '' or missing are skipped.
--   • Safe to re-run: WHERE clause ensures only NULL rows are touched.
-- ============================================================================

UPDATE tasks
SET    due_date = (metadata->>'dueDate')::TIMESTAMPTZ
WHERE  due_date IS NULL
  AND  metadata->>'dueDate' IS NOT NULL
  AND  metadata->>'dueDate' <> '';

-- ── Verify: show tasks where metadata dueDate and due_date now agree ──────────
SELECT
  id,
  title,
  metadata->>'dueDate'             AS metadata_due_date,
  due_date,
  due_date < NOW()                 AS is_overdue
FROM tasks
WHERE metadata->>'dueDate' IS NOT NULL
  AND metadata->>'dueDate' <> ''
ORDER BY due_date NULLS LAST;
