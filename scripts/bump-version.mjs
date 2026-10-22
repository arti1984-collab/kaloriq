/**
 * Kaloriq – Version erhoehen.
 *
 *   npm run bump            → Patch erhoehen (1.1.1 → 1.1.2)
 *   npm run bump 1.2.0      → feste Version setzen
 *
 * Aktualisiert an einer Stelle konsistent:
 *   1. package.json
 *   2. public/js/version.js        (Anzeige in der App)
 *   3. public/sw.js               (Cache-Name kaloriq-vN)
 *   4. dist\                      (Upload-Paket, wird neu gebaut)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PKG = path.join(ROOT, 'package.json');
const VER = path.join(ROOT, 'public', 'js', 'version.js');
const SW = path.join(ROOT, 'public', 'sw.js');

const arg = (process.argv[2] || '').trim();

function bumpPatch(v) {
  const [a, b, c] = v.split('.').map(Number);
  return `${a}.${b}.${(c || 0) + 1}`;
}

const pkg = JSON.parse(await readFile(PKG, 'utf8'));
const current = pkg.version;

let next = current;
if (arg) {
  if (!/^\d+\.\d+\.\d+$/.test(arg)) {
    console.error(`Ungueltige Version "${arg}". Erwartet z. B. 1.2.0`);
    process.exit(1);
  }
  next = arg;
} else {
  next = bumpPatch(current);
}

pkg.version = next;
await writeFile(PKG, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const ver = (await readFile(VER, 'utf8')).replace(
  /export const APP_VERSION = '[^']*';/,
  `export const APP_VERSION = '${next}';`
);
await writeFile(VER, ver, 'utf8');

const sw = (await readFile(SW, 'utf8'));
const hit = /const VERSION = 'kaloriq-v(\d+)';/.exec(sw);
const swNext = hit ? Number(hit[1]) + 1 : 1;
await writeFile(
  SW,
  sw.replace(/const VERSION = 'kaloriq-v\d+';/, `const VERSION = 'kaloriq-v${swNext}';`),
  'utf8'
);

console.log('');
console.log(`  Version: ${current} → ${next}`);
console.log(`  Service-Worker-Cache: kaloriq-v${swNext}`);

// Android-APK mit derselben Version (versionName + versionCode)
const GRADLE = path.join(ROOT, 'android-app', 'android', 'app', 'build.gradle');
try {
  const [A, B, C] = next.split('.').map(Number);
  const code = A * 10000 + B * 100 + C;
  let gradle = await readFile(GRADLE, 'utf8');
  gradle = gradle
    .replace(/versionCode \d+/, `versionCode ${code}`)
    .replace(/versionName "[^"]*"/, `versionName "${next}"`);
  await writeFile(GRADLE, gradle, 'utf8');
  console.log(`  Android-APK: versionName ${next} · versionCode ${code}`);
} catch {
  /* kein Android-Projekt vorhanden – überspringen */
}

console.log('');

try {
  const { stdout } = await run(process.execPath, [path.join(ROOT, 'scripts', 'build-static.mjs')], {
    cwd: ROOT,
  });
  console.log(stdout.trim());
} catch (err) {
  console.warn('  dist\\ konnte nicht gebaut werden:', err.message);
}
