/* ============================================================
   Kaloriq – State & Persistenz
   Daten liegen lokal auf dem Gerät: localStorage (schnell) und
   IndexedDB (zweite Kopie, falls iOS den Web-Speicher räumt).
   ============================================================ */
import { computeTargets, round1, clamp } from './calc.js';
import { locale } from './i18n.js';

const KEY = 'kaloriq.state.v1';
const LISTENERS = new Set();

/* ---------- Dauerhafte Zweitkopie (IndexedDB) ----------
   localStorage bleibt die synchrone Hauptkopie. Zusätzlich wird jeder Stand
   in IndexedDB gespiegelt. Räumt iOS localStorage unter Speicherdruck auf,
   stellt Kaloriq beim nächsten Start die letzte Kopie automatisch wieder her.
   Zusätzlich wird persistenter Speicher angefordert (navigator.storage). */
const DB_NAME = 'kaloriq.storage.v1';
const DB_STORE = 'kv';

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB nicht verfügbar'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(DB_STORE)) {
          req.result.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(DB_STORE)) {
          resolve(db);
          return;
        }
        // Eine ältere/leere Datenbank reparieren, statt dauerhaft ohne Store
        // weiterzulaufen (z. B. nach einem abgebrochenen Erststart).
        const nextVersion = db.version + 1;
        db.close();
        const repair = indexedDB.open(DB_NAME, nextVersion);
        repair.onupgradeneeded = () => {
          if (!repair.result.objectStoreNames.contains(DB_STORE)) {
            repair.result.createObjectStore(DB_STORE);
          }
        };
        repair.onsuccess = () => resolve(repair.result);
        repair.onerror = () => reject(repair.error || new Error('IndexedDB nicht verfügbar'));
        repair.onblocked = () => reject(new Error('IndexedDB blockiert'));
      };
      req.onerror = () => reject(req.error || new Error('IndexedDB nicht verfügbar'));
      req.onblocked = () => reject(new Error('IndexedDB blockiert'));
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB abgebrochen'));
  });
}

function mirror(key, value) {
  if (typeof indexedDB === 'undefined' || value == null) return;
  idbPut(key, value).catch(() => { /* Zweitkopie ist optional */ });
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

/** Fordert persistenten Speicher an; Safari unterstützt das ab iOS 15.2. */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export const MEALS = [
  { id: 'breakfast', label: 'Frühstück', icon: '☀️' },
  { id: 'lunch', label: 'Mittagessen', icon: '🍽️' },
  { id: 'dinner', label: 'Abendessen', icon: '🌙' },
  { id: 'snack', label: 'Snacks', icon: '🍎' },
];

export function dateKey(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

export const todayKey = () => dateKey(new Date());

/** Offenes Pausenende („bis ich es beende“). */
export const PAUSE_OPEN_END = '9999-12-31';

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return dateKey(date);
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MO = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function dayLabel(key) {
  const t = todayKey();
  if (key === t) return 'Heute';
  if (key === addDays(t, -1)) return 'Gestern';
  if (key === addDays(t, 1)) return 'Morgen';
  const d = parseKey(key);
  const withYear = d.getFullYear() !== new Date().getFullYear();
  try {
    return new Intl.DateTimeFormat(locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
    }).format(d);
  } catch {
    return `${WD[d.getDay()]}, ${d.getDate()}. ${MO[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
  }
}

export function shortDate(key) {
  const d = parseKey(key);
  try {
    return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'numeric' }).format(d);
  } catch {
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  }
}

function defaultState() {
  return {
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    onboarded: false,
    profile: {
      name: '',
      sex: 'female',
      age: 30,
      height: 170,
      weight: 70,
      targetWeight: 65,
      activity: 'light',
      goal: 'lose',
      rate: 0.5,
      macroPreset: 'balanced',
    },
    targets: { kcal: 1800, protein: 110, carbs: 200, fat: 60, water: 2400, fiber: 25 },
    days: {},
    customFoods: [],
    favorites: [],
    recipes: [],
    settings: {
      apiKey: '',
      model: 'gemini-3.8-flash',
      proxy: false,
      useProxy: false,
      keepScreenOn: false,
      haptics: true,
      lang: 'de',
      stepGoal: 8000,
      stepsEnabled: false,
      // Sanfter Modus: Wochenrahmen statt Tagesdruck, keine roten Zahlen.
      gentleMode: false,
      // Pausenmodus: Liste von Zeiträumen, in denen die Serie eingefroren
      // und der Kaloriendruck ausgeblendet ist.
      // [{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' | PAUSE_OPEN_END }]
      pauses: [],
      pauseMigrated: false,
      // Flexbereich: ±X % um das Kalorienziel gelten als „im Rahmen“.
      // 0 = aus, klassische Anzeige mit harter Zielgrenze.
      flexBand: 10,
      // Minimalmodus: Kalorienziel, Ring und Makros ausblenden.
      minimalMode: false,
      // Gnaden-Tage: So viele leere Tage pro Kalendermonat brechen die
      // Serie nicht (0 = aus).
      graceDaysPerMonth: 2,
      // Optionaler Hunger-/Sättigungs-Check pro Mahlzeit.
      hungerCheck: true,
      // Letzter Stand des Geräte-Schrittsensors (kumulativ seit Neustart).
      // { date: 'YYYY-MM-DD', value: number, ts: number } oder null.
      stepCounter: null,
    },
  };
}

export function emptyDay(key) {
  return { date: key, entries: [], water: 0, steps: 0, weight: null, fast: null, note: '', checkins: {} };
}

function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const state = {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile || {}) },
    targets: { ...base.targets, ...(raw.targets || {}) },
    settings: { ...base.settings, ...(raw.settings || {}) },
    days: raw.days && typeof raw.days === 'object' ? raw.days : {},
    customFoods: Array.isArray(raw.customFoods) ? raw.customFoods : [],
    favorites: Array.isArray(raw.favorites) ? raw.favorites : [],
    recipes: Array.isArray(raw.recipes) ? raw.recipes : [],
  };

  // Pausen-Historie normalisieren. Die frühere Gentle-Pause (boolean) wird
  // einmalig in einen offenen Pausenzeitraum übernommen.
  const settings = state.settings;
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!Array.isArray(settings.pauses)) settings.pauses = [];
  settings.pauses = settings.pauses
    .filter((p) => p
      && dateRe.test(p.from || '')
      && (p.to === PAUSE_OPEN_END || dateRe.test(p.to || ''))
      && p.from <= p.to)
    .map((p) => ({ from: p.from, to: p.to }))
    .sort((a, b) => a.from.localeCompare(b.from));
  if (settings.gentlePaused && !settings.pauseMigrated) {
    const today = todayKey();
    if (!settings.pauses.some((p) => p.from <= today && today <= p.to)) {
      settings.pauses.push({ from: today, to: PAUSE_OPEN_END });
    }
  }
  delete settings.gentlePaused;
  settings.pauseMigrated = true;
  for (const [k, v] of Object.entries(state.days)) {
    state.days[k] = { ...emptyDay(k), ...(v || {}) };
    if (!Array.isArray(state.days[k].entries)) state.days[k].entries = [];
    if (!state.days[k].checkins || typeof state.days[k].checkins !== 'object') {
      state.days[k].checkins = {};
    }
  }
  return state;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return migrate(raw ? JSON.parse(raw) : null);
  } catch (err) {
    console.warn('Konnte Daten nicht laden:', err);
    return defaultState();
  }
}

let state = load();

/* ---------- Automatische Sicherungen ----------
   Beim Speichern legt die App regelmaessig einen Stand in einem eigenen
   Schluessel ab. Ein App-Update (neue JS-Dateien) beruehrt localStorage nie –
   diese Sicherungen sind die zweite Absicherung gegen Fehlbedienung
   (Import, Zuruecksetzen) und gegen versehentlich geloeschte Eintraege. */

const BACKUP_KEY = 'kaloriq.backups.v1';
const BACKUP_META = 'kaloriq.backups.meta';
const BACKUP_GAP = 12 * 60 * 60 * 1000; // 12 Stunden
const BACKUP_MAX = 3;

let lastBackupAt = 0;
try { lastBackupAt = Number(localStorage.getItem(BACKUP_META) || 0) || 0; } catch { /* ignorieren */ }

function snapshot(force = false) {
  const now = Date.now();
  if (!force && now - lastBackupAt < BACKUP_GAP) return;
  try {
    const raw = safeGet(BACKUP_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const dayCount = Object.keys(state.days || {}).length;
    const next = [
      { at: now, dayCount, data: JSON.stringify(state) },
      ...(Array.isArray(list) ? list : []).filter((b) => b && b.data),
    ].slice(0, BACKUP_MAX);
    const serialized = JSON.stringify(next);
    safeSet(BACKUP_KEY, serialized);
    lastBackupAt = now;
    safeSet(BACKUP_META, String(now));
    mirror(BACKUP_KEY, serialized);
    mirror(BACKUP_META, String(now));
  } catch (err) {
    console.warn('Auto-Sicherung fehlgeschlagen:', err);
  }
}

function persist() {
  let raw;
  try {
    raw = JSON.stringify(state);
  } catch (err) {
    console.warn('Speichern fehlgeschlagen:', err);
    return false;
  }

  // localStorage ist die schnelle Hauptkopie; IndexedDB die Zweitkopie.
  const localOk = safeSet(KEY, raw);
  mirror(KEY, raw);
  snapshot();
  return localOk;
}

function emit(reason = 'update') {
  for (const fn of LISTENERS) {
    try { fn(state, reason); } catch (err) { console.error(err); }
  }
}

/**
 * Stellt bei Bedarf die IndexedDB-Zweitkopie wieder her.
 * localStorage bleibt Vorrang, solange es vorhanden und nicht älter ist –
 * so überschreibt ein bewusstes Zurücksetzen nicht die alte Sicherung.
 */
export async function hydrateFromDurable() {
  const localRaw = safeGet(KEY);
  let local = null;
  if (localRaw) {
    try { local = migrate(JSON.parse(localRaw)); } catch { local = null; }
  }

  let durableRaw = null;
  try { durableRaw = await idbGet(KEY); } catch { return false; }
  let durable = null;
  if (durableRaw) {
    try { durable = migrate(JSON.parse(durableRaw)); } catch { durable = null; }
  }

  if (!durable) {
    mirror(KEY, JSON.stringify(state));
  } else {
    const localTime = Number(local?.updatedAt) || 0;
    const durableTime = Number(durable.updatedAt) || 0;
    let restored = false;

    if (!local || durableTime > localTime) {
      state = durable;
      safeSet(KEY, JSON.stringify(state));
      restored = true;
    } else {
      // Lokaler Stand ist aktueller: Zweitkopie nachziehen.
      mirror(KEY, JSON.stringify(state));
    }

    // Auch die automatischen Sicherungen aus der Zweitkopie zurückholen.
    const localBackups = safeGet(BACKUP_KEY);
    if (localBackups) {
      mirror(BACKUP_KEY, localBackups);
    } else {
      try {
        const backups = await idbGet(BACKUP_KEY);
        if (backups) safeSet(BACKUP_KEY, backups);
      } catch { /* ignorieren */ }
    }

    const localMeta = safeGet(BACKUP_META);
    if (localMeta) {
      mirror(BACKUP_META, localMeta);
    } else {
      try {
        const meta = await idbGet(BACKUP_META);
        if (meta) {
          safeSet(BACKUP_META, meta);
          lastBackupAt = Number(meta) || lastBackupAt;
        }
      } catch { /* ignorieren */ }
    }

    if (restored) emit('hydrate');
    return restored;
  }

  // Noch keine Zweitkopie vorhanden: bestehende Sicherungen ebenfalls spiegeln.
  const localBackups = safeGet(BACKUP_KEY);
  if (localBackups) mirror(BACKUP_KEY, localBackups);
  const localMeta = safeGet(BACKUP_META);
  if (localMeta) mirror(BACKUP_META, localMeta);
  return false;
}

export const store = {
  get() { return state; },
  subscribe(fn) {
    LISTENERS.add(fn);
    return () => LISTENERS.delete(fn);
  },
  /** Mutation + persist + render. */
  set(mutator, reason = 'update') {
    const result = mutator(state);
    state.updatedAt = Date.now();
    persist();
    emit(reason);
    return result;
  },
  /** Zielwerte aus dem Profil neu berechnen. */
  recalc(profile = state.profile) {
    state.targets = computeTargets(profile);
    state.updatedAt = Date.now();
    persist();
    return state.targets;
  },
  saveProfile(patch) {
    state.profile = { ...state.profile, ...patch };
    state.targets = computeTargets(state.profile);
    state.updatedAt = Date.now();
    persist();
    emit('profile');
    return state.profile;
  },
  saveSettings(patch) {
    state.settings = { ...state.settings, ...patch };
    state.updatedAt = Date.now();
    persist();
    emit('settings');
    return state.settings;
  },
  finishOnboarding() {
    state.onboarded = true;
    state.targets = computeTargets(state.profile);
    state.updatedAt = Date.now();
    persist();
    emit('onboarding');
  },
  replace(next) {
    snapshot(true); // aktuellen Stand vorher sichern
    state = migrate(next);
    state.updatedAt = Date.now();
    persist();
    emit('replace');
  },
  reset() {
    snapshot(true); // Zuruecksetzen bleibt rueckholbar
    state = defaultState();
    persist();
    emit('reset');
  },
};

/* ---------- Tage ---------- */

export function getDay(key = todayKey()) {
  if (!state.days[key]) state.days[key] = emptyDay(key);
  return state.days[key];
}

export function ensureDay(key = todayKey()) {
  return store.set(() => getDay(key), 'day');
}

export function totals(day) {
  const sum = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  if (!day || !Array.isArray(day.entries)) return sum;
  for (const e of day.entries) {
    const n = Number(e.grams) || 0;
    const per = e.per100 || {};
    const factor = n / 100;
    sum.kcal += (Number(per.kcal) || 0) * factor;
    sum.protein += (Number(per.protein) || 0) * factor;
    sum.carbs += (Number(per.carbs) || 0) * factor;
    sum.fat += (Number(per.fat) || 0) * factor;
    sum.fiber += (Number(per.fiber) || 0) * factor;
  }
  return {
    kcal: Math.round(sum.kcal),
    protein: round1(sum.protein),
    carbs: round1(sum.carbs),
    fat: round1(sum.fat),
    fiber: round1(sum.fiber),
  };
}

export function mealTotals(day, mealId) {
  return totals({ entries: (day?.entries || []).filter((e) => e.meal === mealId) });
}

export function entryMacros(entry) {
  const f = (Number(entry.grams) || 0) / 100;
  const p = entry.per100 || {};
  return {
    kcal: Math.round((Number(p.kcal) || 0) * f),
    protein: round1((Number(p.protein) || 0) * f),
    carbs: round1((Number(p.carbs) || 0) * f),
    fat: round1((Number(p.fat) || 0) * f),
  };
}

export function newEntryId() {
  return 'e_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function addEntries(dateK, meal, items) {
  return store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    const added = items.map((item) => {
      const entry = {
        id: newEntryId(),
        meal,
        name: item.name,
        brand: item.brand || '',
        grams: round1(Number(item.grams) || 100),
        per100: {
          kcal: round1(item.per100?.kcal ?? item.kcal ?? 0),
          protein: round1(item.per100?.protein ?? 0),
          carbs: round1(item.per100?.carbs ?? 0),
          fat: round1(item.per100?.fat ?? 0),
          fiber: round1(item.per100?.fiber ?? 0),
        },
        source: item.source || 'manual',
        emoji: item.emoji || '',
        photo: item.photo || '',
        recipeId: item.recipeId || '',
        createdAt: Date.now(),
      };
      day.entries.push(entry);
      return entry;
    });
    return added;
  }, 'entries');
}

export function updateEntry(dateK, id, patch) {
  store.set((s) => {
    const entry = (s.days[dateK]?.entries || []).find((e) => e.id === id);
    if (entry) Object.assign(entry, patch);
    return entry;
  }, 'entries');
}

export function removeEntry(dateK, id) {
  store.set((s) => {
    const day = s.days[dateK];
    if (!day) return;
    day.entries = day.entries.filter((e) => e.id !== id);
  }, 'entries');
}

export function setWater(dateK, ml) {
  store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    day.water = clamp(Math.round(ml), 0, 8000);
  }, 'water');
}

export function setSteps(dateK, n) {
  store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    day.steps = clamp(Math.round(Number(n) || 0), 0, 200000);
  }, 'steps');
}

export function addSteps(dateK, n) {
  store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    day.steps = clamp(Math.round((day.steps || 0) + (Number(n) || 0)), 0, 200000);
  }, 'steps');
}

/**
 * Optionalen Hunger-/Sättigungs-Check für eine Mahlzeit speichern.
 * Werte sind 1–10; `null` entfernt die jeweilige Angabe.
 */
export function setCheckin(dateK, mealId, patch = {}) {
  store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    if (!day.checkins || typeof day.checkins !== 'object') day.checkins = {};
    const previous = day.checkins[mealId] || {};
    const norm = (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 1 ? clamp(Math.round(n), 1, 10) : null;
    };
    const before = Object.prototype.hasOwnProperty.call(patch, 'before') ? norm(patch.before) : norm(previous.before);
    const after = Object.prototype.hasOwnProperty.call(patch, 'after') ? norm(patch.after) : norm(previous.after);
    if (!before && !after) {
      delete day.checkins[mealId];
      return;
    }
    day.checkins[mealId] = { before, after, at: Date.now() };
  }, 'checkin');
}

/** Hunger-/Sättigungs-Check einer Mahlzeit löschen. */
export function clearCheckin(dateK, mealId) {
  store.set((s) => {
    const day = s.days[dateK];
    if (day?.checkins && Object.prototype.hasOwnProperty.call(day.checkins, mealId)) {
      delete day.checkins[mealId];
    }
  }, 'checkin');
}

/**
 * Schritte aus dem Gerätesensor verbuchen und den Zählerstand sichern –
 * beides in einem Schreibvorgang, damit nichts doppelt gezählt wird.
 */
export function applyNativeSteps(dateK, delta, counter) {
  store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    day.steps = clamp(Math.round((day.steps || 0) + (Number(delta) || 0)), 0, 200000);
    s.settings.stepCounter = counter || null;
  }, 'steps');
}

/** Nur den Sensor-Zählerstand merken (ohne Schritte zu addieren). */
export function setStepCounter(counter) {
  store.set((s) => {
    s.settings.stepCounter = counter || null;
  }, 'settings');
}

export function setWeight(dateK, kg) {
  store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    day.weight = kg ? round1(kg) : null;
    if (kg) s.profile.weight = round1(kg);
    s.targets = computeTargets(s.profile);
  }, 'weight');
}

/* ---------- Fasten ---------- */

export function startFast(dateK, planId, hours) {
  store.set((s) => {
    const day = s.days[dateK] || (s.days[dateK] = emptyDay(dateK));
    day.fast = { plan: planId, hours, start: Date.now(), end: null };
  }, 'fast');
}

export function stopFast(dateK) {
  store.set((s) => {
    const day = s.days[dateK];
    if (day?.fast) day.fast.end = Date.now();
  }, 'fast');
}

/* ---------- Statistik ---------- */

export function lastNDays(n, end = todayKey()) {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function series(n) {
  return lastNDays(n).map((key) => {
    const day = state.days[key];
    return { key, day, totals: totals(day), weight: day?.weight ?? null };
  });
}

export function weekSummary() {
  const days = series(7);
  const logged = days.filter((d) => d.totals.kcal > 0);
  const avg = (field) => (logged.length ? Math.round(logged.reduce((a, d) => a + d.totals[field], 0) / logged.length) : 0);
  return {
    days,
    loggedDays: logged.length,
    avgKcal: avg('kcal'),
    avgProtein: avg('protein'),
    avgCarbs: avg('carbs'),
    avgFat: avg('fat'),
  };
}

/* ---------- Pausenmodus ---------- */

/** Aktiver Pausenzeitraum oder null. */
export function activePause() {
  const today = todayKey();
  return (state.settings.pauses || []).find((p) => p && p.from <= today && today <= p.to) || null;
}

/** Liegt ein bestimmter Tag in einem Pausenzeitraum? */
export function isPaused(key = todayKey()) {
  return (state.settings.pauses || []).some((p) => p && p.from <= key && key <= p.to);
}

/**
 * Pause starten oder verlängern.
 * `days = null` bedeutet „bis ich es beende“ (offenes Ende).
 */
export function startPause(days = 1) {
  const from = todayKey();
  const to = days == null ? PAUSE_OPEN_END : addDays(from, Math.max(1, Math.round(days)) - 1);
  const pauses = (state.settings.pauses || []).slice();
  const current = pauses.find((p) => p && p.from <= from && from <= p.to);

  if (current) {
    // Bestehende Pause anpassen: vergangene Pausentage bleiben erhalten,
    // das Ende kann verlängert oder verkürzt werden.
    current.to = to;
  } else {
    pauses.push({ from, to });
  }

  // Nur Zeiträume behalten, die für die Serie noch relevant sind (800 Tage).
  const cutoff = addDays(from, -800);
  state.settings.pauses = pauses
    .filter((p) => p && p.to >= cutoff)
    .sort((a, b) => a.from.localeCompare(b.from))
    .slice(-24);
  state.settings.pauseMigrated = true;
  state.updatedAt = Date.now();
  persist();
  emit('settings');
  return activePause();
}

/** Pause sofort beenden. Bereits vergangene Pausentage bleiben eingefroren. */
export function endPause() {
  const today = todayKey();
  const pauses = (state.settings.pauses || []).slice();
  let changed = false;
  for (const p of pauses) {
    if (p && p.from <= today && today <= p.to) {
      p.to = addDays(today, -1);
      changed = true;
    }
  }
  if (!changed) return false;
  state.settings.pauses = pauses.filter((p) => p && p.from <= p.to);
  state.updatedAt = Date.now();
  persist();
  emit('settings');
  return true;
}

/** Verbleibende Pausentage inklusive heute; null bei offenem Ende. */
export function pauseRemainingDays(p = activePause()) {
  if (!p) return 0;
  if (p.to === PAUSE_OPEN_END) return null;
  const day = 86400000;
  const end = new Date(`${p.to}T00:00:00`).getTime();
  const now = new Date(`${todayKey()}T00:00:00`).getTime();
  return Math.max(1, Math.round((end - now) / day) + 1);
}

/** Erlaubte Gnaden-Tage pro Kalendermonat (0–5). */
export function graceDaysPerMonth() {
  return clamp(Math.round(Number(state.settings.graceDaysPerMonth) || 0), 0, 5);
}

/**
 * Serie mit Gnaden-Tagen.
 *
 * Ein Gnaden-Tag ist ein Tag ohne Einträge, der die Serie nicht bricht.
 * Pro Kalendermonat stehen `settings.graceDaysPerMonth` zur Verfügung.
 * Verbraucht werden sie nur, wenn der Tag tatsächlich eine Lücke zwischen
 * zwei Einträgen überbrückt – eine folgenlose Pause ohne Einträge zählt
 * also nicht als verbraucht.
 *
 * Rückgabe:
 *   count               – aufeinanderfolgende Tage mit Einträgen
 *   limit               – erlaubte Gnaden-Tage pro Monat
 *   graceUsed           – verbrauchte Gnaden-Tage in der aktuellen Serie
 *   graceUsedThisMonth  – davon im aktuellen Kalendermonat
 *   graceRemaining      – noch verfügbar in diesem Monat
 */
export function streakInfo() {
  const limit = graceDaysPerMonth();
  const logged = (key) => {
    const day = state.days[key];
    return Boolean(day && Array.isArray(day.entries) && day.entries.length > 0);
  };

  let key = todayKey();
  // Heute darf noch leer sein, ohne die Serie zu unterbrechen (der Tag läuft
  // ja noch). Ab gestern zählen Lücken – dort greifen die Gnaden-Tage.
  if (!logged(key)) key = addDays(key, -1);

  let count = 0;
  const used = Object.create(null);
  let pending = [];

  for (let i = 0; i < 800; i++) {
    if (logged(key)) {
      // Erst wenn nach einer Lücke wieder ein Eintrag folgt, ist der
      // Gnaden-Tag wirklich verbraucht.
      for (const month of pending) used[month] = (used[month] || 0) + 1;
      pending = [];
      count++;
      key = addDays(key, -1);
      continue;
    }

    // Pausentage ohne Eintrag werden übersprungen: Sie zählen nicht und
    // brechen die Serie nicht. Wer während der Pause etwas einträgt, zählt
    // normal weiter – das ist ein Bonus, keine Pflicht.
    if (isPaused(key)) {
      key = addDays(key, -1);
      continue;
    }

    if (limit <= 0) break;
    const month = key.slice(0, 7);
    const projected = (used[month] || 0)
      + pending.reduce((n, m) => n + (m === month ? 1 : 0), 0);
    if (projected >= limit) break;
    pending.push(month);
    key = addDays(key, -1);
  }

  const month = todayKey().slice(0, 7);
  const graceUsed = Object.values(used).reduce((a, n) => a + n, 0);
  const graceUsedThisMonth = used[month] || 0;
  const pause = activePause();
  return {
    count,
    limit,
    graceUsed,
    graceUsedThisMonth,
    graceRemaining: Math.max(0, limit - graceUsedThisMonth),
    paused: Boolean(pause),
    pauseUntil: pause?.to || null,
  };
}

/** Anzahl aufeinanderfolgender Tage mit Einträgen (endet heute oder gestern). */
export function streak() {
  return streakInfo().count;
}

export function weightSeries() {
  return Object.values(state.days)
    .filter((d) => typeof d.weight === 'number')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ key: d.date, weight: d.weight }));
}

/* ---------- Export / Import ---------- */

export function exportJson() {
  return JSON.stringify(state, null, 2);
}

export function importJson(text) {
  const data = JSON.parse(text);
  // Der Sensor-Zählerstand gehört zum Gerät und darf nicht mitwandern.
  if (data && data.settings && typeof data.settings === 'object') {
    data.settings.stepCounter = null;
  }
  store.replace(data);
}

/* ---------- Sicherungen verwalten ---------- */

/** Liste der automatischen Sicherungen (neueste zuerst). */
export function listBackups() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return (Array.isArray(list) ? list : [])
      .filter((b) => b && b.data && b.at)
      .map((b) => ({ at: b.at, dayCount: b.dayCount || 0, size: b.data.length }))
      .sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

/** Erstellt sofort eine Sicherung (auch ausserhalb des 12-Stunden-Rasters). */
export function backupNow() {
  snapshot(true);
  return listBackups();
}

/** Spielt eine Sicherung zurueck. Der aktuelle Stand wird dabei vorher gesichert. */
export function restoreBackup(at) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]'); } catch { list = []; }
  const hit = (Array.isArray(list) ? list : []).find((b) => b && Number(b.at) === Number(at));
  if (!hit || !hit.data) throw new Error('Sicherung nicht gefunden.');
  store.replace(JSON.parse(hit.data));
  return true;
}
