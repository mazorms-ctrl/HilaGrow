import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailOutboxRecord {
  id: string;
  event_type: string;
  task_id: string | null;
  milestone_id: string | null;
  recipients: string[];
  payload: {
    milestone_title: string;
    task_title: string;
    task_id: string;
    milestone_id: string;
    completed_at: string;
  };
}

async function sendEmailViaSMTP(
  to: string[],
  subject: string,
  body: string
): Promise<void> {
  const smtpUser = Deno.env.get('GMAIL_SMTP_USER');
  const smtpPassword = Deno.env.get('GMAIL_SMTP_APP_PASSWORD');
  const fromEmail = Deno.env.get('GMAIL_FROM') || smtpUser;

  if (!smtpUser || !smtpPassword) {
    throw new Error('Missing SMTP credentials. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD.');
  }

  const client = new SmtpClient();

  await client.connectTLS({
    hostname: "smtp.gmail.com",
    port: 465,
    username: smtpUser,
    password: smtpPassword,
  });

  for (const recipient of to) {
    await client.send({
      from: fromEmail!,
      to: recipient,
      subject: subject,
      content: body,
      html: body, // Support HTML
    });
  }

  await client.close();
}

function buildEmailContent(record: EmailOutboxRecord): { subject: string; body: string } {
  const { milestone_title, task_title } = record.payload;
  const appUrl = Deno.env.get('APP_PUBLIC_URL') || 'http://localhost:5173';

  const subject = `✅ אבן דרך הושלמה: ${milestone_title}`;
  
  const body = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
        .container { background: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .icon { font-size: 48px; margin-bottom: 10px; }
        h1 { margin: 0; font-size: 24px; }
        .milestone-title { font-size: 20px; font-weight: bold; color: #0ea5e9; margin: 15px 0; }
        .task-info { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-right: 4px solid #0ea5e9; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #737373; font-size: 14px; }
        .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">✅</div>
          <h1>אבן דרך הושלמה</h1>
        </div>
        
        <p>שלום,</p>
        
        <p>אבן הדרך הבאה סומנה כהושלמה במערכת GROW:</p>
        
        <div class="milestone-title">${milestone_title}</div>
        
        <div class="task-info">
          <strong>משימה:</strong> ${task_title}
        </div>
        
        <a href="${appUrl}" class="button">עבור למערכת GROW</a>
        
        <div class="footer">
          <p>הודעה זו נשלחה אוטומטית ממערכת GROW - ניהול שיפור תהליכים.</p>
          <p>לא צריך להשיב להודעה זו.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, body };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { outbox_id } = await req.json();

    if (!outbox_id) {
      throw new Error('Missing outbox_id parameter');
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch the outbox record
    const response = await fetch(`${supabaseUrl}/rest/v1/email_outbox?id=eq.${outbox_id}`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    });

    const records: EmailOutboxRecord[] = await response.json();
    
    if (!records || records.length === 0) {
      throw new Error(`Outbox record ${outbox_id} not found`);
    }

    const record = records[0];

    // Build email content
    const { subject, body } = buildEmailContent(record);

    // Send email
    await sendEmailViaSMTP(record.recipients, subject, body);

    // Mark as sent
    await fetch(`${supabaseUrl}/rest/v1/email_outbox?id=eq.${outbox_id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: 'sent',
        sent_at: new Date().toISOString(),
        error: null,
      }),
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending email:', error);

    // Try to mark as failed in outbox
    try {
      const { outbox_id } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      await fetch(`${supabaseUrl}/rest/v1/email_outbox?id=eq.${outbox_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          status: 'failed',
          error: error.message,
        }),
      });
    } catch (updateError) {
      console.error('Failed to update outbox status:', updateError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
