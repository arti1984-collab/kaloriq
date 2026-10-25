/**
 * Kaloriq – lokaler Dev-/LAN-Server (keine externen Abhaengigkeiten).
 *
 * Startet einen statischen Server fuer ./public.
 * Es gibt bewusst KEINEN Gemini-Proxy: Jede Person traegt ihren eigenen
 * API-Key in der App ein, damit kein geteilter Key entsteht.
 *
 *   npm start
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) return send(res, 404, 'Not found');
    const data = await readFile(filePath);
    const type = TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    // Nur Icons dürfen lange cachen – Code und HTML immer frisch ausliefern,
    // damit Updates sofort ankommen (Offline übernimmt der Service Worker).
    const cache = pathname.startsWith('/icons/') ? 'public, max-age=604800' : 'no-cache';
    send(res, 200, data, { 'Content-Type': type, 'Cache-Control': cache });
  } catch {
    // SPA-Fallback fuer unbekannte Pfade
    try {
      const html = await readFile(path.join(ROOT, 'index.html'));
      send(res, 200, html, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' });
    } catch {
      send(res, 404, 'Not found');
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  const nets = Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal);
  console.log('\n  Kaloriq laeuft\n');
  console.log(`  Lokal:   http://localhost:${PORT}`);
  for (const net of nets) console.log(`  Handy:   http://${net.address}:${PORT}   (gleiches WLAN)`);
  console.log('\n  KI: eigener Gemini-Key pro Person (Profil → KI-Tracking), nur Free-Tier-Modelle.');
  console.log('  Beenden mit Strg+C\n');
});
