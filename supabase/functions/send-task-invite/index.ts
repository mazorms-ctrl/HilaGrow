import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encode as encodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RFC 2047 base64 encoded-word — only used in headers (Subject, From name)
function rfc2047(str: string): string {
  return `=?UTF-8?B?${encodeBase64(new TextEncoder().encode(str))}?=`
}

// ── Minimal HTML email template ───────────────────────────────────────────────

function buildHtml(inviterName: string, taskTitle: string, signupUrl: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb,#6366f1);padding:32px 40px;text-align:right;">
        <div style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px;">
          GROW<span style="color:#818cf8;">+</span>
          <span style="font-size:12px;font-weight:400;background:rgba(255,255,255,0.18);padding:3px 10px;border-radius:20px;margin-right:10px;vertical-align:middle;">Hillel Yaffe Medical Center</span>
        </div>
        <div style="color:rgba(255,255,255,0.85);font-size:15px;">הוזמנת להצטרף למשימה</div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:36px 40px;text-align:right;">

        <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.8;">
          שלום,<br>
          <strong>${inviterName}</strong> הזמין אותך להצטרף למשימה הבאה ב-GROW+:
        </p>

        <!-- Task card -->
        <div style="background:#f0f4ff;border-right:4px solid #6366f1;border-radius:10px;padding:18px 22px;margin-bottom:32px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#818cf8;margin-bottom:8px;">משימה</div>
          <div style="font-size:20px;font-weight:800;color:#1e293b;line-height:1.4;">${taskTitle}</div>
        </div>

        <!-- CTA button -->
        <div style="text-align:center;margin-bottom:28px;">
          <a href="${signupUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#2563eb,#6366f1);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:999px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
            הצטרפות למשימה &rarr;
          </a>
          <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">
            לאחר ההרשמה תתווסף אוטומטית למשימה
          </p>
        </div>

        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

        <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.8;">
          אם לא ציפית להזמנה זו, ניתן להתעלם ממנה.<br>
          הקישור תקף ל-7 ימים.<br><br>
          <strong>GROW+</strong> &mdash; Hillel Yaffe Medical Center
        </p>

      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
}

// ── Raw SMTP over TLS — 8bit transfer (no encoding, plain UTF-8) ──────────────

async function sendEmail(opts: {
  smtpUser: string
  smtpPass: string
  to:       string
  subject:  string
  html:     string
}): Promise<void> {
  const { smtpUser, smtpPass, to, subject, html } = opts
  const fromAddr = Deno.env.get('GMAIL_FROM') || smtpUser

  // Build a single-part text/html MIME message, 8bit transfer (raw UTF-8)
  const message = [
    `From: ${rfc2047('GROW+ Hillel Yaffe')} <${fromAddr}>`,
    `To: ${to}`,
    `Subject: ${rfc2047(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    html,
  ].join('\r\n')

  const enc = new TextEncoder()
  const dec = new TextDecoder()

  console.log('[smtp] opening TLS connection to smtp.gmail.com:465')
  const conn = await Deno.connectTls({ hostname: 'smtp.gmail.com', port: 465 })

  // Read until a final SMTP response line (NNN<space>text)
  async function recv(): Promise<string> {
    const chunks: string[] = []
    const buf = new Uint8Array(512)
    while (true) {
      const n = await conn.read(buf)
      if (!n) break
      chunks.push(dec.decode(buf.subarray(0, n)))
      const full = chunks.join('')
      // Final response line ends with "NNN " (space, not dash)
      if (/^\d{3} .*\r\n/m.test(full)) {
        console.log('[smtp] <', full.trim().slice(-60))
        return full
      }
    }
    return chunks.join('')
  }

  async function cmd(line: string): Promise<string> {
    console.log('[smtp] >', line.slice(0, 30))
    await conn.write(enc.encode(line + '\r\n'))
    return recv()
  }

  try {
    await recv()                                        // 220 smtp.gmail.com ready

    await cmd('EHLO grow-plus')                         // 250 capabilities
    await cmd('AUTH LOGIN')                             // 334 username prompt
    await cmd(encodeBase64(enc.encode(smtpUser)))       // 334 password prompt
    const auth = await cmd(encodeBase64(enc.encode(smtpPass)))
    if (!auth.includes('235')) throw new Error(`AUTH failed: ${auth.trim()}`)
    console.log('[smtp] authenticated ✅')

    await cmd(`MAIL FROM:<${fromAddr}> BODY=8BITMIME`)  // 250
    await cmd(`RCPT TO:<${to}>`)                        // 250

    const d354 = await cmd('DATA')                      // 354 start input
    if (!d354.includes('354')) throw new Error(`DATA rejected: ${d354.trim()}`)

    // Send message body + lone-dot terminator
    await conn.write(enc.encode(message + '\r\n.\r\n'))
    const ok = await recv()                             // 250 message accepted
    if (!ok.includes('250')) throw new Error(`Message rejected: ${ok.trim()}`)
    console.log('[smtp] message accepted ✅')

    await cmd('QUIT')
  } finally {
    try { conn.close() } catch { /* ignore */ }
  }
}

// ── Supabase Edge Function handler ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const smtpUser = Deno.env.get('GMAIL_SMTP_USER')
    const smtpPass = Deno.env.get('GMAIL_SMTP_APP_PASSWORD')

    if (!smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ error: 'Missing GMAIL_SMTP_USER or GMAIL_SMTP_APP_PASSWORD secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { to, task_title, invited_by_name, signup_url } = await req.json() as {
      to:               string
      task_title:       string
      invited_by_name?: string
      signup_url:       string
    }

    if (!to || !task_title || !signup_url) {
      return new Response(
        JSON.stringify({ error: 'Missing fields: to, task_title, signup_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const inviterName = invited_by_name || 'GROW+ Hillel Yaffe'
    const subject     = 'הזמנה להצטרפות למשימה ב-GROW+'
    const html        = buildHtml(inviterName, task_title, signup_url)

    await sendEmail({ smtpUser, smtpPass, to, subject, html })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[invite] ❌', msg)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
