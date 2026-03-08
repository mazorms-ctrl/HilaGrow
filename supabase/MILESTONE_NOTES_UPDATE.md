# עדכון: הערות למיילסטונים

## מה השתנה?

הוספנו אפשרות לכתוב הערות/פירוט על כל אבן דרך (milestone).

## שינויים טכניים

### 1. בסיס הנתונים (Supabase)

נוסף עמודה חדשה `note` לטבלת `milestones`:
- **טיפוס**: `TEXT` (אופציונלי)
- **תיאור**: הערה או פירוט על אבן הדרך

### 2. ממשק משתמש (UI)

- **הוספת הערה**: לחיצה על "הוסף הערה" מתחת לכל אבן דרך
- **עריכת הערה**: לחיצה על ההערה הקיימת
- **הצגת הערה**: הערה מוצגת ברקע אפור מתחת לכותרת אבן הדרך

## איך להריץ את העדכון?

### אופציה 1: דרך Supabase Dashboard (מומלץ)

1. היכנס ל-Supabase Dashboard: https://supabase.com/dashboard
2. בחר בפרויקט שלך
3. לך ל-**SQL Editor**
4. הרץ את הפקודה הבאה:

```sql
-- Add note column to milestones table
ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add comment for documentation
COMMENT ON COLUMN milestones.note IS 'Optional note or description for the milestone';
```

5. לחץ על **Run** או **Execute**

### אופציה 2: דרך Supabase CLI

אם יש לך Supabase CLI מותקן:

```bash
# מתיקיית הפרויקט
cd supabase
supabase migration create add_milestone_note

# העתק את התוכן מ-migrations/add_milestone_note.sql

# הרץ את ה-migration
supabase db push
```

## בדיקה

אחרי הרצת ה-migration:

1. רענן את האפליקציה (`npm run dev`)
2. פתח משימה כלשהי
3. לחץ על "הוסף הערה" מתחת לאבן דרך
4. כתוב הערה ושמור
5. ההערה צריכה להישמר ולהיות נראית

## Rollback (במקרה של בעיה)

אם אתה צריך לבטל את העדכון:

```sql
ALTER TABLE milestones DROP COLUMN IF EXISTS note;
```

## שאלות ותשובות

**ש: האם ההערות חובה?**  
ת: לא, זה שדה אופציונלי. אפשר להשאיר ריק.

**ש: האם ההערות הקיימות נשמרות?**  
ת: כן, אבני דרך קיימות ימשיכו לעבוד כרגיל. הערות ריקות כברירת מחדל.

**ש: האם יש הגבלת אורך?**  
ת: לא, שדה TEXT יכול להכיל טקסט ארוך מאוד.

**ש: האם אפשר למחוק הערה?**  
ת: כן, פתח את עריכת ההערה, מחק את התוכן ושמור.
