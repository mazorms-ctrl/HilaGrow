import { supabase } from '@/lib/supabase';

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
  task_title:      string | null;   // joined from tasks.title
  email:           string;
  token:           string;
  invited_by_name: string;
  status:          'pending' | 'accepted' | 'expired';
  created_at:      string;
}

// ── Send invitation email (calls edge function) ───────────────────────────────

export async function sendTaskInvite(payload: InvitePayload): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-task-invite', {
    body: {
      task_id:        payload.taskId,
      email:          payload.email.toLowerCase().trim(),
      task_title:     payload.taskTitle,
      invited_by_name: payload.invitedByName,
    },
  });

  if (error) throw new Error(error.message || 'שגיאה בשליחת ההזמנה');
  if (data?.error) throw new Error(data.error);
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

  // Flatten the joined task title
  const taskTitle = (data.tasks as { title: string } | null)?.title ?? null;
  return { ...data, task_title: taskTitle };
}

// ── Accept invitation — add user to task_participants, mark accepted ──────────

export async function acceptInvitation(
  token:   string,
  email:   string,
  userId:  string,
): Promise<void> {
  // 1. Fetch the invitation
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

  // 2. Verify email matches (case-insensitive)
  if (inv.email.toLowerCase() !== email.toLowerCase()) {
    console.warn('[invite] acceptInvitation: email mismatch — skipping');
    return;
  }

  // 3. Upsert into task_participants
  const { error: partErr } = await supabase
    .from('task_participants')
    .upsert({ task_id: inv.task_id, profile_id: userId }, { onConflict: 'task_id,profile_id' });

  if (partErr) {
    console.error('[invite] task_participants upsert failed:', partErr.message);
  }

  // 4. Mark invitation as accepted
  await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', inv.id);

  console.log(`[invite] Accepted: user ${userId} added to task ${inv.task_id}`);
}
