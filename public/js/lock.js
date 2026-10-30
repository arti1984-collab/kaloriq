/* ============================================================
   Kaloriq – App-Sperre (PIN, in der APK zusätzlich Gerätesperre)
   Schützt vor fremden Blicken auf einem entsperrten Handy.
   Der PIN wird nur als Hash gespeichert, nie im Klartext.
   ============================================================ */
import { store } from './store.js';
import { tr, applyI18n } from './i18n.js';
import { icon, haptic } from './ui.js';

const ITERATIONS = 210000;
const FALLBACK_ITERATIONS = 15000;
const DEFAULT_AFTER = 0; // Minuten im Hintergrund, 0 = sofort beim Start

/* ---------------- Hash (PBKDF2, sonst reines SHA-256) ---------------- */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;

function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const size = ((bytes.length + 9 + 63) >> 6) << 6;
  const buffer = new Uint8Array(size);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;
  const view = new DataView(buffer.buffer);
  view.setUint32(size - 8, Math.floor((bytes.length * 8) / 4294967296));
  view.setUint32(size - 4, (bytes.length * 8) >>> 0);

  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);

  for (let offset = 0; offset < size; offset += 64) {
    for (let t = 0; t < 16; t += 1) w[t] = view.getUint32(offset + t * 4);
    for (let t = 16; t < 64; t += 1) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => {
  const out = new Uint8Array(String(hex).length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(String(hex).substr(i * 2, 2), 16);
  return out;
};

function hasWebCrypto() {
  return typeof crypto !== 'undefined' && Boolean(crypto.subtle) && typeof crypto.getRandomValues === 'function';
}

function randomSalt() {
  if (!hasWebCrypto()) {
    // Ohne crypto.getRandomValues (nur bei unverschlüsseltem LAN-Zugriff):
    // Zeit + Zufall reichen als Salt für den lokalen Schutz.
    return toHex(new TextEncoder().encode(String(Date.now()) + Math.random() + Math.random()));
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function derive(pin, salt, iterations) {
  if (!hasWebCrypto()) {
    let hex = sha256Hex(`${salt}|${pin}`);
    for (let i = 0; i < Math.min(iterations, FALLBACK_ITERATIONS); i += 1) hex = sha256Hex(hex + salt);
    return hex;
  }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(salt), iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/* ---------------- Zustand ---------------- */

export function lockConfig() {
  return store.get().settings.appLock || { salt: '', hash: '', iterations: 0, after: DEFAULT_AFTER, biometric: false };
}

export function lockActive() {
  const cfg = lockConfig();
  return Boolean(cfg.salt && cfg.hash);
}

export function lockDelayMs() {
  return Math.max(0, Number(lockConfig().after) || 0) * 60000;
}

/** PIN setzen oder ändern. Der alte PIN wird nicht benötigt – die Sperre
 *  liegt hinter dem entsperrten Gerät, nicht hinter einem Konto. */
export async function setPin(pin) {
  const clean = String(pin || '').replace(/\D/g, '');
  if (clean.length < 4 || clean.length > 6) throw new Error('Bitte 4 bis 6 Ziffern eingeben.');
  const salt = randomSalt();
  const iterations = hasWebCrypto() ? ITERATIONS : FALLBACK_ITERATIONS;
  const hash = await derive(clean, salt, iterations);
  const cfg = lockConfig();
  store.saveSettings({
    appLock: { ...cfg, salt, hash, iterations, after: Number(cfg.after) || 0 },
  });
  return true;
}

export async function checkPin(pin) {
  const cfg = lockConfig();
  if (!cfg.hash || !cfg.salt) return true;
  const clean = String(pin || '').replace(/\D/g, '');
  if (!clean) return false;
  try {
    const hash = await derive(clean, cfg.salt, Math.max(Number(cfg.iterations) || FALLBACK_ITERATIONS, 1));
    return hash === cfg.hash;
  } catch {
    return false;
  }
}

export function removeLock() {
  const cfg = lockConfig();
  store.saveSettings({ appLock: { ...cfg, salt: '', hash: '', iterations: 0 } });
  unmount();
}

export function setLockAfter(minutes) {
  const cfg = lockConfig();
  const after = Math.max(0, Math.min(240, Number(minutes) || 0));
  store.saveSettings({ appLock: { ...cfg, after } });
  return after;
}

export function setBiometric(on) {
  const cfg = lockConfig();
  store.saveSettings({ appLock: { ...cfg, biometric: Boolean(on) } });
}

/* ---------------- Gerätesperre (nur APK) ---------------- */

export function deviceLockAvailable() {
  try {
    return Boolean(window.AndroidLock?.isAvailable?.());
  } catch {
    return false;
  }
}

export function confirmDeviceLock() {
  return new Promise((resolve) => {
    const bridge = window.AndroidLock;
    if (!bridge?.confirm) {
      resolve(false);
      return;
    }
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      if (window.__kaloriqLockResult === handler) delete window.__kaloriqLockResult;
      resolve(Boolean(ok));
    };
    const handler = (ok) => finish(ok);
    window.__kaloriqLockResult = handler;
    try {
      bridge.confirm(tr('Kaloriq entsperren'), tr('Bestätige deine Gerätesperre.'));
    } catch {
      finish(false);
      return;
    }
    setTimeout(() => finish(false), 60000);
  });
}

/* ---------------- Sperrbildschirm ---------------- */

let locked = false;
let hiddenSince = 0;
let initialized = false;

function overlay() {
  return document.getElementById('lock-screen');
}

function unmount() {
  locked = false;
  overlay()?.remove();
  document.body.classList.remove('locked');
}

function mount() {
  if (overlay()) return;
  locked = true;

  const wrap = document.createElement('div');
  wrap.id = 'lock-screen';
  wrap.className = 'lock-screen';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', tr('Kaloriq ist gesperrt'));
  wrap.innerHTML = `
    <div class="lock-inner">
      <div class="lock-badge">${icon('lock')}</div>
      <h1 class="lock-title">Kaloriq ist gesperrt</h1>
      <p class="small muted lock-sub">PIN eingeben, um deine Daten zu öffnen.</p>

      <div class="lock-form">
        <input class="input lock-input" id="lock-pin" type="password" inputmode="numeric"
          autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="6"
          aria-label="PIN" placeholder="••••">
        <button class="btn btn-primary btn-block" data-unlock>Entsperren</button>
        <p class="lock-error tiny" data-lock-error aria-live="polite"></p>
        ${lockConfig().biometric && deviceLockAvailable()
          ? `<button class="btn btn-block" data-lock-device>Mit Gerätesperre entsperren</button>`
          : ''}
        <button class="lock-link" type="button" data-lock-forgot>PIN vergessen?</button>
      </div>

      <div class="lock-forgot" hidden>
        <p class="small">Ohne PIN gibt es keinen Zugang zu deinen Einträgen. Aus Sicherheitsgründen hilft dann nur das Zurücksetzen – dabei werden alle Daten auf diesem Gerät gelöscht.</p>
        <div class="vstack" style="margin-top:14px">
          <button class="btn btn-block" data-lock-cancel>Zurück</button>
          <button class="btn btn-danger btn-block" data-lock-reset>Alles zurücksetzen</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(wrap);
  document.body.classList.add('locked');
  applyI18n(wrap);

  const form = wrap.querySelector('.lock-form');
  const forgot = wrap.querySelector('.lock-forgot');
  const input = wrap.querySelector('#lock-pin');
  const errorEl = wrap.querySelector('[data-lock-error]');

  const fail = (message) => {
    errorEl.textContent = tr(message);
    wrap.querySelector('.lock-inner')?.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.querySelector('.lock-inner')?.classList.add('shake');
    input.value = '';
    input.focus();
    haptic(30);
  };

  const unlock = async () => {
    const pin = input.value;
    if (!pin) return;
    const ok = await checkPin(pin);
    if (!ok) {
      fail('PIN stimmt nicht');
      return;
    }
    haptic(12);
    unmount();
  };

  const btn = wrap.querySelector('[data-unlock]');
  btn?.addEventListener('click', () => { btn.disabled = true; unlock().finally(() => { btn.disabled = false; }); });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); btn?.click(); }
  });
  input?.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    errorEl.textContent = '';
  });

  wrap.querySelector('[data-lock-device]')?.addEventListener('click', async () => {
    const ok = await confirmDeviceLock();
    if (ok) unmount();
    else fail('Gerätesperre nicht bestätigt');
  });

  wrap.querySelector('[data-lock-forgot]')?.addEventListener('click', () => {
    form.hidden = true;
    forgot.hidden = false;
  });
  wrap.querySelector('[data-lock-cancel]')?.addEventListener('click', () => {
    form.hidden = false;
    forgot.hidden = true;
    input?.focus();
  });
  wrap.querySelector('[data-lock-reset]')?.addEventListener('click', () => {
    store.reset();
    location.reload();
  });

  setTimeout(() => input?.focus(), 60);
}

/** Sperrt sofort (z. B. aus dem Profil). */
export function lockNow() {
  if (!lockActive() || locked) return;
  mount();
}

export function isLocked() {
  return locked;
}

/**
 * Beim Start und nach der Rückkehr aus dem Hintergrund sperren.
 * `after` in Minuten: 0 = bei jedem Start, sonst erst nach dieser Pause.
 */
export function initLock() {
  if (initialized) return;
  initialized = true;

  if (lockActive()) mount();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenSince = Date.now();
      return;
    }
    if (!lockActive() || locked) {
      hiddenSince = 0;
      return;
    }
    const paused = hiddenSince ? Date.now() - hiddenSince : 0;
    hiddenSince = 0;
    if (paused >= lockDelayMs()) mount();
  });

  // Ein zweiter Aufruf nach dem Setzen eines PINs braucht keinen Neustart.
  window.addEventListener('kaloriq:lock-changed', () => {
    if (lockActive() && locked) return;
    if (!lockActive()) unmount();
  });
}

