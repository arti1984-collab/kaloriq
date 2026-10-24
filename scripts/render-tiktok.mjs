#!/usr/bin/env node
/**
 * Kleiner Dev-Server fuer die TikTok-Buehne (docs/tiktok/stage.html).
 *
 *   node scripts/render-tiktok.mjs           # Server auf Port 4180 starten
 *   node scripts/render-tiktok.mjs --port 4199
 *
 * Der Server liefert die Buehne samt App-Screenshots aus und nimmt die
 * fertige MP4 per POST /upload entgegen (Ablage: docs/tiktok/out/).
 * Keine Abhaengigkeiten, kein Build-Schritt.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs', 'tiktok', 'out');

const argPort = process.argv.indexOf('--port');
const PORT = argPort > -1 ? Number(process.argv[argPort + 1]) : 4180;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

/** Nur diese Bereiche duerfen ausgeliefert werden. */
const ALLOWED = ['docs/tiktok', 'docs/screenshots', 'public/icons'];

function allowed(rel) {
  const norm = rel.replace(/\\/g, '/');
  return ALLOWED.some((prefix) => norm === prefix || norm.startsWith(prefix + '/'));
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method === 'POST' && pathname === '/upload') {
    const raw = url.searchParams.get('name') || 'upload.bin';
    const name = path.basename(raw).replace(/[^\w.\-]/g, '_');
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, name);
    const stream = fs.createWriteStream(file);
    let bytes = 0;
    req.on('data', (chunk) => { bytes += chunk.length; });
    req.pipe(stream);
    stream.on('finish', () => {
      console.log(`[tiktok] gespeichert: ${path.relative(ROOT, file)} (${(bytes / 1048576).toFixed(2)} MB)`);
      send(res, 200, 'ok');
    });
    stream.on('error', (err) => send(res, 500, String(err)));
    return;
  }

  if (req.method !== 'GET') return send(res, 405, 'method not allowed');

  let rel = pathname === '/' ? '/docs/tiktok/stage.html' : pathname;
  rel = path.normalize(rel).replace(/^([/\\])+/, '');
  if (!allowed(rel)) return send(res, 403, 'verboten: ' + rel);

  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return send(res, 404, 'nicht gefunden: ' + rel);
  }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[tiktok] Buehne:  http://127.0.0.1:${PORT}/docs/tiktok/stage.html`);
  console.log(`[tiktok] Ausgabe:  ${path.relative(ROOT, OUT_DIR)}`);
  console.log('[tiktok] Aufnahme in der Seite starten, dann landet die MP4 im Ausgabeordner.');
});
