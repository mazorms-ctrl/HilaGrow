-- ============================================================================
-- Migration 019: Full Rewrite — fn_log_task_activity()
--
-- Root cause of generic messages in 017/018:
--   The VALUES-table approach used in 018 cannot reference OLD/NEW inside
--   a static subquery WHERE clause in PostgreSQL — those comparisons never
--   matched, so every save fell through to the generic catch-all.
--
-- Fix: explicit IF/ELSIF chain for every single field.
--   No dynamic key lookup. No VALUES subquery. No generic fallback.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_action  TEXT  := 'task_updated';
  v_content TEXT;
BEGIN

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  -- ── INSERT ──────────────────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_feed (task_id, user_id, action_type, content)
    VALUES (NEW.id, v_user_id, 'task_created',
            'יצר משימה: ' || LEFT(COALESCE(NEW.title, ''), 40));
    RETURN NEW;
  END IF;

  -- ── Skip system-only writes ──────────────────────────────────────────────────
  -- (is_leaf / progress_mode changed by fn_sync_task_dashboard_data, not users)
  IF OLD.title          IS NOT DISTINCT FROM NEW.title
     AND OLD.metadata        IS NOT DISTINCT FROM NEW.metadata
     AND OLD.progress_manual IS NOT DISTINCT FROM NEW.progress_manual
     AND OLD.due_date         IS NOT DISTINCT FROM NEW.due_date
     AND OLD.priority         IS NOT DISTINCT FROM NEW.priority
     AND OLD.assigned_to      IS NOT DISTINCT FROM NEW.assigned_to
  THEN
    RETURN NEW;
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- Priority order: first matching branch wins.
  -- ════════════════════════════════════════════════════════════════════════════

  -- 1. Progress
  IF OLD.progress_manual IS DISTINCT FROM NEW.progress_manual
     AND NEW.progress_manual IS NOT NULL
  THEN
    v_action  := 'progress_updated';
    v_content := 'עדכן התקדמות ל-' || NEW.progress_manual::TEXT || '%';

  -- 2. Due date
  ELSIF OLD.due_date IS DISTINCT FROM NEW.due_date
     OR (OLD.metadata->>'dueDate') IS DISTINCT FROM (NEW.metadata->>'dueDate')
  THEN
    v_content := CASE
      WHEN NEW.due_date IS NOT NULL
        THEN 'שינה יעד ל-' || TO_CHAR(NEW.due_date AT TIME ZONE 'Asia/Jerusalem', 'DD/MM')
      WHEN (NEW.metadata->>'dueDate') IS NOT NULL AND (NEW.metadata->>'dueDate') <> ''
        THEN 'שינה יעד ל-' || LEFT(NEW.metadata->>'dueDate', 10)
      ELSE 'הסיר תאריך יעד'
    END;

  -- 3. Title
  ELSIF OLD.title IS DISTINCT FROM NEW.title THEN
    v_content := 'שינה שם ל: ' || LEFT(NEW.title, 30)
                 || CASE WHEN length(NEW.title) > 30 THEN '…' ELSE '' END;

  -- 4. Owner
  ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    v_content := 'שינה את האחראי על המשימה';

  -- 5. Priority
  ELSIF OLD.priority IS DISTINCT FROM NEW.priority THEN
    v_content := 'שינה עדיפות ל-' || COALESCE(NEW.priority, 'ללא');

  -- 6. Status (metadata)
  ELSIF (OLD.metadata->>'status') IS DISTINCT FROM (NEW.metadata->>'status')
        AND (NEW.metadata->>'status') IS NOT NULL
  THEN
    v_action  := 'status_changed';
    v_content := 'שינה סטטוס ל: ' || LEFT(NEW.metadata->>'status', 30);

  -- ── Characterization fields ─────────────────────────────────────────────────

  ELSIF (OLD.metadata->>'goal') IS DISTINCT FROM (NEW.metadata->>'goal')
        AND (NEW.metadata->>'goal') IS NOT NULL AND (NEW.metadata->>'goal') <> ''
  THEN
    v_content := 'עדכן מטרה: ' || LEFT(NEW.metadata->>'goal', 40)
                 || CASE WHEN length(NEW.metadata->>'goal') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'scope') IS DISTINCT FROM (NEW.metadata->>'scope')
        AND (NEW.metadata->>'scope') IS NOT NULL AND (NEW.metadata->>'scope') <> ''
  THEN
    v_content := 'עדכן היקף: ' || LEFT(NEW.metadata->>'scope', 40)
                 || CASE WHEN length(NEW.metadata->>'scope') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'problemStatement') IS DISTINCT FROM (NEW.metadata->>'problemStatement')
        AND (NEW.metadata->>'problemStatement') IS NOT NULL AND (NEW.metadata->>'problemStatement') <> ''
  THEN
    v_content := 'עדכן בעיה: ' || LEFT(NEW.metadata->>'problemStatement', 40)
                 || CASE WHEN length(NEW.metadata->>'problemStatement') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'proposedSolution') IS DISTINCT FROM (NEW.metadata->>'proposedSolution')
        AND (NEW.metadata->>'proposedSolution') IS NOT NULL AND (NEW.metadata->>'proposedSolution') <> ''
  THEN
    v_content := 'עדכן פתרון מוצע: ' || LEFT(NEW.metadata->>'proposedSolution', 40)
                 || CASE WHEN length(NEW.metadata->>'proposedSolution') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'currentState') IS DISTINCT FROM (NEW.metadata->>'currentState')
        AND (NEW.metadata->>'currentState') IS NOT NULL AND (NEW.metadata->>'currentState') <> ''
  THEN
    v_content := 'עדכן מצב נוכחי: ' || LEFT(NEW.metadata->>'currentState', 40)
                 || CASE WHEN length(NEW.metadata->>'currentState') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'successDefinition') IS DISTINCT FROM (NEW.metadata->>'successDefinition')
        AND (NEW.metadata->>'successDefinition') IS NOT NULL AND (NEW.metadata->>'successDefinition') <> ''
  THEN
    v_content := 'עדכן הגדרת הצלחה: ' || LEFT(NEW.metadata->>'successDefinition', 40)
                 || CASE WHEN length(NEW.metadata->>'successDefinition') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'desiredImpact') IS DISTINCT FROM (NEW.metadata->>'desiredImpact')
        AND (NEW.metadata->>'desiredImpact') IS NOT NULL AND (NEW.metadata->>'desiredImpact') <> ''
  THEN
    v_content := 'עדכן השפעה רצויה: ' || LEFT(NEW.metadata->>'desiredImpact', 40)
                 || CASE WHEN length(NEW.metadata->>'desiredImpact') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'targetAudience') IS DISTINCT FROM (NEW.metadata->>'targetAudience')
        AND (NEW.metadata->>'targetAudience') IS NOT NULL AND (NEW.metadata->>'targetAudience') <> ''
  THEN
    v_content := 'עדכן קהל יעד: ' || LEFT(NEW.metadata->>'targetAudience', 40)
                 || CASE WHEN length(NEW.metadata->>'targetAudience') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'deliverables') IS DISTINCT FROM (NEW.metadata->>'deliverables')
        AND (NEW.metadata->>'deliverables') IS NOT NULL AND (NEW.metadata->>'deliverables') <> ''
  THEN
    v_content := 'עדכן תוצרים: ' || LEFT(NEW.metadata->>'deliverables', 40)
                 || CASE WHEN length(NEW.metadata->>'deliverables') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'acceptanceCriteria') IS DISTINCT FROM (NEW.metadata->>'acceptanceCriteria')
        AND (NEW.metadata->>'acceptanceCriteria') IS NOT NULL AND (NEW.metadata->>'acceptanceCriteria') <> ''
  THEN
    v_content := 'עדכן קריטריוני קבלה: ' || LEFT(NEW.metadata->>'acceptanceCriteria', 40)
                 || CASE WHEN length(NEW.metadata->>'acceptanceCriteria') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'constraints') IS DISTINCT FROM (NEW.metadata->>'constraints')
        AND (NEW.metadata->>'constraints') IS NOT NULL AND (NEW.metadata->>'constraints') <> ''
  THEN
    v_content := 'עדכן מגבלות: ' || LEFT(NEW.metadata->>'constraints', 40)
                 || CASE WHEN length(NEW.metadata->>'constraints') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'painPoints') IS DISTINCT FROM (NEW.metadata->>'painPoints')
        AND (NEW.metadata->>'painPoints') IS NOT NULL AND (NEW.metadata->>'painPoints') <> ''
  THEN
    v_content := 'עדכן נקודות כאב: ' || LEFT(NEW.metadata->>'painPoints', 40)
                 || CASE WHEN length(NEW.metadata->>'painPoints') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'existingProcess') IS DISTINCT FROM (NEW.metadata->>'existingProcess')
        AND (NEW.metadata->>'existingProcess') IS NOT NULL AND (NEW.metadata->>'existingProcess') <> ''
  THEN
    v_content := 'עדכן תהליך קיים: ' || LEFT(NEW.metadata->>'existingProcess', 40)
                 || CASE WHEN length(NEW.metadata->>'existingProcess') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'evidence') IS DISTINCT FROM (NEW.metadata->>'evidence')
        AND (NEW.metadata->>'evidence') IS NOT NULL AND (NEW.metadata->>'evidence') <> ''
  THEN
    v_content := 'עדכן ראיות: ' || LEFT(NEW.metadata->>'evidence', 40)
                 || CASE WHEN length(NEW.metadata->>'evidence') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'outOfScope') IS DISTINCT FROM (NEW.metadata->>'outOfScope')
        AND (NEW.metadata->>'outOfScope') IS NOT NULL AND (NEW.metadata->>'outOfScope') <> ''
  THEN
    v_content := 'עדכן מחוץ להיקף: ' || LEFT(NEW.metadata->>'outOfScope', 40)
                 || CASE WHEN length(NEW.metadata->>'outOfScope') > 40 THEN '…' ELSE '' END;

  -- ── KPI fields ───────────────────────────────────────────────────────────────

  ELSIF (OLD.metadata->>'kpiName') IS DISTINCT FROM (NEW.metadata->>'kpiName')
        AND (NEW.metadata->>'kpiName') IS NOT NULL AND (NEW.metadata->>'kpiName') <> ''
  THEN
    v_content := 'עדכן מדד: ' || LEFT(NEW.metadata->>'kpiName', 40)
                 || CASE WHEN length(NEW.metadata->>'kpiName') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'target') IS DISTINCT FROM (NEW.metadata->>'target')
        AND (NEW.metadata->>'target') IS NOT NULL AND (NEW.metadata->>'target') <> ''
  THEN
    v_content := 'עדכן יעד מדידה: ' || LEFT(NEW.metadata->>'target', 40)
                 || CASE WHEN length(NEW.metadata->>'target') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'baseline') IS DISTINCT FROM (NEW.metadata->>'baseline')
        AND (NEW.metadata->>'baseline') IS NOT NULL AND (NEW.metadata->>'baseline') <> ''
  THEN
    v_content := 'עדכן בסיס מדידה: ' || LEFT(NEW.metadata->>'baseline', 40)
                 || CASE WHEN length(NEW.metadata->>'baseline') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->'kpis')::TEXT IS DISTINCT FROM (NEW.metadata->'kpis')::TEXT THEN
    v_content := 'עדכן מדדי הצלחה';

  -- ── Outcome / closure fields ─────────────────────────────────────────────────

  ELSIF (OLD.metadata->>'finalDeliverable') IS DISTINCT FROM (NEW.metadata->>'finalDeliverable')
        AND (NEW.metadata->>'finalDeliverable') IS NOT NULL AND (NEW.metadata->>'finalDeliverable') <> ''
  THEN
    v_content := 'עדכן תוצר סופי: ' || LEFT(NEW.metadata->>'finalDeliverable', 40)
                 || CASE WHEN length(NEW.metadata->>'finalDeliverable') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'measuredResult') IS DISTINCT FROM (NEW.metadata->>'measuredResult')
        AND (NEW.metadata->>'measuredResult') IS NOT NULL AND (NEW.metadata->>'measuredResult') <> ''
  THEN
    v_content := 'עדכן תוצאה מדודה: ' || LEFT(NEW.metadata->>'measuredResult', 40)
                 || CASE WHEN length(NEW.metadata->>'measuredResult') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'lessonsLearned') IS DISTINCT FROM (NEW.metadata->>'lessonsLearned')
        AND (NEW.metadata->>'lessonsLearned') IS NOT NULL AND (NEW.metadata->>'lessonsLearned') <> ''
  THEN
    v_content := 'עדכן לקחים: ' || LEFT(NEW.metadata->>'lessonsLearned', 40)
                 || CASE WHEN length(NEW.metadata->>'lessonsLearned') > 40 THEN '…' ELSE '' END;

  ELSIF (OLD.metadata->>'rolloutNotes') IS DISTINCT FROM (NEW.metadata->>'rolloutNotes')
        AND (NEW.metadata->>'rolloutNotes') IS NOT NULL AND (NEW.metadata->>'rolloutNotes') <> ''
  THEN
    v_content := 'עדכן הערות הטמעה: ' || LEFT(NEW.metadata->>'rolloutNotes', 40)
                 || CASE WHEN length(NEW.metadata->>'rolloutNotes') > 40 THEN '…' ELSE '' END;

  -- ── Any remaining metadata change (milestoneExtras, stakeholders, etc.) ──────
  ELSIF OLD.metadata IS DISTINCT FROM NEW.metadata THEN
    v_content := 'בוצע עדכון בתוכן המשימה';

  ELSE
    -- Nothing meaningful changed
    RETURN NEW;
  END IF;

  INSERT INTO activity_feed (task_id, user_id, action_type, content)
  VALUES (NEW.id, v_user_id, v_action, v_content);

  RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_activity ON tasks;

CREATE TRIGGER trg_log_task_activity
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_task_activity();

-- ── Quick smoke-test ─────────────────────────────────────────────────────────
-- After running, open a task, edit the Goal field, save, then run:
--   SELECT content, created_at FROM activity_feed ORDER BY created_at DESC LIMIT 5;
-- You should see "עדכן מטרה: <your text>"
