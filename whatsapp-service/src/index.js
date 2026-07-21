import express from 'express';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import P from 'pino';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.join(__dirname, '../.wa-session');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_KEY = process.env.API_KEY || 'wh-sk-CHANGE_ME';
const PORT = parseInt(process.env.PORT || '3000');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const logger = P({ level: 'warn' });

let sock = null;
let qrDataUrl = null;
let status = 'disconnected';
let reconnectTimer = null;
let syncTimer = null;

// ── Session persistence in Supabase ──────────────────────────────────────────

async function loadSession() {
  const { data } = await supabase.from('whatsapp_session').select('key, value');
  if (!data?.length) return console.log('[session] No saved session');

  await fs.mkdir(SESSION_DIR, { recursive: true });
  await fs.mkdir(path.join(SESSION_DIR, 'keys'), { recursive: true });

  for (const { key, value } of data) {
    const rel = key.replace(/\|/g, path.sep);
    const file = path.join(SESSION_DIR, rel);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, value, 'utf-8');
  }
  console.log(`[session] Loaded ${data.length} files from Supabase`);
}

async function saveSession() {
  const rows = [];

  const readDir = async (dir, prefix) => {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const key = prefix ? `${prefix}|${e.name}` : e.name;
      if (e.isDirectory()) {
        await readDir(full, key);
      } else if (e.name.endsWith('.json')) {
        const value = await fs.readFile(full, 'utf-8').catch(() => null);
        if (value) rows.push({ key, value });
      }
    }
  };

  await readDir(SESSION_DIR, '');
  if (!rows.length) return;

  const { error } = await supabase
    .from('whatsapp_session')
    .upsert(rows, { onConflict: 'key' });

  if (error) console.error('[session] Save error:', error.message);
  else console.log(`[session] Saved ${rows.length} files`);
}

// ── WhatsApp connection ───────────────────────────────────────────────────────

async function connect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  status = 'connecting';

  await loadSession();
  await fs.mkdir(SESSION_DIR, { recursive: true });

  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Safety Bot', 'Chrome', '120.0'],
    connectTimeoutMs: 20000,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrDataUrl = await QRCode.toDataURL(qr);
      status = 'awaiting_qr';
      console.log('[wa] QR ready — visit /qr');
    }

    if (connection === 'close') {
      status = 'disconnected';
      qrDataUrl = null;
      if (syncTimer) clearInterval(syncTimer);

      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`[wa] Connection closed (code=${code})`);

      if (code === DisconnectReason.loggedOut) {
        console.log('[wa] Logged out — clearing session');
        await supabase.from('whatsapp_session').delete().neq('key', '!!!');
        await fs.rm(SESSION_DIR, { recursive: true, force: true });
      } else {
        reconnectTimer = setTimeout(connect, 5000);
      }
    }

    if (connection === 'open') {
      status = 'connected';
      qrDataUrl = null;
      console.log('[wa] Connected!');
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(saveSession, 60_000);
    }
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    await saveSession();
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

const auth = (req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Keep-alive endpoint (pinged by cron-job.org every 10 min)
app.get('/health', (_req, res) => {
  res.json({ ok: true, status });
});

// QR code page — open in browser to scan once
app.get('/qr', (_req, res) => {
  if (status === 'connected') {
    return res.send(html('✅ WhatsApp מחובר!', '<p>הבוט פעיל ומוכן לשלוח הודעות.</p>'));
  }
  if (!qrDataUrl) {
    return res.send(
      html('⏳ ממתין לחיבור...', '<p>רענן את הדף בעוד כמה שניות.</p><script>setTimeout(()=>location.reload(),4000)</script>')
    );
  }
  return res.send(
    html(
      '📱 סרוק עם WhatsApp',
      `<p>פתח WhatsApp ← שלוש נקודות ← מכשירים מקושרים ← קשר מכשיר</p>
       <img src="${qrDataUrl}" style="max-width:280px;margin:16px auto;display:block;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15)" />
       <script>setTimeout(()=>location.reload(),28000)</script>`
    )
  );
});

// List all groups this number is in
app.get('/groups', auth, async (_req, res) => {
  if (status !== 'connected') return res.status(503).json({ error: 'Not connected', status });
  try {
    const groups = await sock.groupFetchAllParticipating();
    res.json(
      Object.values(groups).map((g) => ({
        id: g.id,
        name: g.subject,
        participants: g.participants?.length ?? 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message to a group
app.post('/send', auth, async (req, res) => {
  const { groupId, message } = req.body ?? {};
  if (!groupId || !message) return res.status(400).json({ error: 'groupId and message required' });
  if (status !== 'connected') return res.status(503).json({ error: 'Not connected', status });

  try {
    await sock.sendMessage(groupId, { text: message });
    res.json({ success: true });
  } catch (err) {
    console.error('[send]', err.message);
    res.status(500).json({ error: err.message });
  }
});

function html(title, body) {
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
  <style>body{font-family:sans-serif;text-align:center;padding:40px;background:#f5f5f5}
  h1{color:#333}p{color:#666}</style></head><body><h1>${title}</h1>${body}</body></html>`;
}

connect().catch(console.error);
app.listen(PORT, () => console.log(`[server] Listening on :${PORT}`));
