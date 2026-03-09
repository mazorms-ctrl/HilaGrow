-- ============================================================================
-- Migration 017: Granular Activity Feed Trigger
--
-- Problem:
--   Every save falls through to the metadata catch-all because updateTask()
--   always rewrites the entire metadata JSONB. The trigger had no way to
--   distinguish "user changed the goal field" from "user changed the KPIs".
--
-- Fix:
--   Compare specific JSONB subkeys to generate a precise Hebrew description.
--
--   Priority order (first match wins):
--     1. progress_manual changed       → "עדכן התקדמות ל-X%"
--     2. due_date changed              → "שינה תאריך יעד ל-DD/MM"
--     3. title changed                 → "שינה את שם המשימה"
--     4. assigned_to changed           → "שינה את האחראי על המשימה"
--     5. priority changed              → "שינה עדיפות ל-X"
--     6. metadata->>'status' changed   → "שינה סטטוס"
--     7. Characterization subkeys      → "עדכן פרטי אפיון"
--     8. KPI subkeys                   → "עדכן מדדי הצלחה"
--     9. Outcome / closure subkeys     → "עדכן פרטי סיום"
--    10. Timeline/other metadata       → "עדכן פרטי תוכן"
--
--   content is now the FULL self-sufficient description; action_type is kept
--   for filtering but the UI should display content directly.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_action  TEXT;
  v_content TEXT;
BEGIN

  -- Only log actions from an authenticated session
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- INSERT: task created
  -- ════════════════════════════════════════════════════════════════════════════
  IF TG_OP = 'INSERT' THEN
    v_action  := 'task_created';
    v_content := 'יצר משימה חדשה: ' || NEW.title;
    INSERT INTO activity_feed (task_id, user_id, action_type, content)
    VALUES (NEW.id, v_user_id, v_action, v_content);
    RETURN NEW;
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- UPDATE: skip when only system-internal columns changed
  -- (is_leaf, progress_mode written by fn_sync_task_dashboard_data)
  -- ════════════════════════════════════════════════════════════════════════════
  IF OLD.title          IS NOT DISTINCT FROM NEW.title
     AND OLD.metadata        IS NOT DISTINCT FROM NEW.metadata
     AND OLD.progress_manual IS NOT DISTINCT FROM NEW.progress_manual
     AND OLD.due_date         IS NOT DISTINCT FROM NEW.due_date
     AND OLD.priority         IS NOT DISTINCT FROM NEW.priority
     AND OLD.assigned_to      IS NOT DISTINCT FROM NEW.assigned_to
  THEN
    RETURN NEW;
  END IF;


  -- ── 1. Progress ─────────────────────────────────────────────────────────────
  IF OLD.progress_manual IS DISTINCT FROM NEW.progress_manual
     AND NEW.progress_manual IS NOT NULL
  THEN
    v_action  := 'progress_updated';
    v_content := 'עדכן התקדמות ל-' || NEW.progress_manual::TEXT || '%';

  -- ── 2. Due date ─────────────────────────────────────────────────────────────
  ELSIF OLD.due_date IS DISTINCT FROM NEW.due_date
     OR (OLD.metadata->>'dueDate') IS DISTINCT FROM (NEW.metadata->>'dueDate')
  THEN
    v_action  := 'task_updated';
    v_content := CASE
      WHEN NEW.due_date IS NULL AND (NEW.metadata->>'dueDate') IS NULL
        THEN 'הסיר תאריך יעד'
      WHEN NEW.due_date IS NOT NULL
        THEN 'שינה תאריך יעד ל-' || TO_CHAR(NEW.due_date AT TIME ZONE 'Asia/Jerusalem', 'DD/MM')
      ELSE
        'שינה תאריך יעד'
    END;

  -- ── 3. Title ────────────────────────────────────────────────────────────────
  ELSIF OLD.title IS DISTINCT FROM NEW.title THEN
    v_action  := 'task_updated';
    v_content := 'שינה את שם המשימה';

  -- ── 4. Owner / assigned_to ──────────────────────────────────────────────────
  ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    v_action  := 'task_updated';
    v_content := 'שינה את האחראי על המשימה';

  -- ── 5. Priority ─────────────────────────────────────────────────────────────
  ELSIF OLD.priority IS DISTINCT FROM NEW.priority THEN
    v_action  := 'task_updated';
    v_content := 'שינה עדיפות ל-' || COALESCE(NEW.priority, 'ללא');

  -- ── 6. Status (inside metadata) ─────────────────────────────────────────────
  ELSIF (OLD.metadata->>'status') IS DISTINCT FROM (NEW.metadata->>'status')
        AND (NEW.metadata->>'status') IS NOT NULL
  THEN
    v_action  := 'status_changed';
    v_content := 'שינה סטטוס';

  -- ── 7. Characterization fields ──────────────────────────────────────────────
  -- problemStatement, goal, targetAudience, desiredImpact, scope, outOfScope,
  -- successDefinition, currentState, painPoints, constraints, existingProcess,
  -- evidence, department, processName, proposedSolution, deliverables,
  -- assumptions, requiredDecisions, acceptanceCriteria
  ELSIF (OLD.metadata->>'problemStatement') IS DISTINCT FROM (NEW.metadata->>'problemStatement')
     OR (OLD.metadata->>'goal')              IS DISTINCT FROM (NEW.metadata->>'goal')
     OR (OLD.metadata->>'targetAudience')    IS DISTINCT FROM (NEW.metadata->>'targetAudience')
     OR (OLD.metadata->>'desiredImpact')     IS DISTINCT FROM (NEW.metadata->>'desiredImpact')
     OR (OLD.metadata->>'scope')             IS DISTINCT FROM (NEW.metadata->>'scope')
     OR (OLD.metadata->>'outOfScope')        IS DISTINCT FROM (NEW.metadata->>'outOfScope')
     OR (OLD.metadata->>'successDefinition') IS DISTINCT FROM (NEW.metadata->>'successDefinition')
     OR (OLD.metadata->>'currentState')      IS DISTINCT FROM (NEW.metadata->>'currentState')
     OR (OLD.metadata->>'painPoints')        IS DISTINCT FROM (NEW.metadata->>'painPoints')
     OR (OLD.metadata->>'constraints')       IS DISTINCT FROM (NEW.metadata->>'constraints')
     OR (OLD.metadata->>'existingProcess')   IS DISTINCT FROM (NEW.metadata->>'existingProcess')
     OR (OLD.metadata->>'evidence')          IS DISTINCT FROM (NEW.metadata->>'evidence')
     OR (OLD.metadata->>'proposedSolution')  IS DISTINCT FROM (NEW.metadata->>'proposedSolution')
     OR (OLD.metadata->>'deliverables')      IS DISTINCT FROM (NEW.metadata->>'deliverables')
     OR (OLD.metadata->>'acceptanceCriteria') IS DISTINCT FROM (NEW.metadata->>'acceptanceCriteria')
  THEN
    v_action  := 'task_updated';
    v_content := 'עדכן פרטי אפיון';

  -- ── 8. KPI fields ───────────────────────────────────────────────────────────
  ELSIF (OLD.metadata->>'kpiName')             IS DISTINCT FROM (NEW.metadata->>'kpiName')
     OR (OLD.metadata->>'baseline')            IS DISTINCT FROM (NEW.metadata->>'baseline')
     OR (OLD.metadata->>'target')              IS DISTINCT FROM (NEW.metadata->>'target')
     OR (OLD.metadata->>'measurementCadence')  IS DISTINCT FROM (NEW.metadata->>'measurementCadence')
     OR (OLD.metadata->'kpis')::TEXT           IS DISTINCT FROM (NEW.metadata->'kpis')::TEXT
  THEN
    v_action  := 'task_updated';
    v_content := 'עדכן מדדי הצלחה';

  -- ── 9. Outcome / closure fields ─────────────────────────────────────────────
  ELSIF (OLD.metadata->>'finalDeliverable') IS DISTINCT FROM (NEW.metadata->>'finalDeliverable')
     OR (OLD.metadata->>'measuredResult')   IS DISTINCT FROM (NEW.metadata->>'measuredResult')
     OR (OLD.metadata->>'lessonsLearned')   IS DISTINCT FROM (NEW.metadata->>'lessonsLearned')
     OR (OLD.metadata->>'rolloutNotes')     IS DISTINCT FROM (NEW.metadata->>'rolloutNotes')
  THEN
    v_action  := 'task_updated';
    v_content := 'עדכן פרטי סיום';

  -- ── 10. Any other metadata change ───────────────────────────────────────────
  ELSIF OLD.metadata IS DISTINCT FROM NEW.metadata THEN
    v_action  := 'task_updated';
    v_content := 'עדכן פרטי תוכן';

  ELSE
    -- Nothing meaningful changed (e.g. only updated_at) — skip
    RETURN NEW;
  END IF;

  INSERT INTO activity_feed (task_id, user_id, action_type, content)
  VALUES (NEW.id, v_user_id, v_action, v_content);

  RETURN NEW;

END;
$$;

-- Re-attach trigger (function is replaced in place; trigger name stays the same)
DROP TRIGGER IF EXISTS trg_log_task_activity ON tasks;

CREATE TRIGGER trg_log_task_activity
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_task_activity();
