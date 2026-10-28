/* ============================================================
   Kaloriq – Update-Hinweis
   Prüft beim Start und danach alle paar Stunden, ob eine neue
   Version bereitsteht. Meldet sich ruhig (kein Zwang), zeigt die
   Neuerungen und aktualisiert auf Wunsch.

   Quelle ist /version.json (Version, Neuerungen, Release-Link).
   In der APK wird die Datei von der Web-Adresse geladen, weil die
   App selbst offline aus dem Paket läuft.
   ============================================================ */

import { store } from './store.js';
import { openSheet, toast, icon, esc } from './ui.js';
import { getLang } from './i18n.js';
import { APP_VERSION } from './version.js';

const STARTUP_DELAY = 250;
const GATES = {
  startup: 45 * 1000, // verhindert Doppel-Checks bei schnellen Reloads
  visible: 2 * 60 * 1000,
  poll: 12 * 60 * 1000,
  default: 12 * 60 * 1000,
};
const WEB_BASE = 'https://arti1984-collab.github.io/kaloriq';
const FALLBACK_RELEASE = 'https://github.com/arti1984-collab/kaloriq/releases/latest';
const TRUSTED_PREFIXES = [
  'https://github.com/arti1984-collab/kaloriq/',
  'https://arti1984-collab.github.io/kaloriq/',
];

let latest = null;
let checking = null;
let bannerEl = null;
let started = false;

/* ---------------- Helfer ---------------- */

export function isNativeApp() {
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function parts(version) {
  return String(version || '')
    .trim()
    .replace(/^v/i, '')
    .split(/[.\-+]/)
    .map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** true, wenn `candidate` neuer als `current` ist. */
export function isNewerVersion(candidate, current) {
  const a = parts(candidate);
  const b = parts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

function releaseUrl(value) {
  const url = typeof value === 'string' ? value.trim() : '';
  return TRUSTED_PREFIXES.some((prefix) => url.startsWith(prefix)) ? url : FALLBACK_RELEASE;
}

function notesOf(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((n) => typeof n === 'string' && n.trim())
    .map((n) => n.trim().slice(0, 220))
    .slice(0, 6);
}

async function loadLatest() {
  // Relativ zur App-Adresse auflösen – so stimmt der Pfad auch im
  // GitHub-Pages-Unterpfad. Die APK holt die Datei von der Web-Adresse.
  const target = isNativeApp()
    ? `${WEB_BASE}/version.json?t=${Date.now()}`
    : new URL(`version.json?t=${Date.now()}`, document.baseURI).toString();
  const response = await fetch(target, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data || !data.version) throw new Error('Ungültige Versionsdatei');
  return {
    version: String(data.version).trim(),
    date: typeof data.date === 'string' ? data.date : '',
    notes: notesOf(data.notes),
    notesEn: notesOf(data.notes_en),
    release: releaseUrl(data.release),
  };
}

/** Neuerungen in der aktuellen Sprache (Deutsch ist die Quelle). */
export function notesFor(info) {
  if (!info) return [];
  return getLang() === 'en' && info.notesEn?.length ? info.notesEn : (info.notes || []);
}

export function getUpdateState() {
  return {
    current: APP_VERSION,
    latest: latest?.version || '',
    available: Boolean(latest && isNewerVersion(latest.version, APP_VERSION)),
  };
}

/* ---------------- Prüfen ---------------- */

/** Stößt im Hintergrund auch die Service-Worker-Prüfung an. */
async function nudgeServiceWorker() {
  if (!('serviceWorker' in navigator) || isNativeApp()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    await registration.update?.();
  } catch {
    /* Service Worker ist optional. */
  }
}

function paintUpdateFlag(available) {
  if (available) document.body.dataset.updateReady = '1';
  else delete document.body.dataset.updateReady;
}

/**
 * Fragt die neueste Version ab. `manual` umgeht das Zeitintervall und
 * meldet das Ergebnis auch dann, wenn alles aktuell ist.
 * `reason` steuert das Intervall: startup, visible, poll, default.
 */
export function checkForUpdate({ manual = false, force = false, reason = 'default' } = {}) {
  if (!navigator.onLine) {
    if (manual) toast('Offline – Update-Prüfung nicht möglich', 'err');
    return Promise.resolve(null);
  }
  const settings = store.get().settings;
  const last = Number(settings.updateCheckedAt) || 0;
  const gate = manual || force ? 0 : (GATES[reason] ?? GATES.default);
  if (Date.now() - last < gate) {
    return Promise.resolve(latest);
  }
  if (checking) return checking;

  checking = (async () => {
    void nudgeServiceWorker();
    try {
      const info = await loadLatest();
      latest = info;
      const newer = isNewerVersion(info.version, APP_VERSION);
      store.saveSettings({
        updateCheckedAt: Date.now(),
        updateKnown: newer ? info : null,
      });
      paintUpdateFlag(newer);
      const dismissed = store.get().settings.updateDismissedVersion;
      if (newer) {
        if (dismissed !== info.version) showUpdateBanner(info);
        else hideUpdateBanner();
      } else {
        hideUpdateBanner();
        if (manual) toast('Du bist auf dem neuesten Stand');
      }
      window.dispatchEvent(new CustomEvent('kaloriq:update', { detail: info }));
      return info;
    } catch {
      if (manual) toast('Update-Prüfung nicht möglich', 'err');
      return null;
    } finally {
      checking = null;
    }
  })();

  return checking;
}

/* ---------------- Banner ---------------- */

function primaryAction(info, block = false) {
  if (isNativeApp()) {
    return `<a class="btn btn-primary btn-sm${block ? ' btn-block' : ''}" href="${esc(info.release)}" target="_blank" rel="noopener noreferrer">APK holen</a>`;
  }
  return `<button class="btn btn-primary btn-sm${block ? ' btn-block' : ''}" type="button" data-update-apply>Jetzt aktualisieren</button>`;
}

function showUpdateBanner(info) {
  hideUpdateBanner();
  const el = document.createElement('div');
  el.className = 'update-banner';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <span class="update-ico" aria-hidden="true">${icon('refresh')}</span>
    <button class="update-text" type="button" data-update-info>
      <span class="t">Update verfügbar</span>
      <span class="s">Version ${esc(info.version)} · was ist neu?</span>
    </button>
    ${primaryAction(info)}
    <button class="update-close" type="button" data-update-later aria-label="Später">${icon('x')}</button>
  `;

  el.querySelector('[data-update-info]')?.addEventListener('click', () => openUpdateSheet(info));
  el.querySelector('[data-update-apply]')?.addEventListener('click', () => applyUpdate());
  el.querySelector('[data-update-later]')?.addEventListener('click', () => dismissUpdate(info));

  document.body.appendChild(el);
  document.body.classList.add('update-open');
  bannerEl = el;
  // Layout einmal erzwingen, damit die Einblend-Animation auch in
  // Hintergrund-Tabs startet (rAF pausiert dort).
  void el.offsetHeight;
  el.classList.add('show');
}

export function hideUpdateBanner() {
  document.body.classList.remove('update-open');
  if (!bannerEl) return;
  const el = bannerEl;
  bannerEl = null;
  el.classList.remove('show');
  setTimeout(() => el.remove(), 240);
}

function dismissUpdate(info) {
  if (info?.version) store.saveSettings({ updateDismissedVersion: info.version });
  hideUpdateBanner();
}

/* ---------------- Details & Update ---------------- */

/**
 * Zeigt die Neuerungen und bietet das Update an.
 * Ohne Argument wird der zuletzt gefundene Stand genutzt.
 */
export function openUpdateSheet(info = latest) {
  if (!info) return;
  const native = isNativeApp();
  const notes = notesFor(info);

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-top:0">
      ${native
        ? 'Die neue APK lässt sich einfach über die App installieren. Deine Einträge und Einstellungen bleiben erhalten.'
        : 'Nach dem Update kannst du die neuen Funktionen direkt nutzen. Deine Einträge und Einstellungen bleiben erhalten.'}
    </p>
    ${notes.length ? `
      <div class="section-title" style="margin-top:4px">Was ist neu</div>
      <div class="card flush">
        ${notes.map((note) => `
          <div class="row static">
            <span class="update-check" aria-hidden="true">${icon('check')}</span>
            <span class="grow"><span class="t" style="white-space:normal">${esc(note)}</span></span>
          </div>`).join('')}
      </div>` : ''}
    <p class="tiny muted" style="margin-top:14px">
      Installiert: ${esc(APP_VERSION)} · Neu: ${esc(info.version)}
    </p>
  `;

  const foot = document.createElement('div');
  foot.className = 'update-foot';
  foot.innerHTML = `
    <button class="btn btn-ghost" type="button" data-update-later>Später</button>
    ${primaryAction(info, false)}
  `;

  const sheet = openSheet({
    title: 'Update verfügbar',
    subtitle: `Version ${info.version}`,
    body,
    footer: foot,
  });

  sheet.foot?.querySelector('[data-update-later]')?.addEventListener('click', () => {
    dismissUpdate(info);
    sheet.close();
  });
  sheet.foot?.querySelector('[data-update-apply]')?.addEventListener('click', () => {
    applyUpdate();
  });
}

/** Lädt die neue Version (PWA) bzw. öffnet die APK-Seite (Android). */
export async function applyUpdate() {
  if (isNativeApp()) {
    window.location.href = latest?.release || FALLBACK_RELEASE;
    return;
  }
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Kurz Zeit geben, damit der neue Worker übernehmen kann.
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    await registration?.update?.();
  } catch {
    /* Ohne Service Worker einfach neu laden. */
  }
  // Cache-Umgehung: frische Adresse erzwingt neue HTML- und JS-Dateien.
  const url = new URL(location.href);
  url.searchParams.set('v', latest?.version || String(Date.now()));
  location.replace(url.toString());
}

/* ---------------- Start ---------------- */

/** Nach dem Start aufrufen – prüft sofort und danach regelmäßig. */
export function initUpdateNotice() {
  if (!store.get().onboarded) return;

  // Bereits gemeldete Version sofort übernehmen (überlebt einen Neustart).
  const settings = store.get().settings;
  const known = settings.updateKnown;
  if (known?.version && isNewerVersion(known.version, APP_VERSION)) {
    latest = known;
    paintUpdateFlag(true);
    if (settings.updateDismissedVersion !== known.version) showUpdateBanner(known);
    window.dispatchEvent(new CustomEvent('kaloriq:update', { detail: known }));
  }

  if (started) return;
  started = true;

  // Kurz nach dem Start prüfen, damit der Hinweis schnell erscheint.
  setTimeout(() => { void checkForUpdate({ reason: 'startup' }); }, STARTUP_DELAY);

  // Bei jeder Rückkehr in die App (max. alle 2 Minuten).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate({ reason: 'visible' });
  });

  // Solange die App offen ist, regelmäßig nachsehen.
  setInterval(() => {
    if (document.visibilityState === 'visible') void checkForUpdate({ reason: 'poll' });
  }, GATES.poll);

  // Nach einer Unterbrechung der Verbindung sofort prüfen.
  window.addEventListener('online', () => void checkForUpdate({ force: true }));
}
