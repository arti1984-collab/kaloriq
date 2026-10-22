/* ============================================================
   Kaloriq – Schrittzähler
   Zwei Betriebsarten:
   - nativ (APK): liest den Hardware-Schrittzähler (TYPE_STEP_COUNTER)
     über window.AndroidStepCounter. Der Sensor zählt kumulativ seit
     dem Geräteneustart weiter, auch wenn die App geschlossen ist.
     Beim Öffnen wird der Stand nachgetragen.
   - Web/Fallback: zählt über DeviceMotionEvent, solange die App
     geöffnet ist.
   ============================================================ */
import {
  store, addSteps, todayKey, applyNativeSteps, setStepCounter,
} from './store.js';

const TRIGGER = 1.8;      // m/s² über dem geglätteten Mittelwert
const REARM = 0.55;       // darunter wieder „scharf“ für den nächsten Schritt
const MIN_STEP_MS = 280;  // höchstens ~3,5 Schritte pro Sekunde
const FLUSH_MS = 2500;    // gesammelte Schritte alle 2,5 s speichern
const EVENT_GAP_MS = 1200; // Lücke (App im Hintergrund) → Detektor neu starten

/* Nach so vielen Stunden ohne App-Kontakt wird der Zählerstand neu gesetzt,
   statt die gesamte Differenz einem Tag zuzuschreiben. */
const NATIVE_GAP_HOURS = 20;

/* Ältere Sensormeldungen (z. B. aus einer pausierten WebView) ignorieren. */
const NATIVE_STALE_MS = 5 * 60 * 1000;

let running = false;
let detector = null;
let pending = 0;
let flushTimer = null;
let lastEventAt = 0;
let nativeState = 'idle';

/* ---------------- Betriebsart ---------------- */

/** Native Brücke, falls die App als APK mit StepCounterBridge läuft. */
function nativeBridge() {
  if (typeof window === 'undefined') return null;
  try {
    const bridge = window.AndroidStepCounter;
    if (!bridge || typeof bridge.isAvailable !== 'function') return null;
    return bridge.isAvailable() ? bridge : null;
  } catch {
    return null;
  }
}

/** 'native' (Gerätesensor), 'motion' (DeviceMotion) oder 'none'. */
export function stepsMode() {
  if (nativeBridge()) return 'native';
  if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) return 'motion';
  return 'none';
}

export function stepsSupported() {
  return stepsMode() !== 'none';
}

export function nativeStepState() {
  return nativeState;
}

/** iOS 13+ verlangt eine ausdrückliche Freigabe per Nutzer-Geste. */
export function stepsPermissionNeeded() {
  if (nativeBridge()) return false;
  return typeof window !== 'undefined'
    && typeof window.DeviceMotionEvent?.requestPermission === 'function';
}

export async function requestStepsPermission() {
  if (nativeBridge() || !stepsPermissionNeeded()) return true;
  try {
    return (await window.DeviceMotionEvent.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export function isCounting() {
  return running;
}

/** Noch nicht gespeicherte Schritte (für die Live-Anzeige). */
export function pendingSteps() {
  return pending;
}

/* ---------------- Erkennung ----------------
   Reine Funktion, damit sie sich ohne Sensor testen lässt:
   push() bekommt die Betragsbeschleunigung in m/s² (Erdanziehung ≈ 9,81).
   Ein Schritt ist eine deutliche Spitze über dem gleitenden Mittel,
   danach muss der Wert wieder unter die Rückschwelle fallen. */

export function createStepDetector(options = {}) {
  const trigger = options.trigger ?? TRIGGER;
  const rearm = options.rearm ?? REARM;
  const minStepMs = options.minStepMs ?? MIN_STEP_MS;
  const smooth = options.smooth ?? 0.06;

  let baseline = null;
  let armed = true;
  let last = -Infinity;

  return {
    push(magnitude, now = Date.now()) {
      if (!Number.isFinite(magnitude)) return false;
      if (baseline === null) baseline = magnitude;
      baseline += (magnitude - baseline) * smooth;

      const deviation = magnitude - baseline;
      if (deviation < rearm) armed = true;

      if (armed && deviation > trigger && now - last >= minStepMs) {
        armed = false;
        last = now;
        return true;
      }
      return false;
    },
    get baseline() {
      return baseline;
    },
    reset() {
      baseline = null;
      armed = true;
      last = -Infinity;
    },
  };
}

/* ---------------- Gemeinsame Helfer ---------------- */

function notify() {
  try {
    window.dispatchEvent(new CustomEvent('kaloriq:steps'));
  } catch {
    /* egal */
  }
}

function emitStatus(status) {
  try {
    window.dispatchEvent(new CustomEvent('kaloriq:steps-status', { detail: { status } }));
  } catch {
    /* egal */
  }
}

function setEnabled(enabled) {
  if (store.get().settings.stepsEnabled === enabled) return;
  store.set((s) => { s.settings.stepsEnabled = enabled; }, 'settings');
}

/* ---------------- Nativer Modus ----------------
   TYPE_STEP_COUNTER liefert die Schritte seit dem letzten Geräteneustart.
   Wir merken uns den letzten Stand samt Datum und verbuchen nur die
   Differenz. Die Schritte aus der Zeit mit geschlossener App stecken
   bereits im kumulativen Wert und werden so beim Öffnen nachgetragen. */

function syncNativeCounter(value) {
  if (!Number.isFinite(value) || value < 0) return false;

  const today = todayKey();
  const base = store.get().settings.stepCounter;
  const now = Date.now();

  // Erster Start: nur den Ausgangsstand merken, nichts addieren.
  if (!base || !Number.isFinite(base.value) || typeof base.date !== 'string') {
    setStepCounter({ date: today, value, ts: now });
    return false;
  }

  // Geräteneustart oder Sensor-Reset: Zähler beginnt wieder bei 0.
  if (value < base.value) {
    setStepCounter({ date: today, value, ts: now });
    return false;
  }

  const delta = Math.round(value - base.value);
  if (delta <= 0) {
    // Stand gelegentlich auffrischen, damit die Lücke klein bleibt.
    if (!base.ts || now - base.ts > 10 * 60 * 1000) {
      setStepCounter({ date: today, value, ts: now });
    }
    return false;
  }

  const gapHours = base.ts ? (now - base.ts) / 3600000 : 0;

  // Nach einem Tageswechsel ist nicht bekannt, wie viele der Schritte auf
  // welchen Tag entfallen. Nur bei kurzer Lücke den Tag übernehmen, sonst
  // den Stand neu setzen (keine willkürliche Verteilung).
  if (base.date !== today && gapHours > NATIVE_GAP_HOURS) {
    setStepCounter({ date: today, value, ts: now });
    return false;
  }

  applyNativeSteps(today, delta, { date: today, value, ts: now });
  return true;
}

function onNativeStatus(data) {
  if (!data || typeof data !== 'object') return;
  const status = String(data.status || '');
  if (!status) return;
  nativeState = status;
  const value = Number(data.value);
  const ts = Number(data.ts);
  const stale = Number.isFinite(ts) && ts > 0 && Date.now() - ts > NATIVE_STALE_MS;

  if (status === 'running' || status === 'update') {
    if (Number.isFinite(value) && value >= 0 && stale) return;
    running = true;
    if (Number.isFinite(value) && value >= 0) syncNativeCounter(value);
    notify();
    return;
  }

  if (status === 'stopped') {
    running = false;
    notify();
    return;
  }

  if (status === 'denied' || status === 'unavailable') {
    running = false;
    setEnabled(false);
    emitStatus(status);
    notify();
  }
}

if (typeof window !== 'undefined') {
  window.__kaloriqNativeSteps = onNativeStatus;
}

/* ---------------- DeviceMotion (Fallback) ---------------- */

function onMotion(event) {
  const a = event.accelerationIncludingGravity || event.acceleration;
  if (!a || a.x == null || a.y == null || a.z == null) return;

  const now = performance.now();
  // Nach einer Pause (Bildschirm aus, App im Hintergrund) neu einpegeln.
  if (now - lastEventAt > EVENT_GAP_MS) detector?.reset();
  lastEventAt = now;

  const magnitude = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  if (detector?.push(magnitude, now)) {
    pending += 1;
    notify();
    scheduleFlush();
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushSteps, FLUSH_MS);
}

/** Speichert die gesammelten Schritte sofort. */
export function flushSteps() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!pending) return 0;
  const count = pending;
  pending = 0;
  addSteps(todayKey(), count);
  notify();
  return count;
}

/* ---------------- Start / Stop ---------------- */

export async function startSteps() {
  if (running) return true;

  const native = nativeBridge();
  if (native) {
    running = true;
    setEnabled(true);
    try {
      native.start();
    } catch {
      running = false;
      setEnabled(false);
      return false;
    }
    notify();
    return true;
  }

  if (!stepsSupported()) return false;

  const allowed = await requestStepsPermission();
  if (!allowed) return false;

  detector = createStepDetector();
  pending = 0;
  lastEventAt = performance.now();
  window.addEventListener('devicemotion', onMotion, { passive: true });
  running = true;
  setEnabled(true);
  notify();
  return true;
}

export function stopSteps() {
  const native = nativeBridge();
  if (native) {
    try { native.stop(); } catch { /* egal */ }
    running = false;
    setEnabled(false);
    notify();
    return;
  }

  if (!running) return;
  window.removeEventListener('devicemotion', onMotion);
  flushSteps();
  running = false;
  detector = null;
  setEnabled(false);
  notify();
}

/** Nach dem Start der App weiterzählen, wenn es zuletzt aktiv war. */
export async function resumeSteps() {
  if (running) return true;
  if (!store.get().settings.stepsEnabled) return false;
  if (nativeBridge()) return startSteps();
  if (!stepsSupported()) return false;
  // Ohne Nutzer-Geste fragt iOS nicht – dort erst beim Tippen starten.
  if (stepsPermissionNeeded()) return false;
  return startSteps();
}

// Beim Schließen/Verstecken noch offene Schritte sichern.
window.addEventListener('pagehide', () => {
  if (running) flushSteps();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && running) flushSteps();
});
