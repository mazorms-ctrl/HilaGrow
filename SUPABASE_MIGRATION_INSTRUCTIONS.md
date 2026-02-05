# Supabase Migration Instructions

## קודם כל - הרץ את ה-Migration

לפני שהאפליקציה תעבוד עם Supabase, צריך להריץ את המ migration שמוסיף את העמודות החדשות.

### אופציה 1: דרך Supabase Dashboard (מומלץ)

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר בפרויקט שלך
3. לחץ על **SQL Editor** בתפריט הצד
4. העתק והדבק את התוכן מהקובץ `supabase/migration_add_metadata.sql`
5. לחץ **Run** (F5)

### אופציה 2: דרך Supabase CLI

אם יש לך Supabase CLI מותקן:

```bash
supabase db push
```

## אם זה הפעם הראשונה

אם עדיין לא הרצת את ה-schema ו-seed:

1. הרץ את `schema.sql` ראשון
2. הרץ את `migration_add_metadata.sql`
3. הרץ את `seed.sql` לנתונים לדוגמה

## וידוא שהכל עובד

אחרי שהרצת את ה-migration, בדוק:

1. בטבלה `tasks` יש עמודה `metadata` מסוג JSONB
2. בטבלה `tasks` יש עמודה `priority` מסוג TEXT
3. האפליקציה צריכה להתחיל לעבוד עם Supabase!

## בעיות נפוצות

### שגיאה: "Missing Supabase environment variables"

ודא שבקובץ `.env` יש:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### שגיאה: "Permission denied"

בדוק ש-RLS policies מוגדרים נכון בטבלאות (ה-schema כבר כולל Allow all policies)
