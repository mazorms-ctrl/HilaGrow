# הגדרת התראות מייל למשימות GROW

מסמך זה מסביר כיצד להפעיל את מערכת ההתראות האוטומטיות במייל כשאבן דרך מסומנת כהושלמה.

## מה נוסף

1. **טבלאות חדשות בבסיס הנתונים:**
   - `people` - רשימת אנשי קשר עם שמות ומיילים
   - `task_watchers` - חיבור בין משימות לאנשים שרוצים להתריע
   - `email_outbox` - תור מיילים לשליחה (לרילייאביליטי)

2. **טריגר אוטומטי:** כאשר אבן דרך מסומנת כ-done=true, נוצרת רשומה ב-`email_outbox`

3. **Edge Function:** `send-outbox-email` ששולח מיילים דרך Gmail SMTP

4. **UI חדש ב-TaskDrawer:** אפשרות להוסיף watchers ואנשי קשר

## שלב 1: עדכון בסיס הנתונים ב-Supabase

### אופציה א': דרך Supabase Dashboard

1. היכנס ל-Supabase Dashboard של הפרויקט שלך
2. עבור ל-SQL Editor
3. הרץ את הסקריפט `supabase/schema.sql` (העתק והדבק)
4. ודא שהטבלאות נוצרו: people, task_watchers, email_outbox

### אופציה ב': דרך Supabase CLI (מומלץ)

```bash
# התקנת Supabase CLI (אם לא מותקן)
npm install -g supabase

# התחברות לפרויקט
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# הרצת המיגרציה
supabase db push
```

## שלב 2: יצירת אנשי קשר (People)

ניתן להוסיף אנשי קשר ישירות דרך ה-UI או דרך SQL:

```sql
-- דוגמה להוספת אנשי קשר
INSERT INTO people (name, email) VALUES
  ('ד״ר כהן', 'dr.cohen@example.com'),
  ('רחל לוי', 'rachel.levi@example.com'),
  ('נועה כהן', 'noa.cohen@example.com');
```

## שלב 3: הגדרת Gmail App Password

1. עבור ל-[Google Account Security](https://myaccount.google.com/security)
2. הפעל **2-Step Verification** (אם טרם הפעלת)
3. חפש **"App passwords"** או גש ל-https://myaccount.google.com/apppasswords
4. בחר "Mail" ו-"Other" (Custom name)
5. תן שם: "GROW Notifications"
6. לחץ "Generate"
7. העתק את הסיסמה (16 תווים ללא רווחים)

## שלב 4: פריסת Edge Function

```bash
# פריסת הפונקציה
supabase functions deploy send-outbox-email

# הגדרת משתני סביבה (Secrets)
supabase secrets set GMAIL_SMTP_USER=your-email@gmail.com
supabase secrets set GMAIL_SMTP_APP_PASSWORD=your-16-char-password
supabase secrets set GMAIL_FROM=your-email@gmail.com
supabase secrets set APP_PUBLIC_URL=https://your-app-url.com
```

### בדיקת הפונקציה

```bash
# בדיקה מקומית (אופציונלי)
supabase functions serve send-outbox-email

# קריאה לפונקציה (דרך Dashboard או curl)
curl -X POST https://your-project-ref.supabase.co/functions/v1/send-outbox-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"outbox_id": "some-uuid"}'
```

## שלב 5: עדכון משתני סביבה באפליקציה

עדכן את `.env` (או `.env.local`):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## שלב 6: שימוש במערכת

1. **הוספת אנשי קשר:**
   - פתח משימה (לחץ על משימה ברשימה)
   - בחלק "התראות במייל", לחץ "הוסף איש קשר"
   - הזן שם ומייל
   
2. **הגדרת Watchers:**
   - אנשי קשר שכבר קיימים ברשימה יופיעו עם checkbox
   - סמן את מי שרוצה לקבל התראות על המשימה
   - האחראי על המשימה (ownerName) יקבל אוטומטית אם יש לו מייל ב-people

3. **סימון אבן דרך כהושלמה:**
   - לחץ על העיגול ליד אבן דרך
   - אבן הדרך תסומן כהושלמה
   - **אוטומטית** יישלח מייל לכל ה-watchers + אחראי

## בדיקה ש-התראות עובדות

1. הוסף איש קשר עם המייל שלך
2. הוסף אותו כ-watcher למשימה
3. סמן אבן דרך כהושלמה
4. בדוק:
   - `email_outbox` - צריכה להיות רשומה חדשה עם status='pending'
   - אחרי כ-1-2 דקות הסטטוס צריך להשתנות ל-'sent'
   - בדוק את המייל שלך

## פתרון בעיות נפוצות

### לא מגיעים מיילים

1. **בדוק את email_outbox:**
   ```sql
   SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 10;
   ```
   
2. **בדוק status:**
   - `pending` - עדיין לא נשלח (ייתכן שה-function לא רצה)
   - `sent` - נשלח בהצלחה
   - `failed` - נכשל, בדוק את השדה `error`

3. **בדוק את הפונקציה:**
   ```bash
   supabase functions logs send-outbox-email
   ```

4. **בדוק Gmail App Password:**
   - ודא שהסיסמה נכונה (16 תווים)
   - ודא ש-2FA מופעל

### הטריגר לא עובד

```sql
-- בדוק שהטריגר קיים
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'milestones';

-- צפה בפעילות הטריגר
SELECT * FROM email_outbox WHERE created_at > NOW() - INTERVAL '1 hour';
```

### הפונקציה נכשלת

```bash
# בדוק logs
supabase functions logs send-outbox-email --tail

# בדוק שמשתני הסביבה מוגדרים
supabase secrets list
```

## קריאה ידנית לפונקציה (אם הטריגר לא עובד)

אם הטריגר לא מופעל אוטומטית, ניתן לקרוא לפונקציה ידנית:

```typescript
// בקוד הצד-לקוח (אחרי updateMilestone)
if (updates.done === true) {
  // קריאה לפונקציה
  const { data: outboxRecords } = await supabase
    .from('email_outbox')
    .select('id')
    .eq('milestone_id', milestoneId)
    .eq('status', 'pending')
    .limit(1);
    
  if (outboxRecords && outboxRecords.length > 0) {
    await supabase.functions.invoke('send-outbox-email', {
      body: { outbox_id: outboxRecords[0].id }
    });
  }
}
```

## מעבר ל-Production

1. **החלף Gmail ב-SendGrid/Resend (מומלץ):**
   - Gmail מגביל ל-500 מיילים ביום
   - SendGrid/Resend מתאימים יותר לייצור

2. **הוסף Retry Mechanism:**
   - Cron job שבודק `email_outbox` כל X דקות
   - מנסה מחדש רשומות failed/pending

3. **הוסף Authentication:**
   - עדכן RLS policies
   - אפשר רק למשתמשים מחוברים לראות/לערוך

## תמיכה נוספת

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- קובץ README של הפונקציה: `supabase/functions/send-outbox-email/README.md`
