/**
 * Kaloriq – Upload-Paket fuer statisches Hosting bauen.
 *
 * Erzeugt ./dist mit genau den Dateien, die ins Web muessen (ohne Server,
 * ohne Node-Abhaengigkeiten). Diesen Ordner laedt man z. B. bei
 * Cloudflare Pages hoch – die Adresse bleibt danach fest.
 *
 *   npm run build:static
 */
import { cp, mkdir, rm, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist');

const HEADERS = `/manifest.webmanifest
  Content-Type: application/manifest+json

/sw.js
  Cache-Control: no-cache

/index.html
  Cache-Control: no-cache
`;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else {
      const info = await stat(full);
      files.push({ full, size: info.size });
    }
  }
  return files;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });
await writeFile(path.join(OUT, '_headers'), HEADERS, 'utf8');

const files = await walk(OUT);
const bytes = files.reduce((sum, f) => sum + f.size, 0);

console.log('');
console.log('  Upload-Paket erstellt: dist\\');
console.log(`  ${files.length} Dateien · ${(bytes / 1024).toFixed(1)} KB`);
console.log('');
console.log('  Hochladen: https://dash.cloudflare.com → Workers & Pages →');
console.log('             Create → Pages → Upload assets');
console.log('  Wichtig:   den INHALT von dist\\ hochladen (index.html muss oben liegen).');
console.log('');
