// server.js
// Express-Server mit Routen: /fetch, /summarize, /prioritize, /tasks

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { fetchLatestSlackMessages } = require('./integrations/slack');
const { fetchLatestGmailMessages } = require('./integrations/gmail');
const {
  summarizeItems,
  prioritizeItems,
  buildDailyActionList,
} = require('./ai/assistant');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// In-Memory Store (MVP)
const store = {
  items: [],       // { id, source, title, content, ts }
  summary: null,   // string
  tasks: [],       // [{title, reason, priority, due, sourceIds:[]}]
  lastFetchAt: null,
};

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// /fetch: holt Slack + Gmail (jeweils bis zu 10), normalisiert und speichert
app.get('/fetch', async (req, res) => {
  try {
    const slackToken = req.headers['x-slack-token'] || process.env.SLACK_BOT_TOKEN;
    const gmailCreds = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost',
      refreshToken: req.headers['x-google-refresh-token'] || process.env.GOOGLE_REFRESH_TOKEN,
    };

    const [slack, gmail] = await Promise.all([
      fetchLatestSlackMessages({ token: slackToken, limit: 10 }).catch(() => []),
      fetchLatestGmailMessages({ creds: gmailCreds, limit: 10 }).catch(() => []),
    ]);

    // Normalisieren
    const normalizedSlack = slack.map(m => ({
      id: `slack:${m.channel}:${m.ts}`,
      source: 'slack',
      title: m.channelName ? `Slack • ${m.channelName}` : 'Slack',
      content: m.text || '',
      ts: Number(m.ts) ? Number(m.ts) * 1000 : Date.now(),
      meta: { user: m.user, channel: m.channel },
    }));

    const normalizedGmail = gmail.map(m => ({
      id: `gmail:${m.id}`,
      source: 'gmail',
      title: m.subject || 'E-Mail',
      content: `${m.snippet || ''}\nFrom: ${m.from || ''}`,
      ts: m.internalDate ? Number(m.internalDate) : Date.now(),
      meta: { threadId: m.threadId, from: m.from, labelIds: m.labelIds || [] },
    }));

    // Mergen + deduplizieren nach id
    const merged = [...normalizedSlack, ...normalizedGmail];
    const seen = new Set();
    const unique = merged.filter(i => (seen.has(i.id) ? false : seen.add(i.id)));

    // Sort nach Zeit absteigend
    unique.sort((a, b) => b.ts - a.ts);

    store.items = unique;
    store.lastFetchAt = new Date().toISOString();
    store.summary = null;
    store.tasks = [];

    res.json({
      ok: true,
      count: unique.length,
      lastFetchAt: store.lastFetchAt,
      sources: { slack: normalizedSlack.length, gmail: normalizedGmail.length },
      items: unique,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'fetch_failed' });
  }
});

// /summarize: fasst aktuelle Items zusammen (oder übergebenes Array)
app.post('/summarize', async (req, res) => {
  try {
    const openaiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;
    const items = Array.isArray(req.body?.items) && req.body.items.length ? req.body.items : store.items;

    const summary = await summarizeItems({ apiKey: openaiKey, items });
    store.summary = summary;

    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'summarize_failed' });
  }
});

// /prioritize: erzeugt priorisierte Aufgabenliste aus Items
app.post('/prioritize', async (req, res) => {
  try {
    const openaiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;
    const items = Array.isArray(req.body?.items) && req.body.items.length ? req.body.items : store.items;

    const tasks = await prioritizeItems({ apiKey: openaiKey, items });
    store.tasks = tasks;

    res.json({ ok: true, tasks });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'prioritize_failed' });
  }
});

// /tasks: kombiniert (falls nötig) zusammenfassen+priorisieren zu täglicher Liste
app.get('/tasks', async (req, res) => {
  try {
    const openaiKey = req.headers['x-openai-key'] || process.env.OPENAI_API_KEY;
    if (!store.items.length) return res.json({ ok: true, tasks: [], summary: null });

    if (!store.summary || !store.tasks.length) {
      const { summary, tasks } = await buildDailyActionList({ apiKey: openaiKey, items: store.items });
      store.summary = summary;
      store.tasks = tasks;
    }

    res.json({
      ok: true,
      summary: store.summary,
      tasks: store.tasks,
      count: store.tasks.length,
      lastFetchAt: store.lastFetchAt,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'tasks_failed' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AI Assistant MVP API listening on :${PORT}`);
});
