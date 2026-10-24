/* ============================================================
   Kaloriq – Android-Widget
   Schiebt die Tageswerte in das native Home-Screen-Widget und
   verarbeitet Widget-Klicks (Schnell eintragen / Wasser).
   ============================================================ */
import { store, getDay, todayKey, totals, setWater } from './store.js';
import { openQuickLogSheet } from './views/add.js';
import { fmt, toast, haptic } from './ui.js';

function bridge() {
  if (typeof window === 'undefined') return null;
  return window.AndroidWidget || null;
}

function mealForNow() {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

function payload() {
  const day = getDay(todayKey());
  const t = totals(day);
  const target = store.get().targets;
  const remaining = Math.round((Number(target.kcal) || 0) - t.kcal);
  return JSON.stringify({
    kcal: remaining < 0 ? `${fmt(Math.abs(remaining))} drüber` : `${fmt(remaining)} übrig`,
    water: `${fmt(day.water || 0)} ml`,
    steps: fmt(day.steps || 0),
    updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
}

export function updateWidget() {
  const b = bridge();
  if (!b?.update) return;
  try {
    b.update(payload());
  } catch {
    /* Widget ist optional. */
  }
}

function handleAction(action) {
  if (!action) return;
  try { bridge()?.clearPendingAction?.(); } catch { /* egal */ }
  const now = Date.now();
  if (action === handleAction.last && now - (handleAction.at || 0) < 1500) return;
  handleAction.last = action;
  handleAction.at = now;
  if (action === 'quick') {
    openQuickLogSheet({ meal: mealForNow() });
  } else if (action === 'water') {
    const today = todayKey();
    setWater(today, (getDay(today).water || 0) + 250);
    toast('250 ml Wasser hinzugefügt');
    haptic();
  }
}

export function initWidget() {
  if (!bridge()) return;
  updateWidget();
  let timer = 0;
  store.subscribe(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = 0;
      updateWidget();
    }, 700);
  });
  window.__kaloriqWidgetAction = handleAction;
  try {
    const pending = bridge()?.getPendingAction?.();
    if (pending) handleAction(pending);
  } catch {
    /* egal */
  }
}
