-- ============================================================================
-- Migration 018: Smart Snippet Activity Trigger
--
-- Upgrades fn_log_task_activity() to include a truncated preview of the
-- new value in the content string so the feed reads like:
--
--   "שינה שם ל: בדיקת תשתית קומה..."
--   "עדכן מטרה: לשפר את זמן ה..."
--   "שינה תאריך יעד ל-15/03"
--   "עדכן התקדמות ל-70%"
--
-- Rules:
--   • Every text snippet is truncated to 40 chars with "…" suffix.
--   • Metadata keys are mapped to Hebrew field labels.
--   • For multi-field sections (characterization, KPI, outcome) the trigger
--     finds the FIRST changed key and uses its label + snippet.
--   • Numeric / date fields keep their compact existing format.
-- ============================================================================


-- ── Helper: truncate to 40 chars ─────────────────────────────────────────────
-- Inline macro — we'll inline it directly in the function rather than create
-- a separate function, to keep the schema clean.

CREATE OR REPLACE FUNCTION fn_log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID;
  v_action   TEXT;
  v_content  TEXT;
  v_snippet  TEXT;
  v_label    TEXT;
BEGIN

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  -- ── INSERT ──────────────────────────────────────────────────────────────────
  IF TG_OP = 'INSERT' THEN
    v_snippet := CASE
      WHEN length(NEW.title) > 30
        THEN substring(NEW.title FROM 1 FOR 30) || '…'
      ELSE NEW.title
    END;
    INSERT INTO activity_feed (task_id, user_id, action_type, content)
    VALUES (NEW.id, v_user_id, 'task_created', 'יצר משימה: ' || v_snippet);
    RETURN NEW;
  END IF;

  -- ── Skip system-only writes ──────────────────────────────────────────────────
  IF OLD.title          IS NOT DISTINCT FROM NEW.title
     AND OLD.metadata        IS NOT DISTINCT FROM NEW.metadata
     AND OLD.progress_manual IS NOT DISTINCT FROM NEW.progress_manual
     AND OLD.due_date         IS NOT DISTINCT FROM NEW.due_date
     AND OLD.priority         IS NOT DISTINCT FROM NEW.priority
     AND OLD.assigned_to      IS NOT DISTINCT FROM NEW.assigned_to
  THEN
    RETURN NEW;
  END IF;


  -- ── 1. Progress ──────────────────────────────────────────────────────────────
  IF OLD.progress_manual IS DISTINCT FROM NEW.progress_manual
     AND NEW.progress_manual IS NOT NULL
  THEN
    v_action  := 'progress_updated';
    v_content := 'עדכן התקדמות ל-' || NEW.progress_manual::TEXT || '%';

  -- ── 2. Due date ──────────────────────────────────────────────────────────────
  ELSIF OLD.due_date IS DISTINCT FROM NEW.due_date
     OR (OLD.metadata->>'dueDate') IS DISTINCT FROM (NEW.metadata->>'dueDate')
  THEN
    v_action := 'task_updated';
    v_content := CASE
      WHEN NEW.due_date IS NULL AND (NEW.metadata->>'dueDate') IS NULL
        THEN 'הסיר תאריך יעד'
      WHEN NEW.due_date IS NOT NULL
        THEN 'שינה יעד ל-' || TO_CHAR(NEW.due_date AT TIME ZONE 'Asia/Jerusalem', 'DD/MM')
      ELSE 'שינה תאריך יעד'
    END;

  -- ── 3. Title ─────────────────────────────────────────────────────────────────
  ELSIF OLD.title IS DISTINCT FROM NEW.title THEN
    v_action  := 'task_updated';
    v_snippet := CASE
      WHEN length(NEW.title) > 30 THEN substring(NEW.title FROM 1 FOR 30) || '…'
      ELSE NEW.title
    END;
    v_content := 'שינה שם ל: ' || v_snippet;

  -- ── 4. Owner ─────────────────────────────────────────────────────────────────
  ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    v_action  := 'task_updated';
    v_content := 'שינה את האחראי על המשימה';

  -- ── 5. Priority ──────────────────────────────────────────────────────────────
  ELSIF OLD.priority IS DISTINCT FROM NEW.priority THEN
    v_action  := 'task_updated';
    v_content := 'שינה עדיפות ל-' || COALESCE(NEW.priority, 'ללא');

  -- ── 6. Status (metadata) ─────────────────────────────────────────────────────
  ELSIF (OLD.metadata->>'status') IS DISTINCT FROM (NEW.metadata->>'status')
        AND (NEW.metadata->>'status') IS NOT NULL
  THEN
    v_action  := 'status_changed';
    v_content := 'שינה סטטוס';

  -- ── 7. Characterization fields — find first changed key + snippet ─────────────
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
    v_action := 'task_updated';

    -- Pick the first changed key and map it to Hebrew
    SELECT label, raw_val INTO v_label, v_snippet
    FROM (VALUES
      ('problemStatement', 'בעיה',         NEW.metadata->>'problemStatement'),
      ('goal',             'מטרה',          NEW.metadata->>'goal'),
      ('targetAudience',   'קהל יעד',       NEW.metadata->>'targetAudience'),
      ('desiredImpact',    'השפעה רצויה',   NEW.metadata->>'desiredImpact'),
      ('scope',            'היקף',          NEW.metadata->>'scope'),
      ('outOfScope',       'מחוץ להיקף',    NEW.metadata->>'outOfScope'),
      ('successDefinition','הגדרת הצלחה',   NEW.metadata->>'successDefinition'),
      ('currentState',     'מצב נוכחי',     NEW.metadata->>'currentState'),
      ('painPoints',       'נקודות כאב',    NEW.metadata->>'painPoints'),
      ('constraints',      'מגבלות',        NEW.metadata->>'constraints'),
      ('existingProcess',  'תהליך קיים',    NEW.metadata->>'existingProcess'),
      ('evidence',         'ראיות',         NEW.metadata->>'evidence'),
      ('proposedSolution', 'פתרון מוצע',    NEW.metadata->>'proposedSolution'),
      ('deliverables',     'תוצרים',        NEW.metadata->>'deliverables'),
      ('acceptanceCriteria','קריטריוני קבלה',NEW.metadata->>'acceptanceCriteria')
    ) AS t(key, label, raw_val)
    WHERE (OLD.metadata->>key) IS DISTINCT FROM (NEW.metadata->>key)
      AND raw_val IS NOT NULL AND raw_val <> ''
    LIMIT 1;

    IF v_label IS NOT NULL AND v_snippet IS NOT NULL THEN
      v_snippet := CASE
        WHEN length(v_snippet) > 40 THEN substring(v_snippet FROM 1 FOR 40) || '…'
        ELSE v_snippet
      END;
      v_content := 'עדכן ' || v_label || ': ' || v_snippet;
    ELSE
      v_content := 'עדכן פרטי אפיון';
    END IF;

  -- ── 8. KPI fields ────────────────────────────────────────────────────────────
  ELSIF (OLD.metadata->>'kpiName')            IS DISTINCT FROM (NEW.metadata->>'kpiName')
     OR (OLD.metadata->>'baseline')           IS DISTINCT FROM (NEW.metadata->>'baseline')
     OR (OLD.metadata->>'target')             IS DISTINCT FROM (NEW.metadata->>'target')
     OR (OLD.metadata->>'measurementCadence') IS DISTINCT FROM (NEW.metadata->>'measurementCadence')
     OR (OLD.metadata->'kpis')::TEXT          IS DISTINCT FROM (NEW.metadata->'kpis')::TEXT
  THEN
    v_action := 'task_updated';

    SELECT label, raw_val INTO v_label, v_snippet
    FROM (VALUES
      ('kpiName',           'מדד',        NEW.metadata->>'kpiName'),
      ('baseline',          'בסיס',       NEW.metadata->>'baseline'),
      ('target',            'יעד',        NEW.metadata->>'target'),
      ('measurementCadence','תדירות מדידה',NEW.metadata->>'measurementCadence')
    ) AS t(key, label, raw_val)
    WHERE (OLD.metadata->>key) IS DISTINCT FROM (NEW.metadata->>key)
      AND raw_val IS NOT NULL AND raw_val <> ''
    LIMIT 1;

    IF v_label IS NOT NULL AND v_snippet IS NOT NULL THEN
      v_snippet := CASE
        WHEN length(v_snippet) > 40 THEN substring(v_snippet FROM 1 FOR 40) || '…'
        ELSE v_snippet
      END;
      v_content := 'עדכן ' || v_label || ': ' || v_snippet;
    ELSE
      v_content := 'עדכן מדדי הצלחה';
    END IF;

  -- ── 9. Outcome / closure fields ───────────────────────────────────────────────
  ELSIF (OLD.metadata->>'finalDeliverable') IS DISTINCT FROM (NEW.metadata->>'finalDeliverable')
     OR (OLD.metadata->>'measuredResult')   IS DISTINCT FROM (NEW.metadata->>'measuredResult')
     OR (OLD.metadata->>'lessonsLearned')   IS DISTINCT FROM (NEW.metadata->>'lessonsLearned')
     OR (OLD.metadata->>'rolloutNotes')     IS DISTINCT FROM (NEW.metadata->>'rolloutNotes')
  THEN
    v_action := 'task_updated';

    SELECT label, raw_val INTO v_label, v_snippet
    FROM (VALUES
      ('finalDeliverable','תוצר סופי',   NEW.metadata->>'finalDeliverable'),
      ('measuredResult',  'תוצאה מדודה', NEW.metadata->>'measuredResult'),
      ('lessonsLearned',  'לקחים',       NEW.metadata->>'lessonsLearned'),
      ('rolloutNotes',    'הערות הטמעה', NEW.metadata->>'rolloutNotes')
    ) AS t(key, label, raw_val)
    WHERE (OLD.metadata->>key) IS DISTINCT FROM (NEW.metadata->>key)
      AND raw_val IS NOT NULL AND raw_val <> ''
    LIMIT 1;

    IF v_label IS NOT NULL AND v_snippet IS NOT NULL THEN
      v_snippet := CASE
        WHEN length(v_snippet) > 40 THEN substring(v_snippet FROM 1 FOR 40) || '…'
        ELSE v_snippet
      END;
      v_content := 'עדכן ' || v_label || ': ' || v_snippet;
    ELSE
      v_content := 'עדכן פרטי סיום';
    END IF;

  -- ── 10. Any other metadata change ─────────────────────────────────────────────
  ELSIF OLD.metadata IS DISTINCT FROM NEW.metadata THEN
    v_action  := 'task_updated';
    v_content := 'עדכן פרטי תוכן';

  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_feed (task_id, user_id, action_type, content)
  VALUES (NEW.id, v_user_id, v_action, v_content);

  RETURN NEW;

END;
$$;

-- Re-attach (DROP + CREATE ensures clean trigger binding)
DROP TRIGGER IF EXISTS trg_log_task_activity ON tasks;

CREATE TRIGGER trg_log_task_activity
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_task_activity();
