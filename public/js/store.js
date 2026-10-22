/* ============================================================
   Kaloriq – State & Persistenz
   Daten liegen lokal auf dem Gerät (localStorage).
   ============================================================ */
import { computeTargets, round1, clamp } from './calc.js';
import { locale } from './i18n.js';

const KEY = 'kaloriq.state.v1';
const LISTENERS = new Set();

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
      // Letzter Stand des Geräte-Schrittsensors (kumulativ seit Neustart).
      // { date: 'YYYY-MM-DD', value: number, ts: number } oder null.
      stepCounter: null,
    },
  };
}

export function emptyDay(key) {
  return { date: key, entries: [], water: 0, steps: 0, weight: null, fast: null, note: '' };
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
  };
  for (const [k, v] of Object.entries(state.days)) {
    state.days[k] = { ...emptyDay(k), ...(v || {}) };
    if (!Array.isArray(state.days[k].entries)) state.days[k].entries = [];
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
    const raw = localStorage.getItem(BACKUP_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const dayCount = Object.keys(state.days || {}).length;
    const next = [
      { at: now, dayCount, data: JSON.stringify(state) },
      ...(Array.isArray(list) ? list : []).filter((b) => b && b.data),
    ].slice(0, BACKUP_MAX);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
    lastBackupAt = now;
    localStorage.setItem(BACKUP_META, String(now));
  } catch (err) {
    console.warn('Auto-Sicherung fehlgeschlagen:', err);
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    snapshot();
    return true;
  } catch (err) {
    console.warn('Speichern fehlgeschlagen:', err);
    return false;
  }
}

function emit(reason = 'update') {
  for (const fn of LISTENERS) {
    try { fn(state, reason); } catch (err) { console.error(err); }
  }
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

/** Anzahl aufeinanderfolgender Tage mit Einträgen (endet heute oder gestern). */
export function streak() {
  let count = 0;
  let key = todayKey();
  const hasToday = (state.days[key]?.entries?.length || 0) > 0;
  if (!hasToday) key = addDays(key, -1);
  for (let i = 0; i < 400; i++) {
    const day = state.days[key];
    if (day && day.entries && day.entries.length > 0) {
      count++;
      key = addDays(key, -1);
    } else break;
  }
  return count;
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
