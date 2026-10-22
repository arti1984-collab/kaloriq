/* ============================================================
   Kopiert den gebauten Web-Stand (dist/) nach android-app/www.
   Wird vor jedem `cap sync` ausgeführt.
   ============================================================ */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'dist');
const dest = join(here, 'www');

if (!existsSync(join(src, 'index.html'))) {
  console.error('dist/ fehlt. Bitte zuerst `npm run build:static` im Projektordner ausführen.');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

console.log('Web-Stand kopiert: dist/ → android-app/www/');
