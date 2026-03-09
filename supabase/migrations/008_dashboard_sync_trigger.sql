-- ============================================================================
-- Migration 008: Dashboard Sync Trigger — Safety Net
--
-- Creates a single function fn_sync_task_dashboard_data() called by two
-- triggers (BEFORE INSERT/UPDATE and AFTER DELETE) so the three dashboard-
-- critical columns are always consistent with the source data:
--
--   progress_mode  ← auto-set to 'manual' when progress_manual is written
--   due_date       ← kept in sync with metadata->>'dueDate'
--   is_leaf        ← maintained as the true leaf/branch state of the tree
--
-- Design notes:
--   • BEFORE INSERT/UPDATE: fires before the row is written so we can mutate
--     NEW fields (progress_mode, due_date) without a second UPDATE.
--   • AFTER DELETE: fires after the row is gone so we can check whether the
--     former parent still has any remaining children before restoring its flag.
--   • Both triggers call the SAME function; TG_OP routes the logic.
-- ============================================================================


-- ── Trigger function ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_task_dashboard_data()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

  -- ════════════════════════════════════════════════════════════════════════════
  -- DELETE path — fires AFTER the row is removed
  -- Goal: restore parent's is_leaf = TRUE when it has no remaining children.
  -- ════════════════════════════════════════════════════════════════════════════
  IF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM tasks WHERE parent_id = OLD.parent_id
      ) THEN
        UPDATE tasks SET is_leaf = TRUE WHERE id = OLD.parent_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;


  -- ════════════════════════════════════════════════════════════════════════════
  -- INSERT / UPDATE path — fires BEFORE the row is written (mutates NEW)
  -- ════════════════════════════════════════════════════════════════════════════

  -- ── 1. Progress mode sync ───────────────────────────────────────────────────
  -- When a caller sets progress_manual > 0 but leaves progress_mode = 'auto',
  -- flip to 'manual' so the LATERAL view expression picks up the value.
  IF NEW.progress_manual IS NOT NULL
     AND NEW.progress_manual > 0
     AND NEW.progress_mode = 'auto'
  THEN
    NEW.progress_mode := 'manual';
  END IF;

  -- Edge-case: if progress_manual is cleared back to NULL or 0, revert to auto
  -- so milestones-based computation takes over again.
  IF (NEW.progress_manual IS NULL OR NEW.progress_manual = 0)
     AND NEW.progress_mode = 'manual'
     -- Only revert if the caller didn't explicitly set mode = 'manual' themselves.
     -- We infer "explicit" by checking whether it changed in this statement.
     AND (TG_OP = 'INSERT' OR OLD.progress_mode = 'auto')
  THEN
    NEW.progress_mode := 'auto';
  END IF;


  -- ── 2. Due date sync ────────────────────────────────────────────────────────
  -- Keep tasks.due_date in sync with tasks.metadata->>'dueDate'.
  -- Overwrites due_date when:
  --   (a) due_date is NULL and metadata has a value, OR
  --   (b) on UPDATE, metadata dueDate just changed (user edited the field in UI).
  -- If metadata dueDate is cleared, clear due_date too.

  IF (NEW.metadata->>'dueDate') IS NOT NULL
     AND (NEW.metadata->>'dueDate') <> ''
  THEN
    IF NEW.due_date IS NULL
       OR (TG_OP = 'UPDATE'
           AND (OLD.metadata->>'dueDate') IS DISTINCT FROM (NEW.metadata->>'dueDate'))
    THEN
      BEGIN
        NEW.due_date := (NEW.metadata->>'dueDate')::TIMESTAMPTZ;
      EXCEPTION WHEN OTHERS THEN
        -- Bad date string in metadata — leave due_date unchanged.
        NULL;
      END;
    END IF;

  ELSIF TG_OP = 'UPDATE'
        AND (OLD.metadata->>'dueDate') IS NOT NULL
        AND (OLD.metadata->>'dueDate') <> ''
        AND ((NEW.metadata->>'dueDate') IS NULL OR (NEW.metadata->>'dueDate') = '')
  THEN
    -- Metadata dueDate was cleared → clear the column too
    NEW.due_date := NULL;
  END IF;


  -- ── 3. is_leaf — mark NEW parent as a branch ────────────────────────────────
  -- If this task just gained a parent_id, the parent can no longer be a leaf.
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE tasks
    SET    is_leaf = FALSE
    WHERE  id      = NEW.parent_id
      AND  is_leaf = TRUE;   -- skip if already FALSE (avoid pointless write)
  END IF;

  -- ── 4. is_leaf — restore OLD parent to leaf if it has no more children ───────
  -- Applies only on UPDATE when parent_id changes (re-parenting or detaching).
  IF TG_OP = 'UPDATE'
     AND OLD.parent_id IS DISTINCT FROM NEW.parent_id
     AND OLD.parent_id IS NOT NULL
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM tasks
      WHERE  parent_id = OLD.parent_id
        AND  id        != NEW.id   -- this row no longer points at old parent
    ) THEN
      UPDATE tasks SET is_leaf = TRUE WHERE id = OLD.parent_id;
    END IF;
  END IF;

  -- ── 5. is_leaf — new task's own flag ────────────────────────────────────────
  -- A freshly inserted task has no children yet → always a leaf.
  -- On UPDATE the caller may explicitly set is_leaf; we don't override that here.
  IF TG_OP = 'INSERT' THEN
    NEW.is_leaf := TRUE;
  END IF;

  RETURN NEW;

END;
$$;


-- ── Attach: BEFORE INSERT OR UPDATE ──────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_sync_task_dashboard_before ON tasks;

CREATE TRIGGER trg_sync_task_dashboard_before
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_task_dashboard_data();


-- ── Attach: AFTER DELETE ──────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_sync_task_dashboard_after_delete ON tasks;

CREATE TRIGGER trg_sync_task_dashboard_after_delete
  AFTER DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_task_dashboard_data();


-- ── One-time cleanup: fix any rows that are already out of sync ───────────────
-- (Idempotent — safe to re-run even if 006/007 were already applied.)

-- 3a. Mark branch tasks (those that have at least one child) as is_leaf = FALSE
UPDATE tasks
SET    is_leaf = FALSE
WHERE  id IN (SELECT DISTINCT parent_id FROM tasks WHERE parent_id IS NOT NULL)
  AND  is_leaf = TRUE;

-- 3b. Mark true leaves (no children) as is_leaf = TRUE
UPDATE tasks
SET    is_leaf = TRUE
WHERE  id NOT IN (SELECT DISTINCT parent_id FROM tasks WHERE parent_id IS NOT NULL)
  AND  is_leaf = FALSE;

-- 3c. Fix progress_mode for tasks that have a manual value but wrong mode
UPDATE tasks
SET    progress_mode = 'manual'
WHERE  progress_manual IS NOT NULL
  AND  progress_manual > 0
  AND  progress_mode   = 'auto';

-- 3d. Back-fill due_date from metadata for tasks still missing it
UPDATE tasks
SET    due_date = (metadata->>'dueDate')::TIMESTAMPTZ
WHERE  due_date IS NULL
  AND  (metadata->>'dueDate') IS NOT NULL
  AND  (metadata->>'dueDate') <> '';


-- ── Verify final state ────────────────────────────────────────────────────────

SELECT
  is_leaf,
  progress_mode,
  COUNT(*)                                              AS task_count,
  COUNT(*) FILTER (WHERE due_date IS NOT NULL)          AS has_due_date,
  COUNT(*) FILTER (WHERE due_date < NOW())              AS overdue_count
FROM tasks
GROUP BY is_leaf, progress_mode
ORDER BY is_leaf DESC, progress_mode;
