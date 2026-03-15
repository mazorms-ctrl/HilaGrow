-- ── Invitations table ────────────────────────────────────────────────────────
-- Stores email invitations sent to non-users to join a task in GROW+.
-- The edge function `send-task-invite` inserts here and emails the token link.
-- On signup, the frontend reads the token, looks up the row, and adds the user
-- to task_participants.

create table if not exists public.invitations (
  id              uuid        primary key default gen_random_uuid(),
  task_id         uuid        not null references public.tasks(id) on delete cascade,
  email           text        not null,
  token           uuid        not null default gen_random_uuid() unique,
  invited_by_name text        not null default 'ד"ר שי שבו',
  status          text        not null default 'pending'
                              check (status in ('pending', 'accepted', 'expired')),
  created_at      timestamptz not null default now()
);

alter table public.invitations enable row level security;

-- Authenticated users may create invitations
create policy "invitations_insert"
  on public.invitations for insert
  to authenticated
  with check (true);

-- Anyone (including anon) may read an invitation by its token
-- so the signup page can look it up before the user has an account
create policy "invitations_select"
  on public.invitations for select
  using (true);

-- Allow status to be updated (service role or authenticated users)
create policy "invitations_update"
  on public.invitations for update
  using (true);
