# הקמת Backend עם Supabase

## שלבים

### 1. יצירת פרויקט Supabase

1. כנס ל-[https://supabase.com](https://supabase.com) והתחבר/הירשם
2. לחץ על "New Project"
3. בחר שם לפרויקט (למשל "grow-hospital")
4. בחר סיסמה חזקה לDB
5. בחר Region (מומלץ: `eu-central-1` לישראל)
6. לחץ "Create new project" והמתן כ-2 דקות

### 2. הפעלת Schema

1. בממשק Supabase, לך ל-"SQL Editor" בתפריט השמאלי
2. פתח את הקובץ `supabase/schema.sql` מהפרויקט
3. העתק את כל התוכן והדבק ב-SQL Editor
4. לחץ "Run" - אמור להיות הצלחה עם הודעה ירוקה
5. אחר כך פתח את `supabase/seed.sql`
6. העתק והרץ גם אותו ב-SQL Editor

### 3. קבלת ה-API Keys

1. לך ל-"Project Settings" (גלגל שיניים למטה בתפריט השמאלי)
2. לך ל-"API" בתפריט
3. העתק את הערכים הבאים:
   - **Project URL** (מתחת ל-"Project URL")
   - **anon public** key (מתחת ל-"Project API keys")

### 4. הגדרת Environment Variables

1. צור קובץ בשם `.env` בתיקיית הראשית של הפרויקט
2. הדבק את הערכים:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

3. החלף את `YOUR_PROJECT_ID` ו-`YOUR_ANON_KEY_HERE` בערכים שהעתקת

### 5. בדיקה

1. הפעל מחדש את שרת הפיתוח: `npm run dev`
2. פתח את האפליקציה בדפדפן
3. אם הכל תקין, אתה אמור לראות נתונים בתצוגה

## אבטחה (אופציונלי)

אם ברצונך להגביל גישת כתיבה:

1. ב-Supabase SQL Editor, מחק את ה-policies הקיימים:

```sql
DROP POLICY IF EXISTS "Allow all on projects" ON projects;
DROP POLICY IF EXISTS "Allow all on groups" ON groups;
DROP POLICY IF EXISTS "Allow all on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all on milestones" ON milestones;
```

2. צור policies חדשים שמאפשרים רק קריאה:

```sql
CREATE POLICY "Allow read on projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Allow read on groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow read on tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Allow read on milestones" ON milestones FOR SELECT USING (true);
```

3. צור Edge Function לכתיבה עם EditKey (מעבר למדריך זה)

## תמיכה

אם יש בעיות, בדוק:
- ש-RLS מופעל על כל הטבלאות
- שה-policies מתאימים
- שה-env vars נטענים (ניתן לראות ב-Network tab של Developer Tools)
