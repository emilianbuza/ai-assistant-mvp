// server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { summarizeMessages, analyzeToTasks } from "./ai/assistant.js";
import { fetchSlackMessages } from "./integrations/slack.js";
import { fetchGmailMessages } from "./integrations/gmail.js";
import { setupInboxRoutes } from "./inbox/inbox.js";

dotenv.config();
const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Statisches UI
app.use(express.static(path.join(__dirname, "public")));

// Safe-Inbox Routen
setupInboxRoutes(app);

const PORT = process.env.PORT || 8080;

app.get("/health", (_req, res) => res.json({ ok: true, message: "Server is healthy" }));

app.get("/summarize", async (_req, res) => {
  try {
    const messages = [
      { source: "Slack", text: "Bitte Statusbericht für das Team-Meeting vorbereiten." },
      { source: "Gmail", text: "Rechnung für das Hosting ist fällig." },
      { source: "Calendar", text: "Termin mit Investor um 15:00 Uhr." }
    ];
    const summary = await summarizeMessages(messages);
    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/fetch", async (_req, res) => {
  try {
    const slackData = await fetchSlackMessages();
    const gmailData = await fetchGmailMessages();
    res.json({ ok: true, slack: slackData, gmail: gmailData });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/prioritize", async (req, res) => {
  try {
    const tasks = await analyzeToTasks([
      { source: "Demo", subject: "Rechnung Telekom", text: "Zahlung bis heute fällig" },
      { source: "Demo", subject: "Meetingplanung", text: "Team-Meeting für Freitag vorbereiten" }
    ]);
    res.json({ ok: true, tasks });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/tasks", (_req, res) => res.json({ ok: true, message: "Task list endpoint placeholder." }));

app.listen(PORT, () => {
  console.log(`AI Assistant MVP API listening on :${PORT}`);
});
