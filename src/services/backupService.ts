import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackupMetadata {
  backup_timestamp: string;
  app_version: string;
  generated_by_user_id: string;
}

export interface BackupMilestone {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  due_date: string | null;
  order: number;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
}

export interface BackupTask {
  id: string;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  category: string | null;
  created_at: string;
  due_date: string | null;
  owner_id: string | null;
  milestones: BackupMilestone[];
}

export interface BackupProfile {
  id: string;
  full_name: string | null;
  email: string;
}

export interface MasterBackup {
  metadata: BackupMetadata;
  tasks: BackupTask[];
  profiles_lookup: Record<string, BackupProfile>;
}

// ── Core generator ────────────────────────────────────────────────────────────

export async function generateMasterBackup(userId: string): Promise<MasterBackup> {
  console.log('[Backup] Starting master backup for user:', userId);

  // NOTE: status_percent is only on the active_leaf_tasks VIEW, not the tasks table.
  // Progress for auto-mode tasks is calculated from milestone ratios below.
  // dueDate lives inside the metadata JSON column, not as a top-level due_date column.
  const [tasksResult, milestonesResult, profilesResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, description, assigned_to, progress_mode, progress_manual, metadata, created_at, updated_at, group_id, groups(name)')
      .order('created_at', { ascending: true }),
    supabase
      .from('milestones')
      .select('id, task_id, title, done, due_date, order, created_at, updated_at, assigned_to')
      .order('order', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, email'),
  ]);

  console.log('[Backup] Tasks:', tasksResult.data?.length ?? 0, 'error:', tasksResult.error?.message ?? null);
  console.log('[Backup] Milestones:', milestonesResult.data?.length ?? 0, 'error:', milestonesResult.error?.message ?? null);
  console.log('[Backup] Profiles:', profilesResult.data?.length ?? 0, 'error:', profilesResult.error?.message ?? null);

  if (tasksResult.error) {
    console.error('[Backup] Tasks query failed:', tasksResult.error);
    throw new Error(`Tasks fetch failed: ${tasksResult.error.message} (code: ${tasksResult.error.code})`);
  }
  if (milestonesResult.error) {
    console.error('[Backup] Milestones query failed:', milestonesResult.error);
    throw new Error(`Milestones fetch failed: ${milestonesResult.error.message} (code: ${milestonesResult.error.code})`);
  }
  if (profilesResult.error) {
    console.error('[Backup] Profiles query failed:', profilesResult.error);
    throw new Error(`Profiles fetch failed: ${profilesResult.error.message} (code: ${profilesResult.error.code})`);
  }

  // Index milestones by task_id
  const milestonesByTask = new Map<string, BackupMilestone[]>();
  for (const m of milestonesResult.data ?? []) {
    const bucket = milestonesByTask.get(m.task_id) ?? [];
    bucket.push({
      id: m.id,
      task_id: m.task_id,
      title: m.title,
      done: m.done,
      due_date: m.due_date ?? null,
      order: m.order,
      created_at: m.created_at,
      updated_at: m.updated_at,
      assigned_to: m.assigned_to ?? null,
    });
    milestonesByTask.set(m.task_id, bucket);
  }

  // Profiles lookup table
  const profilesLookup: Record<string, BackupProfile> = {};
  for (const p of profilesResult.data ?? []) {
    profilesLookup[p.id] = { id: p.id, full_name: p.full_name ?? null, email: p.email ?? '' };
  }

  // Build task records — progress for auto tasks derived from milestone ratio
  const tasks: BackupTask[] = (tasksResult.data ?? []).map(t => {
    const taskMilestones = milestonesByTask.get(t.id) ?? [];
    let rawPct: number;
    if (t.progress_mode === 'manual') {
      rawPct = t.progress_manual ?? 0;
    } else {
      // auto: ratio of completed milestones
      rawPct = taskMilestones.length > 0
        ? Math.round((taskMilestones.filter(m => m.done).length / taskMilestones.length) * 100)
        : 0;
    }

    const status: BackupTask['status'] =
      rawPct >= 100 ? 'completed' : rawPct > 0 ? 'in_progress' : 'not_started';

    // dueDate is stored inside the metadata JSON field
    const meta = (t as Record<string, unknown>).metadata as Record<string, unknown> | null;
    const dueDate = (meta?.dueDate as string | null) ?? null;

    return {
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      status,
      progress_percentage: rawPct,
      category: (t.groups as { name: string } | null)?.name ?? null,
      created_at: t.created_at,
      due_date: dueDate,
      owner_id: t.assigned_to ?? null,
      milestones: taskMilestones,
    };
  });

  console.log('[Backup] Built', tasks.length, 'task records. Generating file...');

  return {
    metadata: {
      backup_timestamp: new Date().toISOString(),
      app_version: '0.0.0',
      generated_by_user_id: userId,
    },
    tasks,
    profiles_lookup: profilesLookup,
  };
}

// ── Download helper ───────────────────────────────────────────────────────────

export function downloadBackupAsJson(backup: MasterBackup): void {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `GROW_MASTER_BACKUP_${dateStr}.json`;
  _triggerDownload(JSON.stringify(backup, null, 2), filename);
}

// ── Single-task backup ────────────────────────────────────────────────────────

export interface TaskBackup {
  metadata: BackupMetadata;
  task: BackupTask;
  profiles_lookup: Record<string, BackupProfile>;
}

/** Extended milestone — extras merged from metadata.milestoneExtras[i] */
export interface RichBackupMilestone extends BackupMilestone {
  action_items: Array<{ text: string; done: boolean; assignedTo?: string; dueDate?: string }>;
}

/** Full task record with every metadata field extracted */
export interface RichBackupTask extends BackupTask {
  owner_name: string | null;          // direct text field (human-readable, not UUID)
  start_date: string | null;
  // Foundations
  problem_statement: string | null;
  goal: string | null;
  target_audience: string | null;
  desired_impact: string | null;
  scope: string | null;
  out_of_scope: string | null;
  success_definition: string | null;
  // Current state
  current_state: string | null;
  pain_points: string | null;
  constraints: string | null;
  existing_process: string | null;
  evidence: string | null;
  // Specification
  department: string | null;
  process_name: string | null;
  proposed_solution: string | null;
  deliverables: string | null;
  assumptions: string | null;
  required_decisions: string | null;
  acceptance_criteria: string | null;
  // KPIs
  kpis: Array<{ name: string; baseline: string; target: string; cadence: string; source: string; owner: string }>;
  // Risks
  risks_blockers: string | null;
  dependencies: string | null;
  links: string | null;
  mitigation_plan: string | null;
  escalation_path: string | null;
  // Outcome
  final_deliverable: string | null;
  rollout_notes: string | null;
  measured_result: string | null;
  lessons_learned: string | null;
  // Overridden milestones with richer type
  milestones: RichBackupMilestone[];
}

export interface RichTaskBackup {
  metadata: BackupMetadata;
  task: RichBackupTask;
  profiles_lookup: Record<string, BackupProfile>;
}

function _str(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

export async function generateTaskBackup(taskId: string, userId: string): Promise<RichTaskBackup> {
  console.log('[Backup] Starting rich single-task backup:', taskId);

  // select('*') fetches ALL columns — avoids "column not found" errors if schema evolves
  const [taskResult, milestonesResult, profilesResult] = await Promise.all([
    supabase.from('tasks').select('*, groups(name)').eq('id', taskId).single(),
    supabase.from('milestones').select('*').eq('task_id', taskId).order('order', { ascending: true }),
    supabase.from('profiles').select('id, full_name, email'),
  ]);

  console.log('[Backup] Task error:', taskResult.error?.message ?? 'none');
  console.log('[Backup] Milestones error:', milestonesResult.error?.message ?? 'none',
              '| count:', milestonesResult.data?.length ?? 0);
  console.log('[Backup] Profiles error:', profilesResult.error?.message ?? 'none');

  if (taskResult.error)
    throw new Error(`Task fetch failed: ${taskResult.error.message} (code: ${taskResult.error.code})`);
  if (milestonesResult.error)
    throw new Error(`Milestones fetch failed: ${milestonesResult.error.message}`);
  if (profilesResult.error)
    throw new Error(`Profiles fetch failed: ${profilesResult.error.message}`);

  const t    = taskResult.data as Record<string, unknown>;
  const meta = (t.metadata ?? {}) as Record<string, unknown>;

  // milestoneExtras[i] holds assignedTo + dueDate + actionItems for milestone at order=i
  const extras = (Array.isArray(meta.milestoneExtras) ? meta.milestoneExtras : []) as
    Array<Record<string, unknown>>;

  const milestones: RichBackupMilestone[] = (milestonesResult.data ?? [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((m, i) => {
      const ex = extras[i] ?? {};
      return {
        id:           m.id,
        task_id:      m.task_id,
        title:        m.title,
        done:         m.done,
        // due_date may be a real column OR only in extras — prefer column if non-null
        due_date:     _str(m.due_date) ?? _str(ex.dueDate),
        order:        m.order ?? i,
        created_at:   m.created_at ?? '',
        updated_at:   m.updated_at ?? '',
        // assigned_to may be a real column OR only in extras
        assigned_to:  _str(m.assigned_to) ?? _str(ex.assignedTo),
        action_items: Array.isArray(ex.actionItems)
          ? (ex.actionItems as Array<Record<string, unknown>>).map(a => ({
              text:       String(a.text ?? ''),
              done:       Boolean(a.done),
              assignedTo: _str(a.assignedTo) ?? undefined,
              dueDate:    _str(a.dueDate) ?? undefined,
            }))
          : [],
      };
    });

  const progressMode   = _str(t.progress_mode);
  const progressManual = typeof t.progress_manual === 'number' ? t.progress_manual : 0;
  let rawPct: number;
  if (progressMode === 'manual') {
    rawPct = progressManual;
  } else {
    rawPct = milestones.length > 0
      ? Math.round((milestones.filter(m => m.done).length / milestones.length) * 100)
      : 0;
  }

  const status: BackupTask['status'] =
    rawPct >= 100 ? 'completed' : rawPct > 0 ? 'in_progress' : 'not_started';

  const profilesLookup: Record<string, BackupProfile> = {};
  for (const p of profilesResult.data ?? []) {
    profilesLookup[p.id] = { id: p.id, full_name: p.full_name ?? null, email: p.email ?? '' };
  }

  // Build KPI list — prefer array form; fall back to single flat fields
  const rawKpis = Array.isArray(meta.kpis) && (meta.kpis as unknown[]).length > 0
    ? (meta.kpis as Array<Record<string, unknown>>).map(k => ({
        name: String(k.name ?? ''), baseline: String(k.baseline ?? ''),
        target: String(k.target ?? ''), cadence: String(k.cadence ?? ''),
        source: String(k.source ?? ''), owner: String(k.owner ?? ''),
      }))
    : (meta.kpiName || meta.baseline || meta.target)
      ? [{ name: String(meta.kpiName ?? ''), baseline: String(meta.baseline ?? ''),
           target: String(meta.target ?? ''), cadence: String(meta.measurementCadence ?? ''),
           source: String(meta.sourceOfTruth ?? ''), owner: String(meta.metricOwner ?? '') }]
      : [];

  const task: RichBackupTask = {
    // ── BackupTask base ──────────────────────────────────────────
    id:                  String(t.id),
    title:               String(t.title ?? ''),
    description:         _str(t.description),
    status,
    progress_percentage: rawPct,
    category:            _str((t.groups as Record<string,unknown> | null)?.name),
    created_at:          String(t.created_at ?? ''),
    due_date:            _str(meta.dueDate),
    owner_id:            _str(t.assigned_to),
    milestones,
    // ── Extended fields ──────────────────────────────────────────
    owner_name:          _str(t.owner_name),
    start_date:          _str(meta.startDate),
    // Foundations
    problem_statement:   _str(meta.problemStatement),
    goal:                _str(meta.goal),
    target_audience:     _str(meta.targetAudience),
    desired_impact:      _str(meta.desiredImpact),
    scope:               _str(meta.scope),
    out_of_scope:        _str(meta.outOfScope),
    success_definition:  _str(meta.successDefinition),
    // Current state
    current_state:       _str(meta.currentState),
    pain_points:         _str(meta.painPoints),
    constraints:         _str(meta.constraints),
    existing_process:    _str(meta.existingProcess),
    evidence:            _str(meta.evidence),
    // Specification
    department:          _str(meta.department),
    process_name:        _str(meta.processName),
    proposed_solution:   _str(meta.proposedSolution),
    deliverables:        _str(meta.deliverables),
    assumptions:         _str(meta.assumptions),
    required_decisions:  _str(meta.requiredDecisions),
    acceptance_criteria: _str(meta.acceptanceCriteria),
    // KPIs
    kpis:                rawKpis,
    // Risks
    risks_blockers:      _str(meta.risksBlockers),
    dependencies:        _str(meta.dependencies),
    links:               _str(meta.links),
    mitigation_plan:     _str(meta.mitigationPlan),
    escalation_path:     _str(meta.escalationPath),
    // Outcome
    final_deliverable:   _str(meta.finalDeliverable),
    rollout_notes:       _str(meta.rolloutNotes),
    measured_result:     _str(meta.measuredResult),
    lessons_learned:     _str(meta.lessonsLearned),
  };

  console.log('[Backup] Rich task built. Milestones:', milestones.length,
              '| KPIs:', rawKpis.length, '| description chars:', task.description?.length ?? 0);

  return {
    metadata: {
      backup_timestamp:    new Date().toISOString(),
      app_version:         '0.0.0',
      generated_by_user_id: userId,
    },
    task,
    profiles_lookup: profilesLookup,
  };
}

// ── Single-task PDF ───────────────────────────────────────────────────────────

export async function exportSingleTaskAsPdf(taskId: string, userId: string): Promise<void> {
  const backup = await generateTaskBackup(taskId, userId);
  const { task, profiles_lookup, metadata } = backup;

  const dateFormatted = new Date(metadata.backup_timestamp).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Resolve a UUID to a display name via profiles lookup
  function resolveProfile(id: string | null): string {
    if (!id) return '';
    const p = profiles_lookup[id];
    return p ? (p.full_name || p.email || '') : id;
  }

  // For milestone assignedTo: may be a UUID or a plain text name stored in extras
  function resolveAssignee(val: string | null): string {
    if (!val) return '';
    // If it looks like a UUID, resolve via profiles; otherwise treat as plain text
    if (/^[0-9a-f-]{36}$/i.test(val)) return resolveProfile(val);
    return val;
  }

  // Render a labelled text block — returns '' if value is empty
  function textSection(label: string, value: string | null, accentColor = '#6366f1'): string {
    if (!value) return '';
    return `
    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;
                  color:#94a3b8;margin-bottom:6px;">${label}</div>
      <div style="font-size:12.5px;color:#334155;line-height:1.8;
                  word-wrap:break-word;overflow-wrap:break-word;white-space:pre-wrap;
                  background:#f8fafc;border-radius:8px;padding:11px 15px;
                  border-right:3px solid ${accentColor};">
        ${_escHtml(value)}
      </div>
    </div>`;
  }

  // Render a section card with a title bar
  function sectionCard(title: string, content: string, borderColor = '#6366f1'): string {
    if (!content.trim()) return '';
    return `
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;
              margin-bottom:18px;overflow:hidden;">
    <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 18px;
                border-right:4px solid ${borderColor};">
      <span style="font-size:11px;font-weight:800;letter-spacing:1.4px;
                   text-transform:uppercase;color:#334155;">${title}</span>
    </div>
    <div style="padding:16px 18px;">${content}</div>
  </div>`;
  }

  const st        = PDF_STATUS[task.status];
  // Use the human-readable owner_name stored directly on the task; fall back to profile lookup
  const ownerName = task.owner_name || resolveProfile(task.owner_id);
  const pct       = task.progress_percentage;
  const barColor  = pct >= 100 ? '#059669' : pct >= 50 ? '#6366f1' : '#d97706';
  const doneMs    = task.milestones.filter(m => m.done).length;

  // ── Milestones table with action items ──────────────────────────────────────
  const msRows = task.milestones.length === 0
    ? `<tr><td colspan="5" style="padding:12px;color:#94a3b8;font-size:12px;text-align:center;">לא הוגדרו אבני דרך</td></tr>`
    : task.milestones.map((m, mi) => {
        const assignee  = resolveAssignee(m.assigned_to);
        const statusLbl = m.done ? 'בוצע' : 'פתוח';
        const statusClr = m.done ? '#059669' : '#d97706';
        const statusBg  = m.done ? '#d1fae5' : '#fef3c7';

        const actionItemsHtml = m.action_items.length > 0
          ? `<div style="margin-top:6px;padding-right:6px;border-right:2px solid #e2e8f0;">
              ${m.action_items.map(ai => `
                <div style="font-size:10.5px;color:${ai.done ? '#94a3b8' : '#475569'};
                            ${ai.done ? 'text-decoration:line-through;' : ''}
                            display:flex;align-items:flex-start;gap:5px;margin-bottom:3px;">
                  <span>${ai.done ? '✅' : '◻'}</span>
                  <span style="word-wrap:break-word;overflow-wrap:break-word;">${_escHtml(ai.text)}</span>
                  ${ai.assignedTo ? `<span style="color:#94a3b8;font-size:9.5px;margin-right:4px;">(${_escHtml(ai.assignedTo)})</span>` : ''}
                </div>`).join('')}
             </div>`
          : '';

        return `<tr style="background:${mi % 2 === 0 ? '#f8fafc' : '#fff'};">
          <td style="padding:8px 10px;text-align:center;width:26px;font-size:14px;vertical-align:top;">${m.done ? '✅' : '⬜'}</td>
          <td style="padding:8px 10px;font-size:12px;color:${m.done ? '#94a3b8' : '#1e293b'};
                     ${m.done ? 'text-decoration:line-through;' : ''}
                     word-wrap:break-word;overflow-wrap:break-word;vertical-align:top;">
            ${_escHtml(m.title)}${actionItemsHtml}
          </td>
          <td style="padding:8px 10px;text-align:center;width:72px;vertical-align:top;">
            <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;
                         background:${statusBg};color:${statusClr};white-space:nowrap;">${statusLbl}</span>
          </td>
          <td style="padding:8px 10px;font-size:11px;color:#64748b;width:110px;
                     word-wrap:break-word;vertical-align:top;">
            ${assignee ? _escHtml(assignee) : '—'}
          </td>
          <td style="padding:8px 10px;font-size:11px;color:#64748b;white-space:nowrap;
                     width:90px;vertical-align:top;">
            ${_fmtDate(m.due_date)}
          </td>
        </tr>`;
      }).join('');

  // ── KPI table ───────────────────────────────────────────────────────────────
  const kpiTableHtml = task.kpis.length === 0 ? '' : `
    <table style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:11.5px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:6px 10px;font-weight:600;color:#64748b;text-align:right;">מדד</th>
          <th style="padding:6px 10px;font-weight:600;color:#64748b;text-align:right;width:90px;">בסיס</th>
          <th style="padding:6px 10px;font-weight:600;color:#64748b;text-align:right;width:90px;">יעד</th>
          <th style="padding:6px 10px;font-weight:600;color:#64748b;text-align:right;width:90px;">תדירות</th>
          <th style="padding:6px 10px;font-weight:600;color:#64748b;text-align:right;width:90px;">אחראי</th>
        </tr>
      </thead>
      <tbody>
        ${task.kpis.map((k, ki) => `
        <tr style="background:${ki % 2 === 0 ? '#f8fafc' : '#fff'};">
          <td style="padding:7px 10px;color:#1e293b;word-wrap:break-word;">${_escHtml(k.name)}</td>
          <td style="padding:7px 10px;color:#64748b;">${_escHtml(k.baseline)}</td>
          <td style="padding:7px 10px;color:#059669;font-weight:600;">${_escHtml(k.target)}</td>
          <td style="padding:7px 10px;color:#64748b;">${_escHtml(k.cadence)}</td>
          <td style="padding:7px 10px;color:#64748b;word-wrap:break-word;">${_escHtml(k.owner)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;

  const safeTitle = task.title.replace(/[^a-zA-Z0-9\u0590-\u05FF\s]/g, '').trim().slice(0, 60);

  // ── Build section groups ─────────────────────────────────────────────────────

  const foundationsContent = [
    textSection('בעיה / הזדמנות', task.problem_statement, '#ef4444'),
    textSection('מטרה', task.goal, '#6366f1'),
    textSection('קהל יעד', task.target_audience, '#8b5cf6'),
    textSection('השפעה רצויה', task.desired_impact, '#0ea5e9'),
    textSection('היקף', task.scope, '#6366f1'),
    textSection('מחוץ להיקף', task.out_of_scope, '#94a3b8'),
    textSection('הגדרת הצלחה', task.success_definition, '#059669'),
  ].join('');

  const currentStateContent = [
    textSection('מצב קיים', task.current_state, '#d97706'),
    textSection('נקודות כאב', task.pain_points, '#ef4444'),
    textSection('מגבלות', task.constraints, '#f59e0b'),
    textSection('תהליך קיים', task.existing_process, '#8b5cf6'),
    textSection('ראיות / נתונים', task.evidence, '#0ea5e9'),
  ].join('');

  const specContent = [
    task.department || task.process_name
      ? `<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:14px;font-size:12px;color:#64748b;">
           ${task.department    ? `<span>🏥 מחלקה: <strong style="color:#334155;">${_escHtml(task.department)}</strong></span>` : ''}
           ${task.process_name  ? `<span>⚙️ תהליך: <strong style="color:#334155;">${_escHtml(task.process_name)}</strong></span>` : ''}
         </div>` : '',
    textSection('פתרון מוצע', task.proposed_solution, '#6366f1'),
    textSection('תוצרים', task.deliverables, '#059669'),
    textSection('הנחות', task.assumptions, '#f59e0b'),
    textSection('החלטות נדרשות', task.required_decisions, '#ef4444'),
    textSection('קריטריוני קבלה', task.acceptance_criteria, '#059669'),
  ].join('');

  const kpiContent = kpiTableHtml
    ? `<div style="margin-bottom:8px;">${kpiTableHtml}</div>`
    : '';

  const risksContent = [
    textSection('סיכונים וחוסמים', task.risks_blockers, '#ef4444'),
    textSection('תלויות', task.dependencies, '#f59e0b'),
    textSection('קישורים / מסמכים', task.links, '#0ea5e9'),
    textSection('תכנית מיתיגציה', task.mitigation_plan, '#d97706'),
    textSection('נתיב הסלמה', task.escalation_path, '#94a3b8'),
  ].join('');

  const outcomeContent = [
    textSection('תוצר סופי', task.final_deliverable, '#059669'),
    textSection('הערות פריסה', task.rollout_notes, '#6366f1'),
    textSection('תוצאה מדודה', task.measured_result, '#059669'),
    textSection('לקחים', task.lessons_learned, '#8b5cf6'),
  ].join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8"/>
  <title>גיבוי משימה — ${_escHtml(task.title)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    * { word-wrap: break-word; overflow-wrap: break-word; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f8fafc; color: #1e293b;
      margin: 0; padding: 0; direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { table-layout: fixed; width: 100%; }
    @page { size: A4 portrait; margin: 14mm 10mm; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
<div style="max-width:760px;margin:0 auto;padding:20px 14px;">

  <!-- ══ Header ══ -->
  <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#6366f1 100%);
              border-radius:14px;padding:22px 28px;margin-bottom:18px;color:#fff;">
    <div style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;
                opacity:0.7;margin-bottom:8px;">
      GROW+ — Hillel Yaffe Medical Center &nbsp;·&nbsp; גיבוי משימה מלא
    </div>
    <div style="font-size:20px;font-weight:900;line-height:1.3;
                word-wrap:break-word;overflow-wrap:break-word;margin-bottom:10px;">
      ${_escHtml(task.title)}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
      <span style="font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;
                   background:rgba(255,255,255,0.2);color:#fff;">${st.label}</span>
      ${task.category ? `<span style="font-size:11px;opacity:0.85;">📁 ${_escHtml(task.category)}</span>` : ''}
      <span style="font-size:11px;opacity:0.75;margin-right:auto;">📅 ${dateFormatted}</span>
    </div>
  </div>

  <!-- ══ Meta card ══ -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;
              padding:14px 18px;margin-bottom:16px;
              display:flex;flex-wrap:wrap;gap:8px 28px;font-size:12px;color:#64748b;">
    ${ownerName       ? `<span>👤 אחראי: <strong style="color:#334155;">${_escHtml(ownerName)}</strong></span>` : ''}
    <span>📅 נוצר: <strong style="color:#334155;">${_fmtDate(task.created_at)}</strong></span>
    ${task.start_date ? `<span>🚀 התחלה: <strong style="color:#334155;">${_fmtDate(task.start_date)}</strong></span>` : ''}
    ${task.due_date   ? `<span>🏁 יעד: <strong style="color:#334155;">${_fmtDate(task.due_date)}</strong></span>` : ''}
    <span style="margin-right:auto;">
      התקדמות: <strong style="color:${barColor};">${pct}%</strong>
      &nbsp;<span style="font-size:11px;">(${doneMs}/${task.milestones.length} אבני דרך)</span>
    </span>
  </div>

  <!-- Progress bar -->
  <div style="background:#e2e8f0;border-radius:6px;height:8px;margin-bottom:18px;">
    <div style="background:${barColor};height:100%;width:${pct}%;border-radius:6px;"></div>
  </div>

  <!-- ══ Description ══ -->
  ${task.description ? sectionCard('תיאור המשימה', textSection('', task.description, '#6366f1').replace('margin-bottom:14px', 'margin-bottom:0')) : ''}

  <!-- ══ Foundations ══ -->
  ${sectionCard('יסודות הפרויקט', foundationsContent, '#ef4444')}

  <!-- ══ Current State ══ -->
  ${sectionCard('מצב קיים', currentStateContent, '#d97706')}

  <!-- ══ Specification ══ -->
  ${sectionCard('מפרט ופתרון', specContent, '#6366f1')}

  <!-- ══ KPIs ══ -->
  ${kpiContent ? sectionCard('מדדי הצלחה (KPI)', kpiContent, '#059669') : ''}

  <!-- ══ Risks ══ -->
  ${sectionCard('סיכונים ותלויות', risksContent, '#ef4444')}

  <!-- ══ Outcome ══ -->
  ${sectionCard('תוצאות ולקחים', outcomeContent, '#059669')}

  <!-- ══ Milestones ══ -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;
              margin-bottom:18px;overflow:hidden;">
    <div style="background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 18px;
                border-right:4px solid #6366f1;">
      <span style="font-size:11px;font-weight:800;letter-spacing:1.4px;
                   text-transform:uppercase;color:#334155;">
        אבני דרך &nbsp;—&nbsp; ${doneMs}/${task.milestones.length} הושלמו
      </span>
    </div>
    <div style="padding:14px 18px;">
      <table style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#64748b;width:26px;"></th>
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#64748b;text-align:right;">כותרת</th>
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#64748b;text-align:center;width:72px;">סטטוס</th>
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#64748b;text-align:right;width:110px;">אחראי</th>
            <th style="padding:7px 10px;font-size:10px;font-weight:600;color:#64748b;text-align:right;width:90px;">תאריך יעד</th>
          </tr>
        </thead>
        <tbody>${msRows}</tbody>
      </table>
    </div>
  </div>

  <!-- ══ Footer ══ -->
  <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;
              display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
    <span>GROW+ — Hillel Yaffe Medical Center</span>
    <span>הופק: ${dateFormatted}</span>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('הדפדפן חסם את פתיחת החלון.\nאנא אפשר חלונות קופצים עבור אתר זה ונסה שוב.');
    return;
  }
  win.document.title = `GROW_Task_${safeTitle}_${new Date().toISOString().split('T')[0]}`;
  win.document.write(html);
  win.document.close();
}

// ── CSV / Excel export ────────────────────────────────────────────────────────

const STATUS_LABELS: Record<BackupTask['status'], string> = {
  not_started: 'טרם התחיל',
  in_progress:  'בתהליך',
  completed:    'הושלם',
};

function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  // Quote if contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportMasterBackupAsCsv(userId: string): Promise<void> {
  const backup = await generateMasterBackup(userId);
  const { tasks, profiles_lookup } = backup;

  const headers = [
    'כותרת פרויקט',
    'קטגוריה',
    'סטטוס פרויקט',
    'התקדמות %',
    'אחראי',
    'כותרת אבן דרך',
    'הושלם',
    'תאריך יעד אבן דרך',
  ];

  const rows: string[] = [headers.map(csvCell).join(',')];

  for (const task of tasks) {
    const ownerName = task.owner_id
      ? (profiles_lookup[task.owner_id]?.full_name ?? profiles_lookup[task.owner_id]?.email ?? '')
      : '';
    const statusLabel = STATUS_LABELS[task.status];

    if (task.milestones.length === 0) {
      // Task with no milestones — one summary row
      rows.push([
        csvCell(task.title),
        csvCell(task.category),
        csvCell(statusLabel),
        csvCell(task.progress_percentage),
        csvCell(ownerName),
        csvCell(''),   // no milestone
        csvCell(''),
        csvCell(task.due_date),
      ].join(','));
    } else {
      for (const ms of task.milestones) {
        rows.push([
          csvCell(task.title),
          csvCell(task.category),
          csvCell(statusLabel),
          csvCell(task.progress_percentage),
          csvCell(ownerName),
          csvCell(ms.title),
          csvCell(ms.done ? 'כן' : 'לא'),
          csvCell(ms.due_date),
        ].join(','));
      }
    }
  }

  // UTF-8 BOM ensures Hebrew renders correctly when opened in Excel
  const content = '\uFEFF' + rows.join('\r\n');
  const dateStr = new Date().toISOString().split('T')[0];
  _triggerDownload(content, `GROW_Export_${dateStr}.csv`, 'text/csv;charset=utf-8;');
}

// ── PDF Report ────────────────────────────────────────────────────────────────

const PDF_STATUS: Record<BackupTask['status'], { label: string; color: string; bg: string }> = {
  not_started: { label: 'טרם התחיל', color: '#64748b', bg: '#f1f5f9' },
  in_progress:  { label: 'בתהליך',   color: '#d97706', bg: '#fef3c7' },
  completed:    { label: 'הושלם',    color: '#059669', bg: '#d1fae5' },
};

function _fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

export async function exportMasterBackupAsPdf(userId: string): Promise<void> {
  const backup = await generateMasterBackup(userId);
  const { tasks, profiles_lookup, metadata } = backup;

  const dateFormatted = new Date(metadata.backup_timestamp).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function resolveProfile(id: string | null): string {
    if (!id) return '';
    const p = profiles_lookup[id];
    return p ? (p.full_name || p.email || '') : '';
  }

  const completedCount  = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const notStartedCount = tasks.length - completedCount - inProgressCount;
  const totalMilestones = tasks.reduce((s, t) => s + t.milestones.length, 0);

  const taskBlocks = tasks.map((task, idx) => {
    const st        = PDF_STATUS[task.status];
    const ownerName = resolveProfile(task.owner_id);
    const pct       = task.progress_percentage;
    const barColor  = pct >= 100 ? '#059669' : pct >= 50 ? '#6366f1' : '#d97706';
    const doneMs    = task.milestones.filter(m => m.done).length;

    // Milestone rows — every field, assignee resolved to name
    const msRows = task.milestones.length === 0
      ? `<tr><td colspan="4" style="padding:10px;color:#94a3b8;font-size:12px;text-align:center;">לא הוגדרו אבני דרך</td></tr>`
      : task.milestones.map((m, mi) => {
          const assignee = resolveProfile(m.assigned_to);
          return `<tr style="background:${mi % 2 === 0 ? '#f8fafc' : '#fff'};">
            <td style="padding:7px 8px;text-align:center;width:26px;font-size:13px;">${m.done ? '✅' : '⬜'}</td>
            <td style="padding:7px 8px;font-size:12px;color:${m.done ? '#94a3b8' : '#1e293b'};
                       ${m.done ? 'text-decoration:line-through;' : ''}
                       word-wrap:break-word;overflow-wrap:break-word;">
              ${_escHtml(m.title)}
            </td>
            <td style="padding:7px 8px;font-size:11px;color:#64748b;width:110px;word-wrap:break-word;">
              ${assignee ? _escHtml(assignee) : '—'}
            </td>
            <td style="padding:7px 8px;font-size:11px;color:#64748b;white-space:nowrap;width:88px;">
              ${_fmtDate(m.due_date)}
            </td>
          </tr>`;
        }).join('');

    return `
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;
            margin-bottom:22px;overflow:hidden;page-break-inside:avoid;">

  <!-- Task title bar -->
  <div style="background:#f8fafc;border-bottom:2px solid #e2e8f0;padding:14px 20px;
              display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:9.5px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;
                  color:#94a3b8;margin-bottom:5px;">
        פרויקט ${idx + 1}${task.category ? ` &nbsp;·&nbsp; ${_escHtml(task.category)}` : ''}
      </div>
      <div style="font-size:16px;font-weight:800;color:#0f172a;line-height:1.35;
                  word-wrap:break-word;overflow-wrap:break-word;">
        ${_escHtml(task.title)}
      </div>
    </div>
    <span style="font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;
                 background:${st.bg};color:${st.color};flex-shrink:0;margin-top:2px;
                 white-space:nowrap;">
      ${st.label}
    </span>
  </div>

  <div style="padding:16px 20px;">

    <!-- Meta: owner · start · due -->
    <div style="display:flex;flex-wrap:wrap;gap:6px 22px;font-size:11px;
                color:#64748b;margin-bottom:14px;">
      ${ownerName     ? `<span>👤 אחראי: <strong style="color:#334155;">${_escHtml(ownerName)}</strong></span>` : ''}
      <span>📅 נוצר: <strong style="color:#334155;">${_fmtDate(task.created_at)}</strong></span>
      ${task.due_date ? `<span>🏁 יעד: <strong style="color:#334155;">${_fmtDate(task.due_date)}</strong></span>` : ''}
    </div>

    <!-- Progress bar -->
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;
                  color:#64748b;margin-bottom:5px;">
        <span>התקדמות כוללת</span>
        <strong style="color:${barColor};">${pct}%</strong>
      </div>
      <div style="background:#e2e8f0;border-radius:6px;height:8px;">
        <div style="background:${barColor};height:100%;width:${pct}%;border-radius:6px;"></div>
      </div>
    </div>

    <!-- Description -->
    ${task.description ? `
    <div style="margin-bottom:16px;">
      <div style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                  color:#94a3b8;margin-bottom:7px;">תיאור</div>
      <div style="font-size:13px;color:#334155;line-height:1.75;
                  word-wrap:break-word;overflow-wrap:break-word;white-space:pre-wrap;
                  background:#f8fafc;border-radius:8px;padding:11px 15px;
                  border-right:3px solid #6366f1;">
        ${_escHtml(task.description)}
      </div>
    </div>` : ''}

    <!-- Milestones table -->
    <div>
      <div style="font-size:9.5px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                  color:#94a3b8;margin-bottom:8px;">
        אבני דרך &nbsp;(${doneMs}/${task.milestones.length} הושלמו)
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;
                    border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:6px 8px;font-size:10px;font-weight:600;color:#64748b;width:26px;"></th>
            <th style="padding:6px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:right;">כותרת אבן דרך</th>
            <th style="padding:6px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:right;width:110px;">אחראי</th>
            <th style="padding:6px 8px;font-size:10px;font-weight:600;color:#64748b;text-align:right;width:88px;">תאריך יעד</th>
          </tr>
        </thead>
        <tbody>${msRows}</tbody>
      </table>
    </div>

  </div>
</div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8"/>
  <title>גיבוי נתוני פרויקטים — GROW+ הלל יפה</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    * { word-wrap: break-word; overflow-wrap: break-word; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #f8fafc; color: #1e293b;
      margin: 0; padding: 0; direction: rtl;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { table-layout: fixed; width: 100%; }
    @page { size: A4 portrait; margin: 16mm 12mm; }
    @media print {
      body { background: #fff; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div style="max-width:760px;margin:0 auto;padding:24px 16px;">

  <!-- ══ Header ══ -->
  <div style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#6366f1 100%);
              border-radius:14px;padding:24px 30px;margin-bottom:22px;color:#fff;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;
                flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:9.5px;letter-spacing:2.5px;text-transform:uppercase;
                    opacity:0.7;margin-bottom:6px;">
          GROW+ &nbsp;—&nbsp; Hillel Yaffe Medical Center
        </div>
        <div style="font-size:21px;font-weight:900;line-height:1.2;margin-bottom:5px;">
          גיבוי נתוני פרויקטים — מלא
        </div>
        <div style="font-size:11.5px;opacity:0.75;">Full Project Data Backup</div>
      </div>
      <div style="font-size:11.5px;opacity:0.8;line-height:2.1;text-align:left;">
        <div>📅 ${dateFormatted}</div>
        <div>📂 ${tasks.length} פרויקטים</div>
        <div>🔖 ${totalMilestones} אבני דרך</div>
      </div>
    </div>
  </div>

  <!-- ══ Summary bar ══ -->
  <div style="display:flex;gap:10px;margin-bottom:22px;">
    <div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;
                padding:13px;text-align:center;">
      <div style="font-size:26px;font-weight:900;color:#059669;">${completedCount}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">הושלמו</div>
    </div>
    <div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;
                padding:13px;text-align:center;">
      <div style="font-size:26px;font-weight:900;color:#d97706;">${inProgressCount}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">בתהליך</div>
    </div>
    <div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;
                padding:13px;text-align:center;">
      <div style="font-size:26px;font-weight:900;color:#6366f1;">${notStartedCount}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">טרם התחיל</div>
    </div>
  </div>

  <!-- ══ Task sections ══ -->
  ${taskBlocks}

  <!-- ══ Footer ══ -->
  <div style="margin-top:26px;padding-top:14px;border-top:1px solid #e2e8f0;
              display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
    <span>GROW+ — Hillel Yaffe Medical Center</span>
    <span>הופק: ${dateFormatted}</span>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('הדפדפן חסם את פתיחת החלון.\nאנא אפשר חלונות קופצים עבור אתר זה ונסה שוב.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

function _escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** One-shot: fetch + download a single task backup. */
export async function exportSingleTask(taskId: string, userId: string): Promise<void> {
  const backup = await generateTaskBackup(taskId, userId);
  downloadTaskBackupAsJson(backup);
}

export function downloadTaskBackupAsJson(backup: TaskBackup): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const safeTitle = backup.task.title.replace(/[^a-zA-Z0-9\u0590-\u05FF\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 50);
  const filename = `GROW_Task_${safeTitle}_${dateStr}.json`;
  _triggerDownload(JSON.stringify(backup, null, 2), filename);
}

function _triggerDownload(content: string, filename: string, mime = 'application/json'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
