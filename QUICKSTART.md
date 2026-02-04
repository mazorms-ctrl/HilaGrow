# התחלה מהירה

המדריך הזה יעזור לך להעלות את מערכת GROW לאוויר במהירות.

## מצב נוכחי ✅

הפרויקט **מוכן לחלוטין** לפריסה:
- ✅ כל הקוד נכתב ובדיקה מקומית הושלמה
- ✅ Build הצליח (קבצים ב-`dist/`)
- ✅ נתוני דוגמה (mock data) פועלים מיד
- ✅ RTL ועברית מוגדרים
- ✅ כל 3 התצוגות מוכנות (משימות/לוח/דיאגרמה)
- ✅ עריכה מלאה עובדת

## אפשרות 1: צפייה מיידית (ללא Backend)

המערכת עובדת **מיד** עם נתוני דוגמה, גם בלי להגדיר Supabase.

```bash
# פתח את האתר המקומי
npm run dev
```

**לפתוח בדפדפן**: http://localhost:5174

### מה תראה:
- 9 משימות לדוגמה מחולקות ל-4 קטגוריות
- התקדמות + milestones לכל משימה
- כל 3 התצוגות פועלות
- ⚠️ עריכה **לא תישמר** (רק UI, בלי DB)

---

## אפשרות 2: העלאה לשרת שלך (ללא Backend)

אם רק רוצה לראות איך זה נראה על השרת:

### 1. העלה את dist/ לשרת

```bash
# dist/ מכיל:
├── index.html
├── vite.svg
└── assets/
    ├── index-BRf8sszR.js
    └── index-CfrgRxph.css
```

**העלה את כל התוכן של `dist/`** (לא את התיקייה עצמה!) לשרת שלך:
- FTP/SFTP → לתיקיית `public_html/`
- cPanel File Manager → Upload + Extract

### 2. פתח באינטרנט

נווט ל-`https://yourdomain.com` - המערכת תעבוד עם נתוני דוגמה.

⚠️ **ללא Backend, שינויים לא נשמרים בין sessions.**

---

## אפשרות 3: הגדרת Backend (מערכת מלאה) 🚀

כדי שעריכה באמת תעבוד ותישמר בין משתמשים ו-sessions:

### שלב 1: הקם Supabase

1. לך ל-[https://supabase.com](https://supabase.com) והתחבר
2. "New Project" → תן שם "grow-hospital" → בחר סיסמה → Region
3. המתן ~2 דקות לפרויקט להיות מוכן

### שלב 2: הרץ SQL

1. Supabase → "SQL Editor" (בצד שמאל)
2. פתח `supabase/schema.sql` מהפרויקט → העתק הכל
3. הדבק ב-SQL Editor → "Run"
4. אם הצליח, ירוק ✅
5. עכשיו פתח `supabase/seed.sql` → העתק והרץ גם אותו

### שלב 3: קבל API Keys

1. Supabase → "Project Settings" (גלגל שיניים למטה)
2. "API" בתפריט
3. העתק:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJ...` (המפתח הארוך)

### שלב 4: עדכן + Build מחדש

1. ערוך `.env` בפרויקט:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

2. Build מחדש:
   ```bash
   npm run build
   ```

3. `dist/` התעדכן עם הקונפיגורציה החדשה

### שלב 5: העלה לשרת שוב

העלה את `dist/` החדש (תחליף את הקודם).

### שלב 6: הגדר CORS ב-Supabase

1. Supabase → Settings → API → CORS Allowed Origins
2. הוסף:
   ```
   https://yourdomain.com
   ```
3. שמור

**עכשיו זה עובד לגמרי! 🎉**

---

## בעיות נפוצות

### האתר לא נטען
- ודא ש-`index.html` בשורש (לא בתיקייה נוספת)

### נתונים לא נטענים
- פתח F12 → Console → יש שגיאות CORS?
  - עדכן ב-Supabase Settings
- ודא שה-`.env` היה מוגדר **לפני** `npm run build`

### עריכה לא עובדת
- בדוק RLS Policies ב-Supabase (SQL Editor):
  ```sql
  SELECT * FROM pg_policies;
  ```
- ודא שיש `Allow all on tasks/milestones`

### צריך עזרה?
- ראה [README.md](./README.md) למידע מפורט
- ראה [DEPLOYMENT.md](./DEPLOYMENT.md) לפריסה מתקדמת
- ראה [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) לעזרה ב-DB

---

## סיכום מהיר

| מצב | איך | עובד? | שינויים נשמרים? |
|-----|-----|--------|-----------------|
| Local Dev | `npm run dev` | ✅ | ❌ |
| Static Deploy | העלה `dist/` | ✅ | ❌ |
| + Supabase | `.env` + build + deploy | ✅ | ✅ |

**לשאלות**: בדוק F12 Console לשגיאות.
