import { supabase } from '@/lib/supabase';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvitePayload {
  taskId:        string;
  taskTitle:     string;
  email:         string;
  invitedByName: string;
}

export interface Invitation {
  id:              string;
  task_id:         string;
  task_title:      string | null;
  email:           string;
  token:           string;
  invited_by_name: string;
  status:          'pending' | 'accepted' | 'expired';
  created_at:      string;
}

// ── Send invitation ───────────────────────────────────────────────────────────
// Step 1: insert the invitation row directly (uses user JWT + RLS).
// Step 2: call the edge function only to send the email (no DB ops needed there).

export async function sendTaskInvite(payload: InvitePayload): Promise<void> {
  const appUrl = import.meta.env.VITE_APP_URL || 'https://hila-grow.vercel.app';

  // 1. Insert invitation row — Supabase generates the token UUID
  const { data: inv, error: dbErr } = await supabase
    .from('invitations')
    .insert({
      task_id:        payload.taskId,
      email:          payload.email.toLowerCase().trim(),
      invited_by_name: payload.invitedByName,
    })
    .select('token')
    .single();

  if (dbErr) {
    console.error('[invite] DB insert error:', dbErr);
    throw new Error(
      dbErr.code === '42P01'
        ? 'טבלת ההזמנות לא קיימת — יש להריץ את ה-migration תחילה.'
        : `שגיאת מסד נתונים: ${dbErr.message}`
    );
  }

  const signupUrl = `${appUrl}/signup?token=${inv.token}`;

  // 2. Call edge function — deployed with --no-verify-jwt so no user JWT needed.
  //    Supabase gateway only requires apikey + anon-key Bearer to route the request.
  const fnUrl = `${SUPABASE_URL}/functions/v1/send-task-invite`;
  const fnRes = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      to:              payload.email,
      task_title:      payload.taskTitle,
      invited_by_name: payload.invitedByName,
      signup_url:      signupUrl,
    }),
  });

  if (!fnRes.ok) {
    let detail = `שגיאת שרת (${fnRes.status})`;
    try {
      const body = await fnRes.json();
      if (body?.error) detail = body.error;
    } catch {
      const text = await fnRes.text().catch(() => '');
      if (text) detail = text;
    }
    console.error('[invite] Edge function error:', detail);
    throw new Error(`ההזמנה נשמרה אך האימייל נכשל: ${detail}`);
  }
}

// ── Look up an invitation by token (called on signup page) ───────────────────

export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*, tasks(title)')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) {
    console.error('[invite] getInvitationByToken error:', error.message);
    return null;
  }
  if (!data) return null;

  const taskTitle = (data.tasks as { title: string } | null)?.title ?? null;
  return { ...data, task_title: taskTitle };
}

// ── Accept invitation — add user to task_participants, mark accepted ──────────

export async function acceptInvitation(
  token:  string,
  email:  string,
  userId: string,
): Promise<void> {
  const { data: inv, error: fetchErr } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr || !inv) {
    console.warn('[invite] acceptInvitation: invitation not found or already used');
    return;
  }

  if (inv.email.toLowerCase() !== email.toLowerCase()) {
    console.warn('[invite] acceptInvitation: email mismatch — skipping');
    return;
  }

  const { error: partErr } = await supabase
    .from('task_participants')
    .upsert({ task_id: inv.task_id, profile_id: userId }, { onConflict: 'task_id,profile_id' });

  if (partErr) {
    console.error('[invite] task_participants upsert failed:', partErr.message);
  }

  await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', inv.id);

  console.log(`[invite] Accepted: user ${userId} added to task ${inv.task_id}`);
}
