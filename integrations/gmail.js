// integrations/gmail.js
// Holt die letzten N E-Mails mit Betreff, From, Snippet (lesend via OAuth2 Refresh Token)

const { google } = require('googleapis');

async function fetchLatestGmailMessages({ creds, limit = 10 }) {
  const { clientId, clientSecret, redirectUri, refreshToken } = creds || {};
  if (!clientId || !clientSecret || !refreshToken) return [];

  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri || 'http://localhost');
  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

  // 1) IDs der letzten Nachrichten
  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults: Math.min(50, Math.max(1, limit * 3)), // etwas Puffer
    q: '', // optional: 'newer_than:7d'
  });

  const ids = (list.data.messages || []).slice(0, limit).map(m => m.id);
  if (!ids.length) return [];

  // 2) Details pro Nachricht
  const messages = [];
  for (const id of ids) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    }).catch(() => null);

    if (!msg || !msg.data) continue;

    const headers = msg.data.payload?.headers || [];
    const subject = headerValue(headers, 'Subject');
    const from = headerValue(headers, 'From');
    const date = headerValue(headers, 'Date');

    messages.push({
      id: msg.data.id,
      threadId: msg.data.threadId,
      labelIds: msg.data.labelIds || [],
      internalDate: msg.data.internalDate,
      snippet: msg.data.snippet || '',
      subject: subject || '',
      from: from || '',
      date: date || '',
    });
  }

  // Sort nach Zeit absteigend
  messages.sort((a, b) => Number(b.internalDate || 0) - Number(a.internalDate || 0));
  return messages.slice(0, limit);
}

function headerValue(headers, name) {
  const h = headers.find(x => (x.name || '').toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

module.exports = { fetchLatestGmailMessages };
