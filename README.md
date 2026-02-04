# GROW - מחזור ב מובילים שינוי

מערכת ניהול פרויקט בעברית (RTL) בסגנון Monday.com, בנויה במיוחד עבור פרויקט GROW בבית החולים.

## תכונות עיקריות

- ✅ **תצוגת משימות (Cards)** - כרטיסים רוחבים עם התקדמות, milestones, אחראי ותיאור
- ✅ **תצוגת לוח (Board)** - טבלה מלאה עם כל המידע במבט אחד
- ✅ **דיאגרמת עץ (Tree)** - תצוגה ויזואלית של המבנה ההיררכי
- ✅ **Side Drawer** - עריכה מלאה של משימות ומיילסטונים
- ✅ **חיפוש וסינון** - מציאת משימות במהירות
- ✅ **מדידת התקדמות** - חישוב אוטומטי לפי milestones שהושלמו
- ✅ **RTL מלא** - עברית מהקצה לקצה
- ✅ **עיצוב מקצועי** - צבעים רכים, טיפוגרפיה מודרנית, חוויית משתמש מעולה

## טכנולוגיות

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS 3 + עיצוב מותאם
- **State**: Zustand + React Query
- **Data Viz**: React Flow (דיאגרמת עץ)
- **Backend**: Supabase (Postgres + API)

## התקנה מקומית

```bash
# התקנת dependencies
npm install

# הפעלת dev server
npm run dev

# בניית production
npm run build
```

## הגדרת Backend

1. עקוב אחר ההוראות ב-[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. צור קובץ `.env` עם:
   ```
   VITE_SUPABASE_URL=your_url_here
   VITE_SUPABASE_ANON_KEY=your_key_here
   ```
3. הפעל מחדש את השרת

## פריסה לאינטרנט

ראה [DEPLOYMENT.md](./DEPLOYMENT.md) להוראות מפורטות.

### קבצים חשובים

- `/supabase/schema.sql` - סכמת בסיס הנתונים
- `/supabase/seed.sql` - נתוני דוגמה
- `/dist/` - קבצים סטטיים מוכנים לפריסה (אחרי build)

## מבנה הפרויקט

```
src/
├── components/         # קומפוננטות React
│   ├── ui/            # קומפוננטות בסיס (Button, Card, וכו')
│   ├── tasks/         # תצוגת משימות + Drawer
│   ├── board/         # תצוגת לוח
│   └── tree/          # דיאגרמת עץ
├── hooks/             # React Query hooks
├── store/             # Zustand stores
├── lib/               # Utilities + Supabase client
├── types/             # TypeScript types
└── App.tsx            # Main app component
```

## שימוש

### תצוגת משימות
- גלול אופקית לראות כרטיסים לפי קטגוריה
- לחץ על כרטיס לפתיחת עריכה
- השתמש בחיפוש למציאת משימות מהירה

### תצוגת לוח
- טבלה מסודרת עם כל המידע
- מיון לפי קטגוריה, התקדמות או אחראי
- לחץ על עין 👁 לעריכה מלאה

### דיאגרמת עץ
- תצוגה גרפית של כל המבנה
- לחץ על משימה לעריכה
- זום והזז עם העכבר

### עריכת משימה
- שנה כותרת, תיאור, אחראי
- הוסף/סמן/מחק milestones
- התקדמות מתעדכנת אוטומטית

## רישיון

© 2024 GROW Project. כל הזכויות שמורות.
