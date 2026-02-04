# פתרון בעיית העמוד הלבן 🔧

## הבעיה
האתר ב-http://localhost:5173/Grow מציג עמוד לבן.

## הסיבות האפשריות

### 1. השרת לא רץ ✗
אם השרת לא רץ, תקבל עמוד לבן או שגיאת חיבור.

### 2. בעיית נתיב (Base Path) 🛤️
ה-vite.config.ts היה מוגדר ל-`/Grow/` (GitHub Pages).
**תוקן!** עכשיו הוא משתמש ב-`/` בסביבת פיתוח.

### 3. שגיאת JavaScript ⚠️
אם יש שגיאה בקוד, תקבל עמוד לבן.

## הפתרון - שלב אחר שלב

### אופציה 1: CMD (מומלץ)
1. לחץ פעמיים על הקובץ `start-dev.cmd` בתיקיית הפרויקט
2. המתן שהשרת יעלה
3. פתח דפדפן ב-`http://localhost:5173`

### אופציה 2: PowerShell (דורש הרשאות)
אם אתה רוצה להשתמש ב-PowerShell, צריך לאפשר הרצת סקריפטים:

```powershell
# הרץ PowerShell כמנהל (Run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# ואז במסוף רגיל:
npm run dev
```

### אופציה 3: VSCode/Cursor Terminal
1. פתח Terminal חדש ב-Cursor/VSCode
2. בחר **Command Prompt** או **Git Bash** (לא PowerShell)
3. הרץ:
```bash
npm run dev
```

### אופציה 4: Git Bash
אם יש לך Git Bash מותקן:
```bash
npm run dev
```

## אחרי שהשרת רץ

### ✅ כתובות נכונות:
- `http://localhost:5173/` - **זה הנכון!**
- `http://localhost:5173/Grow/` - **גם זה יעבוד עכשיו**

### ❌ כתובות שגויות:
- `http://localhost:5173/Grow` (בלי / בסוף) - עלול לגרום לבעיות

## בדיקת שגיאות

אם העמוד עדיין לבן, פתח Developer Console:

1. **לחץ F12** (או Ctrl+Shift+I)
2. עבור ללשונית **Console**
3. חפש הודעות שגיאה אדומות
4. העתק את השגיאה ושלח לי

### שגיאות נפוצות ופתרונות:

#### "Cannot find module"
```bash
npm install
```

#### "Failed to fetch"
השרת לא רץ - הרץ `npm run dev`

#### "Unexpected token"
בעיית קומפילציה - הרץ:
```bash
npm run build
```

## ווידוא שהשרת רץ

כשהשרת רץ תראה משהו כזה:
```
  VITE v7.2.4  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

אם אתה רואה את זה - השרת רץ! ✅

## אם עדיין לא עובד

תבדוק:
1. **יציאה תפוסה?** - אולי יש שרת אחר שרץ על פורט 5173
   - סגור אותו או שנה פורט
2. **Node.js מותקן?** - הרץ `node --version`
3. **Dependencies מותקנות?** - הרץ `npm install`

## בדיקה מהירה

לאחר שהשרת עולה:
1. פתח `http://localhost:5173`
2. תראה את האתר עם הכותרת "GROW - מחזור ב מובילים שינוי"
3. תראה את האינדיקטור "שמירה אוטומטית מופעלת" בכותרת
4. תראה משימות ברשימה

**אם תראה את זה - הכל עובד! 🎉**

## עדיין יש בעיה?

הודע לי ואני אעזור. שלח:
1. את תוכן ה-Console (F12)
2. צילום מסך של העמוד הלבן
3. האם השרת רץ או לא
