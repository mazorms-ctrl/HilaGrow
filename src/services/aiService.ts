// ── AI Suggestions Service (Google Gemini — REST) ──────────────────────────
// Models confirmed available for this AI Studio key (from discovery scan).
// PRIMARY is tried first; on 404 the session falls back to FALLBACK automatically.

const API_KEY       = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const BASE          = 'https://generativelanguage.googleapis.com/v1beta';
const PRIMARY_MODEL = 'models/gemini-flash-lite-latest';
const FALLBACK_MODEL= 'models/gemini-2.0-flash-lite';

// Active model for this session — switches to fallback on first 404
let activeModel = PRIMARY_MODEL;
let connectionEstablished = false;

// ── Call the model (with automatic 404 fallback) ─────────────────────────────
async function callGemini(prompt: string, context: string, temperature = 0.8, _retry = false): Promise<string> {
  if (!API_KEY) {
    console.warn('[AI Engine] VITE_GEMINI_API_KEY is not set — AI suggestions disabled.');
    return '';
  }

  // Full model path already contains 'models/' — URL becomes: BASE/models/gemini-flash-latest:generateContent
  const url = `${BASE}/${activeModel}:generateContent?key=${API_KEY}`;
  console.log(`[AI Engine] Fetching... (${context}) via ${activeModel}`);
  console.log('[AI Engine] Payload:', {
    context,
    model: activeModel,
    promptLength: prompt.length,
    promptPreview: prompt.slice(0, 300) + (prompt.length > 300 ? '…' : ''),
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature },
      }),
    });
  } catch (err) {
    console.error('[AI Engine] Network error:', err);
    return '';
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error(`[AI Engine] API error ${res.status} for model "${activeModel}":`, errBody);
    if (res.status === 404 && !_retry && activeModel !== FALLBACK_MODEL) {
      console.warn(`[AI Engine] 404 on ${activeModel} — switching to fallback: ${FALLBACK_MODEL}`);
      activeModel = FALLBACK_MODEL;
      return callGemini(prompt, context, temperature, true);
    }
    return '';
  }

  const data = await res.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const finishReason: string = data?.candidates?.[0]?.finishReason ?? 'UNKNOWN';

  if (finishReason === 'MAX_TOKENS') {
    console.warn('[AI Engine] Response was cut off (MAX_TOKENS). Consider raising maxOutputTokens further.');
  }

  if (!connectionEstablished) {
    connectionEstablished = true;
    console.log('%c✓ AI System: Connection established!', 'color:#7c3aed;font-weight:bold;font-size:14px');
  }
  console.log('[AI Engine] Success', { model: activeModel, context, finishReason, response: text });
  return text;
}

// ── Shared sanitize helper ────────────────────────────────────────────────────
function sanitize(s: string): string {
  return s
    .replace(/^[\s\["',\-•*#\d.)]+/, '')  // leading: brackets, quotes, bullets, numbers
    .replace(/[\s\]"',]+$/, '')             // trailing: brackets, quotes, commas
    .replace(/\*\*/g, '')
    .replace(/[*_`[\]]/g, '')
    .trim();
}

// ── Strip markdown fences from a raw AI response ─────────────────────────────
function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
}

// ── robustParse: 4-layer JSON array extractor ─────────────────────────────────
// Handles: clean JSON, fenced JSON, partially-truncated JSON, prose with JSON embedded.
// Returns the raw parsed array (unknown[]) or null if nothing extractable was found.
function robustParse(text: string): unknown[] | null {
  const stripped = stripFences(text);

  // Layer 1: direct JSON.parse
  try {
    const parsed: unknown = JSON.parse(stripped);
    if (Array.isArray(parsed)) {
      console.log('[AI Engine] robustParse: Layer 1 (JSON direct)');
      return parsed as unknown[];
    }
  } catch { /* fall through */ }

  // Layer 2: extract outermost [...] then JSON.parse
  const bracketMatch = stripped.match(/\[[\s\S]*\]/);
  if (bracketMatch) {
    try {
      const parsed: unknown = JSON.parse(bracketMatch[0]);
      if (Array.isArray(parsed)) {
        console.log('[AI Engine] robustParse: Layer 2 (bracket extract)');
        return parsed as unknown[];
      }
    } catch { /* fall through */ }
  }

  // Layer 3: pull every "quoted string" from the raw text
  // Works even on TRUNCATED JSON — extracts all complete quoted tokens.
  const quoteMatches = [...stripped.matchAll(/"([^"]{5,})"/g)].map(m => m[1]);
  if (quoteMatches.length > 0) {
    console.log('[AI Engine] robustParse: Layer 3 (quoted strings)');
    return quoteMatches;
  }

  // Layer 4: line-split fallback
  const lines = stripped.split('\n').filter(l => l.trim().length > 5);
  if (lines.length > 0) {
    console.log('[AI Engine] robustParse: Layer 4 (line split)');
    return lines;
  }

  console.warn('[AI Engine] robustParse: all layers failed. Raw text that failed to parse:', text);
  return null;
}

// ── Suggest milestone titles based on task context ──────────────────────────
export async function suggestMilestones(context: {
  title: string;
  description?: string;
  problemStatement?: string;
  proposedSolution?: string;
  processName?: string;
  existingMilestones?: string[];
  isRefresh?: boolean;
}): Promise<string[]> {
  // Build the richest possible context block from whatever fields are filled
  const contextLines = [
    context.title            && `שם הפרויקט: ${context.title}`,
    context.description      && `תיאור כללי: ${context.description}`,
    context.problemStatement && `בעיה / הזדמנות: ${context.problemStatement}`,
    context.proposedSolution && `הפתרון המתוכנן: ${context.proposedSolution}`,
    context.processName      && `גישה / מתודולוגיה: ${context.processName}`,
  ].filter(Boolean).join('\n');

  if (!contextLines.trim()) return [];

  const existingStr = context.existingMilestones?.length
    ? `\n\nMilestones already in the project (for context — suggest complementary ones, not identical):\n${context.existingMilestones.map(m => `- ${m}`).join('\n')}`
    : '';

  const diversityInstruction = context.isRefresh
    ? `\nThis is a REFRESH request. You MUST suggest a completely different set — focus on angles NOT yet covered. If previous suggestions were regulatory, now focus on clinical execution, data, or team. Be creative and vary the phrasing significantly.\n`
    : '';

  const prompt = `You are a Senior Clinical Research Project Manager at Hillel Yaffe Medical Center.
Your role is to advise hospital research teams on realistic, professional project milestones.

Project context:
${contextLines}${existingStr}
${diversityInstruction}
You MUST provide exactly 5 distinct milestones. Do not provide fewer, even if the context is short.

Distribute them as follows:
- 2 Operational / Regulatory milestones (e.g., ethics committee approval, management sign-off, budget allocation, IRB submission)
- 2 Professional / Scientific milestones (e.g., research protocol design, literature review, inclusion criteria, measurement tool selection)
- 1 Technical / Data milestone (e.g., database setup, system integration, data collection tool configuration)

Return ONLY a JSON array. No conversational text. Use this exact format:
["משפט עברי מקצועי ראשון", "משפט עברי מקצועי שני", "משפט עברי מקצועי שלישי", "משפט עברי מקצועי רביעי", "משפט עברי מקצועי חמישי"]`;

  const temperature = context.isRefresh ? 0.9 : 0.8;
  const raw = await callGemini(prompt, 'milestones', temperature);
  console.log('[AI Engine] Raw response:', raw);

  const items = robustParse(raw);
  if (!items) return [];

  const results = items.map(s => sanitize(String(s))).filter(s => s.length > 5).slice(0, 5);
  console.log('[AI Engine] Parsed milestones:', results);
  return results;
}

// ── Suggest risks + mitigations from process description (Risk Radar) ────────
export async function suggestRisks(context: {
  title: string;
  processName?: string;
  proposedSolution?: string;
}): Promise<Array<{ risk: string; mitigation: string }>> {
  const hasCtx = (context.processName ?? '').trim().length > 8
               || (context.proposedSolution ?? '').trim().length > 8;
  if (!hasCtx) return [];

  const contextText = [
    `שם הפרויקט: ${context.title}`,
    context.proposedSolution && `הפתרון המתוכנן: ${context.proposedSolution}`,
    context.processName      && `גישה ומתודולוגיה: ${context.processName}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are a Senior Clinical Research Risk Manager at Hillel Yaffe Medical Center.
Analyze the following project and identify exactly 3 key operational risks with specific mitigation strategies.

Project context:
${contextText}

Return ONLY a JSON array. No conversational text. Use this exact format:
[{"risk": "...", "mitigation": "..."}, {"risk": "...", "mitigation": "..."}, {"risk": "...", "mitigation": "..."}]

Each "risk" must be in Hebrew (5–10 words). Each "mitigation" must be in Hebrew (6–12 words).`;

  const raw = await callGemini(prompt, 'risk-radar', 0.8);
  console.log('[AI Engine] Risk Radar raw response:', raw);

  // Try to extract well-formed {risk, mitigation} objects from a parsed array
  const tryExtractObjects = (items: unknown[]): Array<{ risk: string; mitigation: string }> | null => {
    const objects = items
      .filter(item => item && typeof item === 'object' && 'risk' in (item as object))
      .map(item => ({
        risk:       sanitize(String((item as Record<string, unknown>).risk       ?? '')),
        mitigation: sanitize(String((item as Record<string, unknown>).mitigation ?? '')),
      }))
      .filter(item => item.risk.length > 3 && item.mitigation.length > 3)
      .slice(0, 3);
    return objects.length > 0 ? objects : null;
  };

  // Try to pair up flat strings as risk/mitigation alternates (Layer 3/4 fallback)
  const tryPairStrings = (items: unknown[]): Array<{ risk: string; mitigation: string }> | null => {
    const strings = items.map(s => sanitize(String(s))).filter(s => s.length > 3);
    if (strings.length < 2) return null;
    const pairs: Array<{ risk: string; mitigation: string }> = [];
    for (let i = 0; i + 1 < strings.length && pairs.length < 3; i += 2) {
      pairs.push({ risk: strings[i], mitigation: strings[i + 1] });
    }
    return pairs.length > 0 ? pairs : null;
  };

  const items = robustParse(raw);
  if (!items) {
    console.warn('[AI Engine] Risk Radar: all parse layers failed. Raw response that failed:', raw);
    return [];
  }

  // First try to read them as objects (normal case)
  const fromObjects = tryExtractObjects(items);
  if (fromObjects) {
    console.log('[AI Engine] Risk Radar parsed (objects):', fromObjects);
    return fromObjects;
  }

  // Fallback: AI sent prose/strings — pair them up
  const fromStrings = tryPairStrings(items);
  if (fromStrings) {
    console.log('[AI Engine] Risk Radar parsed (string pairs):', fromStrings);
    return fromStrings;
  }

  console.warn('[AI Engine] Risk Radar: could not extract risk/mitigation pairs. Raw response that failed:', raw);
  return [];
}

// ── Suggest mitigation plans for a specific barrier ─────────────────────────
export async function suggestMitigations(
  barrierRisk: string,
  taskTitle: string,
): Promise<string[]> {
  if (!barrierRisk.trim() || barrierRisk.trim().length < 6) return [];

  const prompt = `בפרויקט שיפור תהליכים בשם "${taskTitle}", זוהה החסם הבא:
"${barrierRisk}"

הצע 3 תוכניות מיתון קצרות וספציפיות להתמודדות עם חסם זה.
החזר 3 שורות בלבד, ללא מספור, עד 8 מילים בעברית לכל הצעה.`;

  const text = await callGemini(prompt, `mitigation:${barrierRisk.slice(0, 30)}`);
  const results = text
    .split('\n')
    .map(l => l.trim().replace(/^[#\-•*\d.)\s]+/, '').replace(/\*\*/g, '').replace(/[*_`]/g, '').trim())
    .filter(l => l.length > 3)
    .slice(0, 3);

  console.log('[AI Engine] Parsed mitigation suggestions:', results);
  return results;
}
