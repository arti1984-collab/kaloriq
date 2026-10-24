/* ============================================================
   Kaloriq – Hunger-/Sättigungs-Check
   Optionaler Check-in pro Mahlzeit: 1–10 vor und nach dem Essen.
   Nichts wird erzwungen oder bewertet.
   ============================================================ */
import {
  getDay, dayLabel, MEALS, setCheckin, clearCheckin,
} from './store.js';
import { openSheet, toast, haptic } from './ui.js';
import { tr } from './i18n.js';

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Vorhandenen Check-in einer Mahlzeit lesen. */
export function checkinFor(day, mealId) {
  const c = day?.checkins?.[mealId];
  if (!c) return null;
  const before = Number(c.before) || null;
  const after = Number(c.after) || null;
  return before || after ? { before, after } : null;
}

/** Kurzer Text für die Mahlzeitenkarte. */
export function checkinSummary(day, mealId) {
  const c = checkinFor(day, mealId);
  if (!c) return 'Hunger & Sättigung';
  const parts = [];
  if (c.before) parts.push(`Hunger ${c.before}/10`);
  if (c.after) parts.push(`Sättigung ${c.after}/10`);
  return parts.join(' · ');
}

function scaleButtons(scale) {
  return VALUES.map((n) => `
    <button type="button" data-scale="${scale}" data-value="${n}" aria-pressed="false" aria-label="${scale === 'before' ? 'Hunger' : 'Sättigung'} ${n}">${n}</button>
  `).join('');
}

/** Check-in-Sheet für eine Mahlzeit öffnen. */
export function openCheckinSheet(dateKey, mealId) {
  const day = getDay(dateKey);
  const meal = MEALS.find((m) => m.id === mealId);
  const current = checkinFor(day, mealId);
  let before = current?.before || null;
  let after = current?.after || null;

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:16px">Optional: Wie hungrig warst du vor dem Essen, wie satt danach? Beides ist freiwillig – du kannst auch nur eine Angabe machen.</p>

    <div class="checkin-scale">
      <div class="hstack" style="justify-content:space-between;align-items:center">
        <span class="small" style="font-weight:650">Hunger vor dem Essen</span>
        <span class="pill neutral" data-out="before">–</span>
      </div>
      <div class="scale" data-grid="before">${scaleButtons('before')}</div>
      <div class="tiny muted">1 = kaum Hunger · 10 = sehr hungrig</div>
    </div>

    <div class="divider"></div>

    <div class="checkin-scale">
      <div class="hstack" style="justify-content:space-between;align-items:center">
        <span class="small" style="font-weight:650">Sättigung nach dem Essen</span>
        <span class="pill neutral" data-out="after">–</span>
      </div>
      <div class="scale" data-grid="after">${scaleButtons('after')}</div>
      <div class="tiny muted">1 = noch hungrig · 10 = übervoll</div>
    </div>

    <p class="tiny muted" style="margin-top:16px">Kein Ziel, keine Bewertung. Tippe eine gewählte Zahl erneut an, um sie zu entfernen.</p>
  `;

  const sheet = openSheet({
    title: 'Hunger & Sättigung',
    subtitle: `${tr(meal?.label || '')} · ${tr(dayLabel(dateKey))}`,
    body,
    footer: current
      ? '<button class="btn" data-clear>Löschen</button><button class="btn btn-primary grow" data-save>Speichern</button>'
      : '<button class="btn btn-primary btn-block" data-save>Speichern</button>',
  });

  const paint = () => {
    body.querySelectorAll('[data-grid]').forEach((grid) => {
      const selected = grid.dataset.grid === 'before' ? before : after;
      grid.querySelectorAll('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(Number(b.dataset.value) === selected));
      });
    });
    const outBefore = body.querySelector('[data-out="before"]');
    const outAfter = body.querySelector('[data-out="after"]');
    if (outBefore) outBefore.textContent = before ? String(before) : '–';
    if (outAfter) outAfter.textContent = after ? String(after) : '–';
  };
  paint();

  body.querySelectorAll('[data-scale]').forEach((b) => b.addEventListener('click', () => {
    const value = Number(b.dataset.value);
    if (b.dataset.scale === 'before') before = before === value ? null : value;
    else after = after === value ? null : value;
    paint();
    haptic();
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    if (!before && !after) {
      clearCheckin(dateKey, mealId);
      toast('Check-in entfernt');
    } else {
      setCheckin(dateKey, mealId, { before, after });
      toast('Körpergefühl gespeichert');
    }
    haptic(12);
    sheet.close();
  });

  sheet.foot?.querySelector('[data-clear]')?.addEventListener('click', () => {
    clearCheckin(dateKey, mealId);
    toast('Check-in entfernt');
    haptic(12);
    sheet.close();
  });
}
