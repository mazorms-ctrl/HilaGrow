-- ============================================================================
-- Migration 013: Metadata Investigation + Smart Backfill
--
-- Step 1: Inspect the raw metadata of 'שולחנות עגולים' to find the exact key.
-- Step 2: Smart backfill that tries ALL known date key names.
-- Step 3: Verification.
-- ============================================================================


-- ── A. Raw metadata dump — run this first to find the correct key ─────────────

SELECT
  id,
  title,
  due_date                         AS due_date_column,
  metadata                         AS full_metadata,
  -- Try every plausible key name
  metadata->>'dueDate'             AS key_dueDate,
  metadata->>'due_date'            AS key_due_date,
  metadata->>'deadline'            AS key_deadline,
  metadata->>'targetDate'          AS key_targetDate,
  metadata->>'target_date'         AS key_target_date,
  metadata->>'endDate'             AS key_endDate,
  metadata->>'end_date'            AS key_end_date,
  metadata->>'date'                AS key_date,
  metadata->>'expiryDate'          AS key_expiryDate,
  metadata->'timeline'->>'dueDate' AS key_timeline_dueDate
FROM tasks
WHERE title = 'שולחנות עגולים';


-- ── B. Smart backfill — copies the first non-empty date value found ───────────
-- Tries all plausible key names in priority order.
-- Safe to re-run: WHERE due_date IS NULL ensures already-populated rows
-- are never overwritten.

UPDATE tasks
SET due_date = COALESCE(
  NULLIF(metadata->>'dueDate',    ''),
  NULLIF(metadata->>'due_date',   ''),
  NULLIF(metadata->>'deadline',   ''),
  NULLIF(metadata->>'targetDate', ''),
  NULLIF(metadata->>'endDate',    ''),
  NULLIF(metadata->>'end_date',   '')
)::TIMESTAMPTZ
WHERE due_date IS NULL
  AND COALESCE(
    NULLIF(metadata->>'dueDate',    ''),
    NULLIF(metadata->>'due_date',   ''),
    NULLIF(metadata->>'deadline',   ''),
    NULLIF(metadata->>'targetDate', ''),
    NULLIF(metadata->>'endDate',    ''),
    NULLIF(metadata->>'end_date',   '')
  ) IS NOT NULL;


-- ── C. Verify the two tasks are now both populated ────────────────────────────

SELECT
  title,
  due_date,
  due_date < NOW() AS is_overdue,
  progress_mode,
  progress_manual
FROM tasks
WHERE title IN ('שולחנות עגולים', 'הקמת חדר כושר')
ORDER BY title;


-- ── D. New overdue KPI count ──────────────────────────────────────────────────

SELECT overdue_tasks FROM dashboard_kpis;
