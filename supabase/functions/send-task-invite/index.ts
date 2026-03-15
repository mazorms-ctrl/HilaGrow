import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── SMTP helper ───────────────────────────────────────────────────────────────

async function sendEmailViaSMTP(to: string, subject: string, html: string): Promise<void> {
  const smtpUser     = Deno.env.get('GMAIL_SMTP_USER')!
  const smtpPassword = Deno.env.get('GMAIL_SMTP_APP_PASSWORD')!
  const fromEmail    = Deno.env.get('GMAIL_FROM') || smtpUser

  if (!smtpUser || !smtpPassword) {
    throw new Error('Missing SMTP credentials (GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD)')
  }

  const client = new SmtpClient()
  await client.connectTLS({ hostname: 'smtp.gmail.com', port: 465, username: smtpUser, password: smtpPassword })
  await client.send({ from: fromEmail, to, subject, content: html, html })
  await client.close()
}

// ── Email template ─────────────────────────────────────────────────────────────

function buildInviteEmail(opts: {
  invitedByName: string
  taskTitle: string
  signupUrl: string
}): { subject: string; html: string } {
  const { invitedByName, taskTitle, signupUrl } = opts

  const subject = `${invitedByName} הזמין אותך להצטרף למשימה ב-GROW+`

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f4f6fb;
      direction: rtl;
    }
    .wrap   { max-width: 600px; margin: 32px auto; background: #ffffff;
              border-radius: 16px; overflow: hidden;
              box-shadow: 0 4px 24px rgba(37,99,235,0.08); }
    .header { background: linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#6366f1 100%);
              padding: 36px 40px 28px; color: #fff; }
    .brand  { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .grow-word { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; }
    .grow-tag  { font-size: 12px; opacity: 0.75; }
    .hila-badge { font-size: 11px; background: rgba(255,255,255,0.18);
                  padding: 4px 12px; border-radius: 20px; opacity: 0.9; }
    .header h1 { font-size: 22px; font-weight: 800; line-height: 1.35; }
    .header p  { font-size: 13.5px; opacity: 0.82; margin-top: 6px; }
    .body   { padding: 32px 40px; }
    .greeting { font-size: 15px; color: #334155; line-height: 1.7; margin-bottom: 20px; }
    .task-card {
      background: #f0f4ff;
      border: 1px solid #c7d2fe;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 28px;
      border-right: 4px solid #6366f1;
    }
    .task-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
                  text-transform: uppercase; color: #818cf8; margin-bottom: 6px; }
    .task-title { font-size: 17px; font-weight: 800; color: #1e293b; line-height: 1.4; }
    .cta-wrap   { text-align: center; margin-bottom: 28px; }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg,#2563eb,#6366f1);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 36px;
      border-radius: 999px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.2px;
      box-shadow: 0 6px 20px rgba(37,99,235,0.35);
    }
    .note {
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.6;
      margin-top: 8px;
    }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="wrap">

    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div>
          <div class="grow-word">GROW<span style="color:#818cf8;">+</span></div>
          <div class="grow-tag">יוצרים שינוי</div>
        </div>
        <div style="width:1px;height:36px;background:rgba(255,255,255,0.3);margin:0 4px;"></div>
        <div class="hila-badge">Hillel Yaffe Medical Center</div>
      </div>
      <h1>הוזמנת להצטרף למשימה</h1>
      <p>${invitedByName} הזמין אותך להיות חלק מהצוות</p>
    </div>

    <!-- Body -->
    <div class="body">
      <div class="greeting">
        שלום,<br><br>
        <strong>${invitedByName}</strong> הזמין אותך להצטרף ולשתף פעולה במסגרת מערכת <strong>GROW+</strong>
        — פלטפורמת ניהול שיפור תהליכים של בית החולים הלל יפה.
      </div>

      <div class="task-card">
        <div class="task-label">המשימה שאליה הוזמנת</div>
        <div class="task-title">${taskTitle}</div>
      </div>

      <div class="cta-wrap">
        <a href="${signupUrl}" class="cta-btn">
          הצטרף ל-GROW+ עכשיו &rarr;
        </a>
        <div class="note">
          הלחיצה תפתח טופס הרשמה מהיר.<br>
          לאחר ההרשמה תתווסף אוטומטית למשימה.
        </div>
      </div>

      <hr class="divider">

      <div class="footer">
        אם לא ציפית להזמנה זו ניתן להתעלם ממנה.<br>
        הקישור תקף ל-7 ימים מרגע השליחה.<br><br>
        <strong>GROW+</strong> — Hillel Yaffe Medical Center<br>
        מערכת לניהול שיפור תהליכים ויצירת שינוי
      </div>
    </div>

  </div>
</body>
</html>`

  return { subject, html }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl             = Deno.env.get('APP_PUBLIC_URL') || 'https://grow-app.vercel.app'

    const { task_id, email, task_title, invited_by_name } = await req.json() as {
      task_id:        string
      email:          string
      task_title:     string
      invited_by_name?: string
    }

    if (!task_id || !email || !task_title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: task_id, email, task_title' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const inviterName = invited_by_name || 'ד"ר שי שבו'

    // ── Insert invitation row — DB generates the token UUID ──────────────────
    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/invitations`,
      {
        method: 'POST',
        headers: {
          apikey:          supabaseServiceKey,
          Authorization:   `Bearer ${supabaseServiceKey}`,
          'Content-Type':  'application/json',
          Prefer:          'return=representation',
        },
        body: JSON.stringify({
          task_id,
          email: email.toLowerCase().trim(),
          invited_by_name: inviterName,
        }),
      }
    )

    if (!insertRes.ok) {
      const errText = await insertRes.text()
      throw new Error(`DB insert failed: ${errText}`)
    }

    const [invitation] = await insertRes.json() as Array<{ token: string }>
    const token = invitation.token

    // ── Build signup URL with token ──────────────────────────────────────────
    const signupUrl = `${appUrl}/signup?token=${token}`

    // ── Send invitation email ────────────────────────────────────────────────
    const { subject, html } = buildInviteEmail({
      invitedByName: inviterName,
      taskTitle:     task_title,
      signupUrl,
    })

    await sendEmailViaSMTP(email, subject, html)

    console.log(`[invite] Sent to ${email} for task ${task_id} | token: ${token}`)

    return new Response(
      JSON.stringify({ success: true, token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[invite] Error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
