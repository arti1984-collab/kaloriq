/**
 * Startet einen Cloudflare-Quick-Tunnel auf den lokalen Server.
 * Damit bekommt die App eine https://-Adresse – Voraussetzung dafür,
 * dass Chrome sie als App installiert (Service Worker + Install-Prompt).
 *
 * Aufruf: npm run tunnel
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = process.env.PORT || 4173;
const target = `http://localhost:${PORT}`;

const candidates = [
  process.env.CLOUDFLARED_PATH,
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'cloudflared', 'cloudflared.exe') : null,
  path.join(process.cwd(), 'cloudflared.exe'),
].filter(Boolean);

const exe = candidates.find((p) => existsSync(p));

if (!exe) {
  console.error(`
  cloudflared wurde nicht gefunden.

  Einmalig installieren (PowerShell):
    New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\\cloudflared" | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "$env:LOCALAPPDATA\\cloudflared\\cloudflared.exe"

  Danach erneut: npm run tunnel
`);
  process.exit(1);
}

console.log(`\n  Tunnel für ${target} startet…`);
console.log('  Gleich erscheint eine https://…trycloudflare.com-Adresse.');
console.log('  Diese Adresse am Handy öffnen und dort installieren.\n');

const child = spawn(exe, ['tunnel', '--url', target, '--no-autoupdate'], {
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => child.kill('SIGINT'));
