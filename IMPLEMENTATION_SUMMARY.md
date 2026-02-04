# סיכום יישום מערכת התראות מייל

## מה יושם

הוספנו מערכת התראות אוטומטיות במייל שמתריעה כאשר אבן דרך מסומנת כהושלמה.

## שינויים שבוצעו

### 1. בסיס נתונים (Database Schema)

**קובץ:** `supabase/schema.sql`

נוספו 3 טבלאות חדשות:

```sql
-- אנשי קשר עם מיילים
CREATE TABLE people (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at, updated_at
);

-- קשר בין משימות לאנשים שרוצים התראות
CREATE TABLE task_watchers (
  task_id UUID REFERENCES tasks(id),
  person_id UUID REFERENCES people(id),
  PRIMARY KEY (task_id, person_id)
);

-- תור מיילים לשליחה (reliability)
CREATE TABLE email_outbox (
  id UUID PRIMARY KEY,
  event_type TEXT,
  task_id UUID,
  milestone_id UUID,
  recipients TEXT[],
  payload JSONB,
  status TEXT CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  created_at, sent_at
);
```

**טריגר אוטומטי** שרץ כש-milestone.done משתנה ל-true:
- אוסף מייל של האחראי (מטבלת people לפי ownerName)
- אוסף מיילים של watchers
- יוצר רשומה ב-email_outbox עם כל המידע

### 2. Edge Function (Serverless)

**קובץ:** `supabase/functions/send-outbox-email/index.ts`

פונקציה ב-Deno שמטפלת בשליחת המיילים:
- מקבלת `outbox_id`
- טוענת את פרטי המשימה ואבן הדרך
- שולחת HTML email דרך Gmail SMTP
- מעדכנת סטטוס ל-'sent' או 'failed'

**משתני סביבה נדרשים:**
- `GMAIL_SMTP_USER`
- `GMAIL_SMTP_APP_PASSWORD`
- `GMAIL_FROM`
- `APP_PUBLIC_URL`

### 3. Frontend - Types

**קובץ:** `src/types/index.ts`

```typescript
export interface Person {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWatcher {
  taskId: string;
  personId: string;
  createdAt: Date;
}

// עדכון TaskWithRelations
export interface TaskWithRelations extends Task {
  // ...
  watchers?: Person[];
}
```

### 4. Frontend - Data Service

**קובץ:** `src/lib/dataService.ts`

נוספו פונקציות:
- `fetchPeople()` - טעינת רשימת אנשי קשר
- `createPerson()` - יצירת איש קשר חדש
- `updatePerson()` / `deletePerson()`
- `fetchTaskWatchers(taskId)` - טעינת watchers למשימה
- `addTaskWatcher()` / `removeTaskWatcher()`

### 5. Frontend - Hooks

**קובץ:** `src/hooks/useData.ts`

נוספו React Query hooks:
- `usePeople()` - רשימת כל אנשי הקשר
- `useCreatePerson()` - יצירת איש קשר
- `useTaskWatchers(taskId)` - watchers למשימה ספציפית
- `useAddTaskWatcher()` / `useRemoveTaskWatcher()`

### 6. Frontend - UI Component

**קובץ:** `src/components/tasks/TaskDrawer.tsx`

נוסף סעיף חדש "התראות במייל":
- רשימת כל אנשי הקשר עם checkboxes
- אפשרות לסמן/להסיר watchers
- כפתור "הוסף איש קשר" עם טופס
- האחראי מוצג אוטומטית ומסומן

### 7. Frontend - App Integration

**קובץ:** `src/main.tsx`

שונה להטעין את `App.new-supabase.tsx` במקום הגרסה הישנה:
- משתמש ב-TasksView/BoardView/TreeView
- כולל את TaskDrawer שמחובר ל-Supabase
- הגרסה הישנה (local state) עדיין זמינה ב-`App.tsx` (המקורי)

## זרימת העבודה (Flow)

```
1. משתמש מסמן אבן דרך כהושלמה
   ↓
2. TaskDrawer.handleToggleMilestone() קורא ל-updateMilestone
   ↓
3. Supabase מעדכן milestones.done = true
   ↓
4. טריגר notify_milestone_completed() מופעל אוטומטית
   ↓
5. הטריגר:
   - מחפש מייל של האחראי (tasks.owner_name → people.email)
   - מחפש מיילים של watchers (task_watchers → people.email)
   - יוצר רשומה ב-email_outbox עם recipients + payload
   ↓
6. Edge Function send-outbox-email מקבלת את outbox_id
   ↓
7. הפונקציה:
   - טוענת את הרשומה מ-email_outbox
   - בונה HTML email יפה בעברית
   - שולחת דרך Gmail SMTP
   - מעדכנת status ל-'sent' או 'failed'
   ↓
8. הנמענים מקבלים מייל עם:
   - כותרת: "✅ אבן דרך הושלמה: [שם אבן הדרך]"
   - תוכן: פרטי המשימה + קישור לאפליקציה
```

## קבצים שנוצרו/שונו

### נוצרו חדש:
1. `supabase/functions/send-outbox-email/index.ts` - Edge Function
2. `supabase/functions/send-outbox-email/README.md` - תיעוד הפונקציה
3. `src/App.new-supabase.tsx` - גרסת App מחוברת ל-Supabase
4. `EMAIL_NOTIFICATIONS_SETUP.md` - מדריך התקנה והפעלה
5. `IMPLEMENTATION_SUMMARY.md` - מסמך זה

### שונו:
1. `supabase/schema.sql` - הוספת טבלאות וטריגר
2. `src/types/index.ts` - הוספת Person, TaskWatcher
3. `src/lib/dataService.ts` - הוספת פונקציות People + Watchers
4. `src/hooks/useData.ts` - הוספת hooks חדשים
5. `src/components/tasks/TaskDrawer.tsx` - הוספת UI להתראות
6. `src/main.tsx` - שינוי ל-App.new-supabase.tsx

## שלבים הבאים להפעלה

ראה `EMAIL_NOTIFICATIONS_SETUP.md` להוראות מפורטות:

1. ✅ עדכן DB עם schema.sql
2. ✅ יצור Gmail App Password
3. ✅ פרוס Edge Function
4. ✅ הגדר משתני סביבה
5. ✅ הוסף אנשי קשר דרך UI
6. ✅ הגדר watchers למשימות
7. ✅ בדוק על ידי סימון אבן דרך

## בדיקה מהירה

```sql
-- הוסף איש קשר
INSERT INTO people (name, email) 
VALUES ('הבוחן', 'your-email@gmail.com');

-- הוסף אותו כ-watcher למשימה קיימת
INSERT INTO task_watchers (task_id, person_id)
SELECT 
  (SELECT id FROM tasks LIMIT 1),
  (SELECT id FROM people WHERE email = 'your-email@gmail.com');

-- עכשיו סמן אבן דרך - צריך להגיע מייל!
```

## טיפים

- **להפעיל ידנית:** אם הטריגר לא עובד, ניתן לקרוא ל-Edge Function ידנית
- **לבדוק logs:** `supabase functions logs send-outbox-email`
- **לבדוק outbox:** `SELECT * FROM email_outbox ORDER BY created_at DESC;`
- **Gmail limits:** עד 500 מיילים ביום. לפרודקשן - עבור ל-SendGrid/Resend

## תמיכה

כל הקבצים כוללים הערות והסברים. למידע נוסף:
- קרא את `EMAIL_NOTIFICATIONS_SETUP.md`
- קרא את `supabase/functions/send-outbox-email/README.md`
- בדוק דוגמאות ב-schema.sql
