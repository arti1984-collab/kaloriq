/**
 * Kaloriq – Build für GitHub Pages.
 *
 * GitHub Pages liefert die App unter einem Unterpfad aus:
 *   https://<user>.github.io/<repo>/
 *
 * Die App-Quelle nutzt absolute Pfade ("/js/app.js"), die dort ins Leere
 * zeigen würden. Dieser Build kopiert public/ nach dist-pages/ und macht
 * alle Pfade relativ. Android/Cloudflare bleiben unverändert.
 *
 *   npm run build:pages
 */
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SRC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'dist-pages');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });

// index.html: "/..." -> "./..."
const indexPath = path.join(OUT, 'index.html');
let html = await readFile(indexPath, 'utf8');
html = html.replace(/(href|src)="\/(?!\/)/g, '$1="./');
await writeFile(indexPath, html, 'utf8');

// manifest.webmanifest: Start, Scope, Icons und Shortcuts relativ machen.
const manifestPath = path.join(OUT, 'manifest.webmanifest');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.start_url = './?source=pwa';
manifest.scope = './';
manifest.icons = (manifest.icons || []).map((icon) => ({
  ...icon,
  src: String(icon.src || '').replace(/^\//, ''),
}));
manifest.shortcuts = (manifest.shortcuts || []).map((shortcut) => ({
  ...shortcut,
  url: String(shortcut.url || '').replace(/^\//, './'),
  icons: (shortcut.icons || []).map((icon) => ({
    ...icon,
    src: String(icon.src || '').replace(/^\//, ''),
  })),
}));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

// Service Worker: App-Shell relativ zu /<repo>/ cachen.
const swPath = path.join(OUT, 'sw.js');
let sw = await readFile(swPath, 'utf8');
sw = sw.replace(/'(\/(?!api\/)[^']*)'/g, (_, value) =>
  value === '/' ? "'./'" : `'./${value.slice(1)}'`
);
await writeFile(swPath, sw, 'utf8');

// Service Worker wird relativ zum Dokument registriert (GitHub-Unterpfad).
// Die Quelle nutzt bereits './sw.js'; ältere Schreibweisen werden weiterhin
// umgeschrieben.
const appPath = path.join(OUT, 'js', 'app.js');
let app = await readFile(appPath, 'utf8');
app = app.replace(/register\('\/sw\.js'/g, "register('./sw.js'");
await writeFile(appPath, app, 'utf8');

// GitHub Pages soll die Dateien unverändert ausliefern.
await writeFile(path.join(OUT, '.nojekyll'), '', 'utf8');

console.log('');
console.log('  GitHub-Pages-Paket erstellt: dist-pages\\');
console.log('  URL: https://arti1984-collab.github.io/kaloriq/');
console.log('  Pfade: relativ (funktioniert auch in Unterordnern)');
console.log('');
