/**
 * Kaloriq – lokaler Dev-/LAN-Server (keine externen Abhaengigkeiten).
 *
 * Startet einen statischen Server fuer ./public und bietet optional einen
 * Gemini-Proxy unter /api/ai an, damit der API-Key auf dem Rechner bleibt.
 *
 *   npm start
 *   GEMINI_API_KEY=... npm start      (PowerShell: $env:GEMINI_API_KEY="..."; npm start)
 */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_BODY = 12 * 1024 * 1024; // 12 MB (Fotos als Base64)

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

function json(res, code, data) {
  send(res, code, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8' });
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('Payload zu gross');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Leitet eine generateContent-Anfrage an Gemini weiter (Key bleibt serverseitig). */
async function handleAi(req, res) {
  if (!GEMINI_KEY) return json(res, 501, { error: 'Auf dem Server ist kein GEMINI_API_KEY gesetzt.' });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (err) {
    return json(res, 400, { error: 'Ungueltiger JSON-Body.' });
  }
  const model = String(payload.model || 'gemini-3.8-flash').replace(/[^a-zA-Z0-9._-]/g, '');
  const body = {
    contents: payload.contents,
    generationConfig: payload.generationConfig,
    safetySettings: payload.safetySettings,
  };
  try {
    const upstream = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const text = await upstream.text();
    send(res, upstream.status, text, { 'Content-Type': 'application/json; charset=utf-8' });
  } catch (err) {
    json(res, 502, { error: `Gemini nicht erreichbar: ${err.message}` });
  }
}

/** Listet die Modelle, die der Server-Key nutzen darf (für die Auswahl in der App). */
async function handleModels(req, res) {
  if (!GEMINI_KEY) return json(res, 501, { error: 'Auf dem Server ist kein GEMINI_API_KEY gesetzt.' });
  try {
    const upstream = await fetch(`${GEMINI_BASE}?pageSize=200`, {
      headers: { 'x-goog-api-key': GEMINI_KEY, Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return json(res, upstream.status, { error: data?.error?.message || 'Modellliste nicht abrufbar.' });
    }
    const models = (data.models || []).map((m) => ({
      id: String(m.name || '').replace(/^models\//, ''),
      label: m.displayName || '',
      description: m.description || '',
      methods: m.supportedGenerationMethods || [],
    }));
    json(res, 200, { models });
  } catch (err) {
    json(res, 502, { error: `Gemini nicht erreichbar: ${err.message}` });
  }
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

  if (url.pathname === '/api/ai/config') return json(res, 200, { proxy: Boolean(GEMINI_KEY) });
  if (url.pathname === '/api/ai/models') return handleModels(req, res);
  if (url.pathname === '/api/ai' && req.method === 'POST') return handleAi(req, res);
  if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Unbekannter Endpunkt.' });

  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  const nets = Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal);
  console.log('\n  Kaloriq laeuft\n');
  console.log(`  Lokal:   http://localhost:${PORT}`);
  for (const net of nets) console.log(`  Handy:   http://${net.address}:${PORT}   (gleiches WLAN)`);
  console.log(`\n  KI-Proxy: ${GEMINI_KEY ? 'aktiv (Key auf dem Server)' : 'inaktiv (Key in der App eintragen)'}`);
  console.log('  Beenden mit Strg+C\n');
});
