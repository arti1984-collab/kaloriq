/**
 * Kaloriq – APK bauen.
 *
 *   npm run apk
 *
 * Ablauf:
 *   1. dist/ neu bauen (build-static)
 *   2. dist/ → android-app/www kopieren
 *   3. Capacitor synchronisieren
 *   4. Release-APK bauen (signiert mit android-app/keystore)
 *   5. APK als Kaloriq-<Version>.apk ins Projektverzeichnis legen
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const APP = path.join(ROOT, 'android-app');
const ANDROID = path.join(APP, 'android');
const isWin = process.platform === 'win32';

function findJdk() {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const base = 'C:\\Program Files\\Eclipse Adoptium';
  if (!existsSync(base)) return '';
  const dir = readdirSync(base).find((name) => name.startsWith('jdk-'));
  return dir ? path.join(base, dir) : '';
}

function findSdk() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const guess = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
  return existsSync(guess) ? guess : '';
}

const javaHome = findJdk();
const sdk = findSdk();

if (!javaHome) {
  console.error('Kein JDK gefunden. Bitte JDK 21 installieren (winget install EclipseAdoptium.Temurin.21.JDK).');
  process.exit(1);
}
if (!sdk) {
  console.error('Android SDK nicht gefunden. Erwartet unter %LOCALAPPDATA%\\Android\\Sdk.');
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: sdk,
  ANDROID_SDK_ROOT: sdk,
  Path: `${path.join(javaHome, 'bin')};${path.join(sdk, 'platform-tools')};${process.env.Path || ''}`,
};

function run(cmd, args, cwd, inherit = false) {
  if (isWin && cmd.endsWith('.cmd')) {
    return execFileSync('cmd.exe', ['/c', cmd, ...args], {
      cwd,
      env,
      stdio: inherit ? 'inherit' : 'pipe',
      encoding: 'utf8',
    });
  }
  return execFileSync(cmd, args, {
    cwd,
    env,
    stdio: inherit ? 'inherit' : 'pipe',
    encoding: 'utf8',
  });
}

if (!existsSync(path.join(ANDROID, 'gradlew.bat'))) {
  console.error('android-app/android fehlt. Bitte zuerst "npx cap add android" in android-app ausführen.');
  process.exit(1);
}

console.log('1/4  Web-Stand bauen …');
console.log(run(process.execPath, [path.join(ROOT, 'scripts', 'build-static.mjs')], ROOT).trim());

console.log('2/4  Dateien nach android-app/www kopieren …');
console.log(run(process.execPath, [path.join(APP, 'prepare.mjs')], APP).trim());

console.log('3/4  Capacitor synchronisieren …');
console.log(run(isWin ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android'], APP).trim());

console.log('4/4  Release-APK bauen …');
execFileSync(
  isWin ? 'cmd.exe' : path.join(ANDROID, 'gradlew'),
  isWin ? ['/c', path.join(ANDROID, 'gradlew.bat'), 'assembleRelease', '--console=plain'] : ['assembleRelease', '--console=plain'],
  { cwd: ANDROID, env, stdio: 'inherit' }
);

const src = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!existsSync(src)) {
  console.error('APK wurde nicht gebaut.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const dest = path.join(ROOT, `Kaloriq-${pkg.version}.apk`);
copyFileSync(src, dest);

console.log('');
console.log(`  APK: ${dest}`);
console.log('  Aufs Handy kopieren (oder per USB) und dort antippen → installieren.');
console.log('  Hinweis: "Unbekannte Quellen" für die Datei-App/den Browser erlauben.');
