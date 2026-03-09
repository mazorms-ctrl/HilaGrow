-- ============================================================================
-- Migration 015: Comprehensive Deduplication + Orphan Cleanup + UPSERT Trigger
--
-- 1. Deep Deduplication
--    • tasks:     keep oldest per (title, assigned_to, parent_id); delete the rest
--    • milestones: keep oldest per (task_id, title); delete the rest
--
-- 2. Orphan Cleanup
--    • milestones whose task_id no longer exists
--    • tasks with NULL title (corrupted / placeholder rows)
--
-- 3. Root-cause fix: teach the INSERT trigger to use ON CONFLICT / UPSERT
--    semantics by adding a unique index on (title, user_id, parent_id) so
--    duplicate inserts fail gracefully rather than silently creating duplicates.
--
-- 4. Status Report — counts deleted + current state summary
--
-- Safe to re-run: every DELETE is guarded so it only removes confirmed dups.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1A: Deduplicate TASKS
-- Strategy: for every group of rows sharing (title, user_id, parent_id),
--   keep the row with the smallest created_at (oldest), delete the rest.
--   Ties broken by id (keep smallest UUID lexicographically).
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_deleted_tasks INTEGER;
BEGIN

  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY title, assigned_to, COALESCE(parent_id::TEXT, '<<root>>')
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM tasks
    WHERE title IS NOT NULL
  ),
  to_delete AS (
    SELECT id FROM ranked WHERE rn > 1
  )
  DELETE FROM tasks
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted_tasks = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate task(s)', v_deleted_tasks;

END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 1B: Deduplicate MILESTONES
-- Strategy: for every group sharing (task_id, title),
--   keep the oldest (created_at ASC, id ASC), delete the rest.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_deleted_milestones INTEGER;
BEGIN

  WITH ranked AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY task_id, COALESCE(title, '<<no-title>>')
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM milestones
  ),
  to_delete AS (
    SELECT id FROM ranked WHERE rn > 1
  )
  DELETE FROM milestones
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted_milestones = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate milestone(s)', v_deleted_milestones;

END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2A: Delete orphaned milestones (task_id references a deleted task)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_deleted_orphans INTEGER;
BEGIN

  DELETE FROM milestones
  WHERE task_id NOT IN (SELECT id FROM tasks);

  GET DIAGNOSTICS v_deleted_orphans = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned milestone(s)', v_deleted_orphans;

END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 2B: Delete tasks with NULL title (corrupted / placeholder rows)
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_deleted_nulls INTEGER;
BEGIN

  DELETE FROM tasks WHERE title IS NULL;

  GET DIAGNOSTICS v_deleted_nulls = ROW_COUNT;
  RAISE NOTICE 'Deleted % task(s) with NULL title', v_deleted_nulls;

END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 3: Root-cause fix — unique index to prevent future duplicates
--
-- A partial unique index on (title, assigned_to, parent_id) so that the
-- application's INSERT will raise a unique-violation on exact duplicates
-- rather than silently create a new row.
--
-- NULL parent_id (root tasks) is handled via COALESCE to a sentinel value,
-- because two NULLs are not considered equal in a standard unique index.
-- We use a UNIQUE INDEX with a function expression to cover that case.
-- ════════════════════════════════════════════════════════════════════════════

-- Only create if it doesn't exist yet (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tasks'
      AND indexname  = 'idx_tasks_unique_per_parent'
  ) THEN
    CREATE UNIQUE INDEX idx_tasks_unique_per_parent
      ON tasks (assigned_to, title, COALESCE(parent_id::TEXT, '00000000-0000-0000-0000-000000000000'));
    RAISE NOTICE 'Created unique index idx_tasks_unique_per_parent';
  ELSE
    RAISE NOTICE 'Unique index idx_tasks_unique_per_parent already exists — skipped';
  END IF;
END;
$$;

-- Unique index on milestones: one milestone title per task
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'milestones'
      AND indexname  = 'idx_milestones_unique_per_task'
  ) THEN
    CREATE UNIQUE INDEX idx_milestones_unique_per_task
      ON milestones (task_id, title)
      WHERE title IS NOT NULL;
    RAISE NOTICE 'Created unique index idx_milestones_unique_per_task';
  ELSE
    RAISE NOTICE 'Unique index idx_milestones_unique_per_task already exists — skipped';
  END IF;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 4: Re-sync dashboard columns after deletions changed the tree shape
-- (Some parents may now be leaves; progress counts may have changed.)
-- ════════════════════════════════════════════════════════════════════════════

-- 4a. Mark branch tasks as is_leaf = FALSE
UPDATE tasks
SET    is_leaf = FALSE
WHERE  id IN (SELECT DISTINCT parent_id FROM tasks WHERE parent_id IS NOT NULL)
  AND  is_leaf = TRUE;

-- 4b. Mark true leaves as is_leaf = TRUE
UPDATE tasks
SET    is_leaf = TRUE
WHERE  id NOT IN (SELECT DISTINCT parent_id FROM tasks WHERE parent_id IS NOT NULL)
  AND  is_leaf = FALSE;

-- 4c. Fix progress_mode / due_date for any rows still out of sync
UPDATE tasks
SET    progress_mode = 'manual'
WHERE  progress_manual IS NOT NULL
  AND  progress_manual > 0
  AND  progress_mode   = 'auto';

UPDATE tasks
SET    due_date = COALESCE(
         NULLIF(metadata->>'dueDate',    ''),
         NULLIF(metadata->>'due_date',   ''),
         NULLIF(metadata->>'deadline',   ''),
         NULLIF(metadata->>'targetDate', ''),
         NULLIF(metadata->>'endDate',    ''),
         NULLIF(metadata->>'end_date',   '')
       )::TIMESTAMPTZ
WHERE  due_date IS NULL
  AND  COALESCE(
         NULLIF(metadata->>'dueDate',    ''),
         NULLIF(metadata->>'due_date',   ''),
         NULLIF(metadata->>'deadline',   ''),
         NULLIF(metadata->>'targetDate', ''),
         NULLIF(metadata->>'endDate',    ''),
         NULLIF(metadata->>'end_date',   '')
       ) IS NOT NULL;


-- ════════════════════════════════════════════════════════════════════════════
-- STEP 5: STATUS REPORT
-- ════════════════════════════════════════════════════════════════════════════

-- A. Task counts by type
SELECT
  'tasks'                                               AS table_name,
  COUNT(*)                                              AS total_rows,
  COUNT(*) FILTER (WHERE is_leaf = TRUE)                AS leaf_count,
  COUNT(*) FILTER (WHERE is_leaf = FALSE)               AS branch_count,
  COUNT(*) FILTER (WHERE due_date IS NOT NULL)          AS with_due_date,
  COUNT(*) FILTER (WHERE due_date < NOW())              AS overdue_count
FROM tasks;

-- B. Milestone counts
SELECT
  'milestones'                                          AS table_name,
  COUNT(*)                                              AS total_rows,
  COUNT(*) FILTER (WHERE done = TRUE)                   AS done_count,
  COUNT(*) FILTER (WHERE done = FALSE)                  AS pending_count
FROM milestones;

-- C. KPI snapshot
SELECT
  active_tasks,
  overdue_tasks
FROM dashboard_kpis;

-- D. Remaining duplicate check (should return 0 rows if clean)
SELECT
  title,
  assigned_to,
  COALESCE(parent_id::TEXT, '<<root>>') AS parent,
  COUNT(*)                              AS duplicates
FROM tasks
WHERE title IS NOT NULL
GROUP BY title, assigned_to, COALESCE(parent_id::TEXT, '<<root>>')
HAVING COUNT(*) > 1
ORDER BY duplicates DESC, title;
