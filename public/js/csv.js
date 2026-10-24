/* ============================================================
   Kaloriq – CSV-Export (Einträge & Tagesdaten)
   ============================================================ */
import { store, MEALS, todayKey, totals } from './store.js';
import { downloadFile } from './ui.js';

const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const cell = (value) => {
  const s = String(value ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (row) => row.map(cell).join(',');
const mealLabel = (id) => MEALS.find((m) => m.id === id)?.label || id;

function downloadCsv(name, rows) {
  const body = '\uFEFF' + rows.map(line).join('\r\n');
  downloadFile(name, body, 'text/csv;charset=utf-8');
}

/** Alle Tagebucheinträge als CSV. */
export function exportEntriesCsv() {
  const rows = [[
    'Datum', 'Mahlzeit', 'Lebensmittel', 'Marke', 'Menge (g)', 'Kalorien',
    'Protein (g)', 'Kohlenhydrate (g)', 'Fett (g)', 'Ballaststoffe (g)', 'Quelle',
  ]];
  const days = store.get().days || {};
  for (const key of Object.keys(days).sort()) {
    for (const entry of days[key]?.entries || []) {
      const factor = (Number(entry.grams) || 0) / 100;
      const p = entry.per100 || {};
      rows.push([
        key,
        mealLabel(entry.meal),
        entry.name || '',
        entry.brand || '',
        r1(entry.grams),
        Math.round((Number(p.kcal) || 0) * factor),
        r1((Number(p.protein) || 0) * factor),
        r1((Number(p.carbs) || 0) * factor),
        r1((Number(p.fat) || 0) * factor),
        r1((Number(p.fiber) || 0) * factor),
        entry.source || '',
      ]);
    }
  }
  downloadCsv(`kaloriq-eintraege-${todayKey()}.csv`, rows);
  return rows.length - 1;
}

/** Tageswerte (Kalorien, Makros, Wasser, Schritte, Gewicht, Erfolge). */
export function exportDaysCsv() {
  const rows = [[
    'Datum', 'Kalorien', 'Protein (g)', 'Kohlenhydrate (g)', 'Fett (g)',
    'Ballaststoffe (g)', 'Wasser (ml)', 'Schritte', 'Gewicht (kg)',
    'Einträge', 'Kleine Erfolge', 'Check-ins',
  ]];
  const days = store.get().days || {};
  for (const key of Object.keys(days).sort()) {
    const day = days[key];
    const t = totals(day);
    rows.push([
      key,
      t.kcal,
      t.protein,
      t.carbs,
      t.fat,
      t.fiber,
      Number(day?.water) || 0,
      Number(day?.steps) || 0,
      day?.weight ?? '',
      day?.entries?.length || 0,
      Object.keys(day?.wins || {}).length,
      Object.keys(day?.checkins || {}).length,
    ]);
  }
  downloadCsv(`kaloriq-tage-${todayKey()}.csv`, rows);
  return rows.length - 1;
}
