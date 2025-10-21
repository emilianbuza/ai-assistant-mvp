// integrations/slack.js
// Holt neue Slack-Nachrichten über die Slack Web API (bis zu "limit" quer über Channels/IMs)

const { WebClient } = require('@slack/web-api');

async function fetchLatestSlackMessages({ token, limit = 10 }) {
  if (!token) return [];
  const client = new WebClient(token);

  // 1) Liste relevanter Konversationen (öffentliche/privat, DMs)
  const channels = [];
  let cursor;
  do {
    const resp = await client.users.conversations({
      types: 'public_channel,private_channel,im,mpim',
      exclude_archived: true,
      limit: 200,
      cursor,
    });
    (resp.channels || resp.conversations || []).forEach(ch => channels.push(ch));
    cursor = resp.response_metadata?.next_cursor;
  } while (cursor && cursor.length > 0 && channels.length < 200);

  // Früh beenden, wir brauchen nur die aktivsten paar
  const topChannels = channels.slice(0, 15);

  // 2) Aus jedem Kanal ein paar Messages holen, bis wir "limit" zusammen haben
  const results = [];
  for (const ch of topChannels) {
    if (results.length >= limit) break;
    const history = await client.conversations.history({
      channel: ch.id,
      limit: Math.min(50, limit), // kleine Batches
      include_all_metadata: true,
    }).catch(() => ({ messages: [] }));

    const msgs = (history.messages || [])
      .filter(m => m?.text && !m.subtype) // nur "normale" Messages
      .map(m => ({
        channel: ch.id,
        channelName: channelDisplayName(ch),
        user: m.user || m.username || '',
        text: m.text,
        ts: m.ts,
      }));

    for (const msg of msgs) {
      results.push(msg);
      if (results.length >= limit) break;
    }
  }

  // Sortiert nach Zeit (absteigend)
  results.sort((a, b) => Number(b.ts) - Number(a.ts));
  return results.slice(0, limit);
}

function channelDisplayName(ch) {
  if (!ch) return 'Channel';
  if (ch.is_im) return 'Direct Message';
  if (ch.is_mpim) return ch.name || 'Group DM';
  return ch.name || 'Channel';
}

module.exports = { fetchLatestSlackMessages };
