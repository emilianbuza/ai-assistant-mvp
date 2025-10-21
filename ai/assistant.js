// ai/assistant.js
// Nutzt OpenAI, um aus Items (Slack/Gmail) Zusammenfassung + priorisierte Aufgaben zu erzeugen.

const OpenAI = require('openai');

// Hilfsfunktion: OpenAI Client
function clientFor(apiKey) {
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  return new OpenAI({ apiKey });
}

// Kurzer, robuster Serializer für die Items
function serializeItems(items = []) {
  return items.slice(0, 40).map((it, i) => {
    const dt = it.ts ? new Date(it.ts).toISOString() : '';
    const title = it.title ? String(it.title).slice(0, 120) : '';
    const content = (it.content || '').replace(/\s+/g, ' ').slice(0, 800);
    const source = it.source || 'unknown';
    return `${i + 1}. [${source}] ${title} — ${content} (${dt})`;
  }).join('\n');
}

// Zusammenfassung
async function summarizeItems({ apiKey, items }) {
  const openai = clientFor(apiKey);
  const content = [
    {
      role: 'system',
      content:
        'Du bist ein präziser Executive Assistant. Fasse knappe, belastbare Bullet-Points zusammen. Keine Erfindungen.',
    },
    {
      role: 'user',
      content:
        `Fasse die folgenden Nachrichten, E-Mails und Notizen in 5–8 prägnanten Punkten zusammen. Hebe Termine/Fristen hervor:\n\n${serializeItems(items)}`,
    },
  ];

  const resp = await safeRespond(openai, content);
  return resp;
}

// Priorisierung
async function prioritizeItems({ apiKey, items }) {
  const openai = clientFor(apiKey);
  const content = [
    {
      role: 'system',
      content:
        'Du agierst als Chief of Staff. Erzeuge eine klare, priorisierte Tages-To-Do-Liste. Maximal 8 Tasks. Jede Task mit: title, reason, priority (1-5, 1=kritisch), due (ISO oder leer), sourceIds (IDs als Liste). Antworte NUR als JSON-Array.',
    },
    {
      role: 'user',
      content:
        `Hier sind Inputs (mit IDs). Forme daraus die Tagesliste. Keine Dubletten. Ziehe Termine/Eskalationen vor. JSON ONLY:\n\n${JSON.stringify(items.map(i => ({
          id: i.id,
          source: i.source,
          title: i.title,
          content: (i.content || '').slice(0, 1000),
          ts: i.ts || null,
        })), null, 2)}`,
    },
  ];

  const raw = await safeRespond(openai, content);
  const tasks = tryParseJsonArray(raw);
  if (Array.isArray(tasks)) return sanitizeTasks(tasks);
  // Fallback: einfache Heuristik
  return heuristicTasks(items);
}

// Kombi für /tasks
async function buildDailyActionList({ apiKey, items }) {
  const [summary, tasks] = await Promise.all([
    summarizeItems({ apiKey, items }),
    prioritizeItems({ apiKey, items }),
  ]);
  return { summary, tasks };
}

// OpenAI Helper: Responses API mit Fallback
async function safeRespond(openai, messages) {
  // Versuche Responses API
  try {
    const r = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n'),
      temperature: 0.2,
    });
    const text = extractTextFromResponse(r);
    if (text) return text.trim();
  } catch (_) {
    // ignore, fallback unten
  }

  // Fallback: Chat Completions
  const r2 = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    messages,
  });
  return (r2.choices?.[0]?.message?.content || '').trim();
}

function extractTextFromResponse(r) {
  const c = r?.output_text;
  if (c && typeof c === 'string') return c;
  const blocks = r?.output || r?.content || [];
  if (Array.isArray(blocks)) {
    const txt = blocks
      .map(b => (typeof b === 'string' ? b : (b?.text || b?.content || '')))
      .filter(Boolean)
      .join('\n');
    if (txt) return txt;
  }
  return null;
}

function tryParseJsonArray(s) {
  if (!s || typeof s !== 'string') return null;
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeTasks(tasks) {
  const out = [];
  for (const t of tasks) {
    if (!t || typeof t !== 'object') continue;
    const title = String(t.title || '').trim();
    if (!title) continue;
    const reason = String(t.reason || '').trim();
    let priority = Number.isFinite(t.priority) ? Number(t.priority) : 3;
    priority = Math.min(5, Math.max(1, priority));
    const due = t.due ? String(t.due).trim() : '';
    const sourceIds = Array.isArray(t.sourceIds) ? t.sourceIds.slice(0, 8).map(String) : [];
    out.push({ title, reason, priority, due, sourceIds });
  }
  // Sortieren: priority asc, dann due (falls vorhanden)
  out.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.due && b.due) return new Date(a.due) - new Date(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
  return out.slice(0, 8);
}

// Heuristischer Fallback, wenn JSON nicht parsebar
function heuristicTasks(items = []) {
  const ranked = items
    .map(i => ({
      title: guessTitle(i),
      reason: `Relevanz aus ${i.source}`,
      priority: guessPriority(i),
      due: guessDue(i),
      sourceIds: [i.id],
    }))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);
  return ranked;
}

function guessTitle(i) {
  if (!i) return 'Aufgabe';
  const title = (i.title || '').trim();
  if (title) return title;
  const firstWords = (i.content || '').split(/\s+/).slice(0, 6).join(' ');
  return firstWords || 'Aufgabe';
}

function guessPriority(i) {
  const c = `${i.title || ''} ${i.content || ''}`.toLowerCase();
  if (/\b(deadline|due|eod|morgen|tomorrow|urgent|dringend|fr(i|ist))\b/.test(c)) return 1;
  if (/\b(meeting|termin|call|review)\b/.test(c)) return 2;
  if (/\b(client|kunde|proposal|angebot)\b/.test(c)) return 2;
  return 3;
}

function guessDue(i) {
  const c = `${i.title || ''} ${i.content || ''}`.toLowerCase();
  if (/\btoday|heute|eod\b/.test(c)) return new Date().toISOString().slice(0, 10);
  return '';
}

module.exports = {
  summarizeItems,
  prioritizeItems,
  buildDailyActionList,
};
