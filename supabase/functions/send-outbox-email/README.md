# Send Outbox Email Function

פונקציית Edge לשליחת מיילים דרך Gmail SMTP כאשר אבן דרך מסומנת כהושלמה.

## הגדרת משתני סביבה ב-Supabase

יש להגדיר את המשתנים הבאים ב-Supabase Dashboard (Settings → Edge Functions → Secrets):

```bash
GMAIL_SMTP_USER=your-email@gmail.com
GMAIL_SMTP_APP_PASSWORD=your-app-password
GMAIL_FROM=your-email@gmail.com  # אופציונלי, ברירת מחדל: GMAIL_SMTP_USER
APP_PUBLIC_URL=https://your-app.com  # אופציונלי, ברירת מחדל: http://localhost:5173
```

### יצירת App Password ב-Gmail

1. עבור ל-[Google Account Security](https://myaccount.google.com/security)
2. הפעל "2-Step Verification" אם טרם הפעלת
3. חפש "App passwords"
4. צור סיסמה חדשה עבור "Mail"
5. העתק את הסיסמה (16 תווים) והשתמש בה כ-`GMAIL_SMTP_APP_PASSWORD`

## פריסה (Deploy)

```bash
# התקנת Supabase CLI (אם לא מותקן)
npm install -g supabase

# התחברות לפרויקט
supabase login
supabase link --project-ref your-project-ref

# פריסת הפונקציה
supabase functions deploy send-outbox-email

# הגדרת משתני סביבה
supabase secrets set GMAIL_SMTP_USER=your-email@gmail.com
supabase secrets set GMAIL_SMTP_APP_PASSWORD=your-app-password
supabase secrets set GMAIL_FROM=your-email@gmail.com
supabase secrets set APP_PUBLIC_URL=https://your-app.com
```

## בדיקה מקומית

```bash
# הרצה מקומית
supabase functions serve send-outbox-email --env-file .env.local

# שליחת בקשה לבדיקה
curl -X POST http://localhost:54321/functions/v1/send-outbox-email \
  -H "Content-Type: application/json" \
  -d '{"outbox_id": "your-outbox-uuid"}'
```

## קריאה לפונקציה

הפונקציה נקראת אוטומטית על ידי הטריגר בבסיס הנתונים, אבל ניתן גם לקרוא לה ידנית:

```typescript
const { data, error } = await supabase.functions.invoke('send-outbox-email', {
  body: { outbox_id: 'uuid-here' }
});
```

## טיפול בשגיאות

- אם השליחה נכשלת, הסטטוס ב-`email_outbox` יעודכן ל-`failed` והשגיאה תרשם ב-`error`.
- ניתן לנסות שוב על ידי קריאה נוספת לפונקציה עם אותו `outbox_id`.
