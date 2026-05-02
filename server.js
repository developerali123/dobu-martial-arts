/**
 * DoBu Martial Arts — Express server
 * Serves static frontend and exposes Supabase public config for the browser client.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
/** Only this machine by default. Set HOST=0.0.0.0 in .env to allow other devices on your LAN. */
const HOST = process.env.HOST || '127.0.0.1';

const publicDir = path.join(__dirname, 'public');

// JSON for API routes
app.use(express.json());

/**
 * Public Supabase credentials (anon key) are intended for client use.
 * Never put the service role key here.
 */
app.get('/api/supabase-config', (req, res) => {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) {
    return res.status(503).json({
      error: 'Supabase is not configured. Copy .env.example to .env and set SUPABASE_URL and SUPABASE_ANON_KEY.',
    });
  }
  res.json({ url, anonKey });
});

// Static assets (HTML, CSS, JS)
app.use(express.static(publicDir));

app.listen(PORT, HOST, () => {
  const url = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log('');
  console.log('  DoBu Martial Arts — site is live ONLY while this process is running.');
  console.log(`  Open in browser: ${url}`);
  console.log('  Stop the server (Ctrl+C) and this address will stop working.');
  console.log('');
});
