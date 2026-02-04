# הוראות פריסה

מדריך פריסת מערכת GROW על שרת סטטי.

## שלבים

### 1. בניית הפרויקט

```bash
# ודא ש-.env מוגדר עם פרטי Supabase
# (ראה SUPABASE_SETUP.md)

# בנה את הפרויקט
npm run build

# התוצאה נמצאת בתיקיית dist/
```

### 2. הכנת הקבצים להעלאה

קבצי ה-production נמצאים ב-`dist/` ומכילים:
- `index.html` - עמוד ראשי
- `assets/` - JS, CSS, תמונות
- כל שאר הקבצים הסטטיים

### 3. העלאה לשרת האחסון

#### אם יש לך FTP/SFTP:

1. התחבר לשרת דרך FileZilla או WinSCP
2. נווט לתיקיית השורש של האתר (לרוב `public_html/` או `www/`)
3. העלה את **כל התוכן** מתוך `dist/` (לא את התיקייה עצמה!)
4. ודא שהקבצים נמצאים בשורש, כך ש-`index.html` יהיה ישירות ב-`public_html/index.html`

#### אם יש לך פאנל ניהול (cPanel/Plesk):

1. היכנס לפאנל
2. עבור ל-"File Manager"
3. מחק את כל התוכן הקיים ב-`public_html/`
4. העלה zip של תיקיית `dist/`
5. פתח את הקובץ בשרת
6. או: העלה קובץ אחר קובץ את התוכן של `dist/`

### 4. הגדרת Routing (אופציונלי אבל מומלץ)

מכיוון שזה Single Page Application (SPA), צריך להגדיר שכל הנתיבים יחזירו את `index.html`.

#### Apache (.htaccess)

צור קובץ `.htaccess` בשורש:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### Nginx

אם יש לך גישה לקובץ config:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### 5. אימות CORS מול Supabase

1. עבור לפרויקט Supabase
2. לך ל-Settings → API → CORS Allowed Origins
3. הוסף את כתובת האתר שלך:
   ```
   https://yourdomain.com
   ```
4. שמור

### 6. בדיקה

1. פתח את האתר בדפדפן: `https://yourdomain.com`
2. ודא שהנתונים נטענים (אם מוגדר Supabase)
3. נסה לעבור בין התצוגות (משימות/לוח/דיאגרמה)
4. בדוק שעריכה עובדת (פתח Drawer, שנה ערכים)

## פתרון בעיות נפוצות

### האתר לא נטען / "404"

- ודא ש-`index.html` נמצא בשורש הנכון
- בדוק שהשרת מגיש קבצים סטטיים
- אם יש תיקייה בנתיב (למשל `/grow/`), עדכן את `base` ב-`vite.config.ts`

### נתונים לא נטענים

- פתח Developer Tools (F12) → Console
- בדוק אם יש שגיאות CORS
- ודא ש-`.env` הוגדר נכון לפני build
- אם יש שגיאת CORS, עדכן ב-Supabase Settings

### עריכה לא עובדת

- בדוק את ה-RLS Policies ב-Supabase
- ודא שה-`anon` key נכון
- בדוק Network tab אם יש שגיאות 403/401

### העיצוב נראה שבור

- ודא שכל תיקיית `assets/` הועלתה
- בדוק שאין שגיאות 404 ב-Network tab
- נקה cache: Ctrl+Shift+R

## אבטחה

### EditKey (מומלץ!)

אם ברצונך להגביל גישת כתיבה:

1. הוסף ל-`.env` לפני build:
   ```
   VITE_EDIT_KEY=your_secret_password_here
   ```
2. בנה מחדש: `npm run build`
3. בקוד, כל write operation תצטרך לשלוח את ה-key
4. או: השתמש ב-Supabase Edge Functions לאימות

### IP Allowlist

אם האתר פנימי בלבד:
- השתמש ב-Cloudflare Access Rules
- או הגבל ברמת השרת (Apache/Nginx)

## עדכונים עתידיים

כשאתה משנה קוד:

1. עשה את השינויים
2. `npm run build`
3. העלה את `dist/` החדש לשרת (תחליף את הקיים)
4. נקה cache: Ctrl+F5

## גיבויים

- גבה את בסיס הנתונים ב-Supabase באופן קבוע
- שמור עותק של הקוד ב-Git
- שמור עותק של `.env` במקום בטוח (לא ב-Git!)

---

במידה ויש בעיות, פתח Developer Tools (F12) ושלח צילום מסך של השגיאות ב-Console.
