/* ============================================================
   Kaloriq – Berechnungen (BMR, TDEE, Makros, BMI, Fasten)
   ============================================================ */

export const ACTIVITY = [
  { id: 'sedentary', label: 'Kaum aktiv', desc: 'Schreibtisch, kaum Alltagsbewegung', pal: 1.2 },
  { id: 'light', label: 'Leicht aktiv', desc: 'Sitzend, 1–2× Sport pro Woche', pal: 1.375 },
  { id: 'moderate', label: 'Mäßig aktiv', desc: 'Viel auf den Beinen, 3–4× Sport', pal: 1.55 },
  { id: 'active', label: 'Aktiv', desc: 'Körperliche Arbeit, 5–6× Sport', pal: 1.725 },
  { id: 'very', label: 'Sehr aktiv', desc: 'Schwere Arbeit oder Leistungssport', pal: 1.9 },
];

export const GOALS = [
  { id: 'lose', label: 'Abnehmen', desc: 'Kaloriendefizit, langsam und nachhaltig', icon: '📉' },
  { id: 'maintain', label: 'Gewicht halten', desc: 'Kalorienbedarf decken', icon: '⚖️' },
  { id: 'gain', label: 'Zunehmen', desc: 'Kontrollierter Überschuss für Muskelaufbau', icon: '📈' },
];

export const MACRO_PRESETS = {
  balanced: { label: 'Ausgewogen', protein: 25, carbs: 45, fat: 30 },
  protein: { label: 'Proteinreich', protein: 35, carbs: 35, fat: 30 },
  lowcarb: { label: 'Low Carb', protein: 30, carbs: 20, fat: 50 },
};

export const FASTING_PLANS = [
  { id: '14:10', label: '14:10', hours: 14, desc: 'Einsteigerfreundlich' },
  { id: '16:8', label: '16:8', hours: 16, desc: 'Der Klassiker' },
  { id: '18:6', label: '18:6', hours: 18, desc: 'Fortgeschritten' },
  { id: '20:4', label: '20:4', hours: 20, desc: 'Intensiv' },
  { id: '24', label: '24 h', hours: 24, desc: 'Langes Fasten' },
];

export const KCAL_PER_KG_FAT = 7700;

export function bmr(profile) {
  const w = Number(profile.weight) || 0;
  const h = Number(profile.height) || 0;
  const age = Number(profile.age) || 0;
  const base = 10 * w + 6.25 * h - 5 * age;
  return Math.max(600, base + (profile.sex === 'male' ? 5 : -161));
}

export function activityPal(id) {
  return (ACTIVITY.find((a) => a.id === id) || ACTIVITY[1]).pal;
}

export function tdee(profile) {
  return bmr(profile) * activityPal(profile.activity);
}

/**
 * Tagesziele aus Profil ableiten.
 * Defizit/Überschuss über die gewünschte Rate (kg/Woche) → kcal/Tag.
 */
export function computeTargets(profile) {
  const b = bmr(profile);
  const t = tdee(profile);
  const rate = Number(profile.rate) || 0.5;
  let kcal = t;

  if (profile.goal === 'lose') kcal = t - rate * (KCAL_PER_KG_FAT / 7);
  else if (profile.goal === 'gain') kcal = t + rate * (KCAL_PER_KG_FAT / 7);

  // Sicherheitsgrenzen: nie unter Grundumsatz und nie unter absoluten Mindestwerten.
  const floor = Math.max(profile.sex === 'male' ? 1500 : 1200, b * 1.05);
  kcal = Math.max(kcal, floor);
  kcal = Math.round(kcal / 10) * 10;

  const preset = MACRO_PRESETS[profile.macroPreset] || MACRO_PRESETS.balanced;
  const protein = Math.round((kcal * (preset.protein / 100)) / 4);
  const carbs = Math.round((kcal * (preset.carbs / 100)) / 4);
  const fat = Math.round((kcal * (preset.fat / 100)) / 9);

  const water = Math.min(4000, Math.max(1500, Math.round((Number(profile.weight) || 70) * 35 / 50) * 50));
  const fiber = Math.round((kcal / 1000) * 14);

  return {
    bmr: Math.round(b),
    tdee: Math.round(t),
    kcal,
    protein,
    carbs,
    fat,
    water,
    fiber,
    preset: preset.label,
    deficit: Math.round(kcal - t),
  };
}

export function bmi(profile) {
  const h = (Number(profile.height) || 0) / 100;
  if (!h) return 0;
  return (Number(profile.weight) || 0) / (h * h);
}

export function bmiCategory(value) {
  if (!value) return { label: '–', tone: 'neutral' };
  if (value < 18.5) return { label: 'Untergewicht', tone: 'warn' };
  if (value < 25) return { label: 'Normalgewicht', tone: 'ok' };
  if (value < 30) return { label: 'Übergewicht', tone: 'warn' };
  return { label: 'Adipositas', tone: 'danger' };
}

export function healthyWeightRange(profile) {
  const h = (Number(profile.height) || 0) / 100;
  return [Math.round(18.5 * h * h * 10) / 10, Math.round(24.9 * h * h * 10) / 10];
}

/** Wie viele Tage bis zum Zielgewicht bei gleichbleibender Rate? */
export function projection(profile) {
  const diff = Math.abs((Number(profile.weight) || 0) - (Number(profile.targetWeight) || 0));
  const rate = Number(profile.rate) || 0.5;
  if (profile.goal === 'maintain' || diff < 0.2) return { days: 0, date: null };
  const days = Math.ceil((diff / rate) * 7);
  const date = new Date(Date.now() + days * 86400000);
  return { days, date };
}

export const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * Flexbereich: Toleranz um das Kalorienziel.
 *
 * `bandPct` ist die halbe Breite in Prozent (z. B. 10 → ±10 %).
 * `bandPct = 0` schaltet den Flexbereich aus und liefert die klassischen
 * Zustände (`over` / `under`).
 *
 * Zustände für die Anzeige:
 *   empty  – noch nichts eingetragen
 *   below  – unter dem unteren Rand
 *   in     – im Rahmen
 *   above  – über dem oberen Rand
 *   under  – unter dem Ziel (ohne Flexbereich)
 *   over   – über dem Ziel (ohne Flexbereich)
 */
export function flexStatus(kcal, target, bandPct = 0) {
  const goal = Math.max(0, Number(target) || 0);
  const value = Math.max(0, Number(kcal) || 0);
  const pct = Math.max(0, Number(bandPct) || 0);
  const enabled = pct > 0 && goal > 0;
  const low = Math.round(goal * (1 - pct / 100));
  const high = Math.round(goal * (1 + pct / 100));

  let state;
  if (!value) state = 'empty';
  else if (!enabled) state = value > goal ? 'over' : value === goal ? 'in' : 'under';
  else if (value < low) state = 'below';
  else if (value > high) state = 'above';
  else state = 'in';

  return {
    enabled,
    pct,
    low,
    high,
    goal,
    value,
    diff: value - goal,
    ratio: goal ? value / goal : 0,
    state,
  };
}
