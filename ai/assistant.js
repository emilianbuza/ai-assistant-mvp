import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function tryExtractJSON(text) {
  try {
    // Finde den JSON-Block in der Antwort
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function analyzeToTasks(messages = []) {
  if (!messages || !messages.length) {
    return [
      {
        title: "Keine Nachrichten gefunden",
        priority: 3,
        reason: "",
        effort_minutes: 0,
        due: null,
        suggested_timebox: null,
        steps: []
      }
    ];
  }

  const corpus = messages
    .map(
      (m, i) =>
        `${i + 1}. Quelle: ${m.source || "Gmail"} | Betreff: ${m.subject || "—"} | Inhalt: ${m.text || m.snippet || ""}`
    )
    .join("\n");

  const systemPrompt = `
Du bist ein KI-Assistent, der eingehende E-Mails und Benachrichtigungen analysiert und daraus eine priorisierte To-Do-Liste erstellt.

Antworte AUSSCHLIESSLICH mit gültigem JSON nach diesem Schema:
{
  "tasks": [
    {
      "title": "kurze prägnante Aufgabenbeschreibung im Imperativ",
      "priority": 1, // 1=Dringend (heute), 2=Wichtig (48h), 3=Später
      "reason": "kurze Begründung, warum diese Priorität angemessen ist",
      "effort_minutes": 10,
      "due": "2025-10-21T15:00:00" oder null,
      "suggested_timebox": "Heute 14:00–14:30" oder null,
      "steps": ["maximal 5 konkrete Handlungsschritte"]
    }
  ]
}

Vermeide Einleitungen, Erklärungen, Fließtext oder Markdown.
`;

  const userPrompt = `Analysiere folgende E-Mails und extrahiere daraus Aufgaben mit Priorität, Begründung, Zeitaufwand und Schrittfolge:
${corpus}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 1200
  });

  const rawOutput = completion.choices?.[0]?.message?.content?.trim() || "";
  const parsed = tryExtractJSON(rawOutput);

  if (parsed?.tasks && Array.isArray(parsed.tasks)) {
    const normalized = parsed.tasks.map((t) => ({
      title: String(t.title || "").trim(),
      priority: Number(t.priority || 3),
      reason: String(t.reason || ""),
      effort_minutes: Number(t.effort_minutes || 30),
      due: t.due || null,
      suggested_timebox: t.suggested_timebox || null,
      steps: Array.isArray(t.steps) ? t.steps.slice(0, 5) : []
    }));
    normalized.sort((a, b) => a.priority - b.priority || a.effort_minutes - b.effort_minutes);
    return normalized;
  }

  // Fallback, falls GPT wieder kein gültiges JSON liefert
  return [
    {
      title: "Analyse fehlgeschlagen – bitte erneut versuchen",
      priority: 3,
      reason: "Antwort enthielt kein gültiges JSON",
      effort_minutes: 10,
      due: null,
      suggested_timebox: "Heute 16:00–16:10",
      steps: ["Eingabe prüfen", "Erneut analysieren"]
    }
  ];
}

export async function summarizeMessages(messages = []) {
  const joined = messages.map((m) => `${m.source || "Gmail"}: ${m.text || m.snippet || ""}`).join("\n");
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Fasse die Inhalte prägnant in maximal 5 Punkten zusammen." },
      { role: "user", content: joined }
    ],
    temperature: 0.3,
    max_tokens: 400
  });
  return completion.choices[0].message.content.trim();
}
