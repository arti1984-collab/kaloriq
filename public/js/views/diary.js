/* ============================================================
   Kaloriq – Tagebuch
   ============================================================ */
import {
  store, getDay, todayKey, addDays, dayLabel, shortDate,
  totals, mealTotals, MEALS, entryMacros, removeEntry, updateEntry,
  setWater, setSteps, streak, weekSummary,
} from '../store.js';
import { esc, fmt, icon, ring, macroRow, toast, openSheet, confirmDialog, haptic } from '../ui.js';
import { flexStatus } from '../calc.js';
import { openAddSheet } from './add.js';
import { stepsMode, isCounting, pendingSteps, startSteps, stopSteps } from '../steps.js';

let selectedDate = todayKey();
let waterUnit = 'ml';

function waterText(ml) {
  const n = Math.abs(Number(ml) || 0);
  if (n >= 1000) {
    const digits = n % 1000 === 0 ? 0 : n % 100 === 0 ? 1 : 2;
    return `${fmt(n / 1000, digits)} l`;
  }
  return `${fmt(n)} ml`;
}

export function renderDiary(root) {
  const state = store.get();
  const key = selectedDate;
  const day = getDay(key);
  const t = totals(day);
  const target = state.targets;
  const pct = target.kcal ? t.kcal / target.kcal : 0;
  const remaining = Math.round(target.kcal - t.kcal);
  const over = remaining < 0;
  const waterTarget = target.water || 2400;
  const water = day.water || 0;
  const waterPct = waterTarget ? Math.min(100, Math.round((water / waterTarget) * 100)) : 0;

  const stepGoal = state.settings.stepGoal || 8000;
  const counting = isCounting();
  const isToday = key === todayKey();
  const stepMode = stepsMode();
  const stepsNow = (day.steps || 0) + (isToday ? pendingSteps() : 0);
  const stepsPct = stepGoal ? Math.min(100, Math.round((stepsNow / stepGoal) * 100)) : 0;
  const stepNote = !isToday
    ? 'Für vergangene Tage lassen sich Schritte manuell eintragen – gezählt wird immer für heute.'
    : stepMode === 'none'
      ? 'Kein Schrittsensor verfügbar – Schritte lassen sich manuell eintragen.'
      : stepMode === 'native'
        ? counting
          ? 'Zählt über den Gerätesensor – Schritte aus der Zeit mit geschlossener App werden beim nächsten Öffnen nachgetragen.'
          : 'Tippe auf ▶. Der Gerätesensor zählt auch mit, während die App geschlossen ist.'
        : counting
          ? 'Zählt mit, solange Kaloriq geöffnet ist. Im Hintergrund pausiert der Sensor.'
          : 'Tippe auf ▶, um mitzuzählen – solange die App geöffnet ist.';

  const gentle = Boolean(state.settings.gentleMode);
  const paused = gentle && Boolean(state.settings.gentlePaused);
  const minimal = Boolean(state.settings.minimalMode);
  const bandPct = Math.max(0, Number(state.settings.flexBand) || 0);
  const flex = flexStatus(t.kcal, target.kcal, bandPct);
  const flexOn = flex.enabled;
  const gentleBand = bandPct || 5;
  const gentleFlex = flexStatus(t.kcal, target.kcal, gentleBand);
  const week = gentle ? weekSummary() : null;
  const weekAvg = week?.avgKcal || 0;
  const weekRatio = target.kcal ? weekAvg / target.kcal : 0;
  const weekPct = Math.min(100, Math.round(weekRatio * 100));
  const weekFlex = flexStatus(weekAvg, target.kcal, bandPct || 10);
  const weekStatus = !week?.loggedDays
    ? 'Noch keine Einträge in den letzten 7 Tagen.'
    : weekFlex.state === 'above'
      ? 'Etwas über dem Richtwert. Einzelne Tage gleichen sich aus – kein Grund, morgen zu sparen.'
      : weekFlex.state === 'below'
        ? 'Diese Woche liegt unter dem Richtwert. Auch das ist okay.'
        : 'Du liegst im Wochenrahmen.';
  const gentlePill = gentleFlex.state === 'empty'
    ? 'Noch offen'
    : gentleFlex.state === 'in'
      ? 'im Rahmen'
      : gentleFlex.state === 'above'
        ? 'etwas darüber'
        : isToday ? 'noch darunter' : 'unter Richtwert';
  const gentlePillClass = gentleFlex.state === 'in' ? '' : 'neutral';
  const gentleNote = gentleFlex.state === 'empty'
    ? 'Noch nichts eingetragen. Du musst heute nicht alles perfekt machen.'
    : gentleFlex.state === 'above'
      ? 'Etwas über dem Richtwert. Das gleicht sich über die Woche aus – kein Grund, morgen zu sparen.'
      : gentleFlex.state === 'below'
        ? 'Heute liegt unter dem Richtwert. Auch das ist okay – kein Grund, alles aufzuholen.'
        : 'Du bist im Rahmen. Kein Grund, heute etwas nachzuholen.';
  const headerSub = minimal
    ? 'Minimal · ohne Zahlen'
    : gentle
      ? paused
        ? 'Pause · ohne Kaloriendruck'
        : `<span>${week.loggedDays}/7</span> <span>Tage mit Eintrag</span> · <span>Sanfter Modus</span>`
      : `${streak() > 0 ? `🔥 ${streak()} ${streak() === 1 ? 'Tag' : 'Tage'} Serie · ` : ''}${fmt(target.kcal)} kcal ${flexOn ? 'Richtwert' : 'Ziel'}`;

  const normalSummary = () => {
    const statusLabel = flexOn
      ? flex.state === 'empty'
        ? 'Noch offen'
        : flex.state === 'in'
          ? 'im Rahmen'
          : flex.state === 'above'
            ? 'etwas darüber'
            : isToday ? 'noch darunter' : 'unter Richtwert'
      : `${Math.round(pct * 100)} %`;
    const statusClass = flexOn
      ? flex.state === 'in' ? '' : 'neutral'
      : over ? 'danger' : '';

    return `
    <section class="card summary">
      <div class="summary-grid">
        ${ring({
          size: 132,
          stroke: 11,
          pct: Math.min(1, pct),
          color: over && !flexOn ? 'var(--danger)' : 'var(--accent)',
          id: 'kcal',
          center: `<div class="big" style="${over && !flexOn ? 'color:var(--danger)' : ''}">${fmt(Math.abs(remaining))}</div>
                   <div class="small">${over ? (flexOn && flex.state === 'in' ? 'kcal im Spielraum' : 'kcal drüber') : 'kcal übrig'}</div>`,
        })}
        <div>
          <div class="kcal-left">
            <div class="hstack" style="justify-content:space-between;align-items:flex-end">
              <div>
                <div class="num">${fmt(t.kcal)}</div>
                <div class="lbl">von ${fmt(target.kcal)} kcal</div>
              </div>
              <span class="pill ${statusClass}">${statusLabel}</span>
            </div>
          </div>
          ${flexOn ? `<div class="flex-hint">Ziel ±${bandPct} %: ${fmt(flex.low)}–${fmt(flex.high)} kcal</div>` : ''}
          <div class="macros">
            ${macroRow('Protein', t.protein, target.protein, 'protein', flexOn)}
            ${macroRow('KH', t.carbs, target.carbs, 'carbs', flexOn)}
            ${macroRow('Fett', t.fat, target.fat, 'fat', flexOn)}
          </div>
        </div>
      </div>
    </section>`;
  };

  const gentleSummary = () => `
    <section class="card summary gentle-card">
      <div class="summary-grid">
        ${ring({
          size: 132,
          stroke: 11,
          pct: Math.min(1, pct),
          color: 'var(--accent)',
          id: 'kcal',
          center: `<div class="big">${fmt(t.kcal)}</div>
                   <div class="small">kcal heute</div>`,
        })}
        <div>
          <div class="kcal-left">
            <div class="hstack" style="justify-content:space-between;align-items:flex-end">
              <div>
                <div class="num">${fmt(t.kcal)}</div>
                <div class="lbl">von ${fmt(target.kcal)} kcal</div>
              </div>
              <span class="pill ${gentlePillClass}">${gentlePill}</span>
            </div>
          </div>
          <div class="flex-hint">Ziel ±${gentleBand} %: ${fmt(gentleFlex.low)}–${fmt(gentleFlex.high)} kcal</div>
          <div class="macros">
            ${macroRow('Protein', t.protein, target.protein, 'protein', true)}
            ${macroRow('KH', t.carbs, target.carbs, 'carbs', true)}
            ${macroRow('Fett', t.fat, target.fat, 'fat', true)}
          </div>
        </div>
      </div>
      <p class="gentle-note">${gentleNote}</p>
      <button class="btn btn-sm btn-ghost" data-gentle-pause style="margin-top:10px">${icon('pause')} Pause machen</button>
    </section>`;

  const minimalCard = () => `
    <section class="card minimal-card">
      <div class="gentle-kicker">Minimalmodus</div>
      <p class="gentle-note">Kalorienziel und Makros sind ausgeblendet. Trag einfach ein, was du gegessen hast – ohne Zahlen zu vergleichen.</p>
      <button class="btn btn-sm btn-ghost" data-minimal-off style="margin-top:10px">${icon('chart')} Zahlen einblenden</button>
    </section>`;

  const gentleWeek = () => `
    <section class="card gentle-card">
      <div class="card-title" style="margin-bottom:2px">Wochenbalance</div>
      <div class="tiny muted"><span>Letzte 7 Tage</span> · <span>Wochenrahmen</span> ${fmt(target.kcal * 7)} kcal</div>
      <div class="hstack" style="align-items:flex-end;margin-top:12px">
        <div class="gentle-week-value">${fmt(weekAvg)}<span class="small muted" style="font-weight:600"> kcal Ø</span></div>
        <div class="grow" style="text-align:right">
          <div class="tiny muted">Richtwert pro Tag</div>
          <div style="font-weight:680">${fmt(target.kcal)} kcal</div>
        </div>
      </div>
      <div class="bar gentle" style="margin-top:10px"><i style="width:${weekPct}%"></i></div>
      <p class="gentle-note">${weekStatus}</p>
      <div class="tiny muted" style="margin-top:6px">${week.loggedDays}/7 <span>${week.loggedDays === 1 ? 'Tag mit Eintrag' : 'Tage mit Eintrag'}</span></div>
    </section>`;

  const pauseCard = () => `
    <section class="card gentle-card gentle-pause">
      <div class="gentle-kicker">Pause</div>
      <h2 style="margin:8px 0 6px">Kein Kaloriendruck</h2>
      <p class="small muted" style="max-width:320px;margin:0 auto">Dein Kalorienziel ist im Tagebuch ausgeblendet. Du kannst trotzdem eintragen, was du möchtest – nichts wird bewertet.</p>
      <button class="btn btn-primary" data-gentle-resume style="margin-top:14px">Pause beenden</button>
    </section>`;

  root.innerHTML = `
    <header class="topbar">
      <div class="grow">
        <h1>Tagebuch</h1>
        <div class="sub">${headerSub}</div>
      </div>
      <button class="icon-btn" data-recipes aria-label="Rezepte">${icon('bowl')}</button>
      <button class="icon-btn" data-today aria-label="Zu heute springen">${icon('refresh')}</button>
    </header>

    <div class="datenav">
      <button class="icon-btn" data-prev aria-label="Vorheriger Tag">${icon('left')}</button>
      <button class="day" data-today style="border:0;background:none;cursor:pointer">
        ${esc(dayLabel(key))}<small>${shortDate(key)}${key === todayKey() ? '' : ' · tippen für heute'}</small>
      </button>
      <button class="icon-btn" data-next aria-label="Nächster Tag" ${key >= todayKey() ? 'disabled style="opacity:.35"' : ''}>${icon('right')}</button>
    </div>

    ${paused ? pauseCard() : minimal ? minimalCard() : gentle ? gentleSummary() : normalSummary()}
    ${gentle && !paused && !minimal ? gentleWeek() : ''}

    <section class="card">
      <div class="hstack" style="align-items:flex-start">
        <div class="grow">
          <div class="card-title" style="margin-bottom:4px">Wasser</div>
          <div>
            <b style="font-size:17px">${fmt(water)}</b>
            <span class="muted small">/ ${fmt(waterTarget)} ml</span>
            <span class="tiny muted">· ${waterText(water)}</span>
          </div>
        </div>
        <button class="icon-btn" data-water-minus aria-label="Wasser entfernen">−</button>
      </div>
      <div class="bar water" style="margin-top:10px"><i style="width:${waterPct}%"></i></div>
      <form class="water-add" data-water-form>
        <input class="input" data-water-input type="text" inputmode="decimal" autocomplete="off"
          placeholder="${waterUnit === 'l' ? 'Menge in Litern' : 'Menge in ml'}" aria-label="Wassermenge">
        <div class="seg water-unit" data-water-unit>
          <button type="button" data-unit="ml" aria-selected="${waterUnit === 'ml'}">ml</button>
          <button type="button" data-unit="l" aria-selected="${waterUnit === 'l'}">l</button>
        </div>
        <button class="btn btn-primary btn-icon-only" type="submit" aria-label="Wasser hinzufügen">${icon('plus')}</button>
      </form>
      <div class="chips" style="margin-top:10px">
        ${[250, 500, 750, 1000].map((ml) => `<button class="chip" data-water-quick="${ml}">+ ${waterText(ml)}</button>`).join('')}
      </div>
    </section>

    <section class="card">
      <div class="hstack" style="align-items:flex-start">
        <div class="grow">
          <div class="card-title" style="margin-bottom:4px">Schritte</div>
          <div>
            <b style="font-size:17px" data-steps-total>${fmt(stepsNow)}</b>
            <span class="muted small">/ ${fmt(stepGoal)}</span>
            <span class="tiny muted" data-steps-pct>· ${stepsPct} %</span>
          </div>
        </div>
        ${isToday ? `<button class="icon-btn" data-steps-toggle aria-label="${counting ? 'Zählen stoppen' : 'Zählen starten'}">
          ${icon(counting ? 'stop' : 'play')}
        </button>` : ''}
      </div>
      <div class="bar accent" style="margin-top:10px"><i data-steps-bar style="width:${stepsPct}%"></i></div>
      <div class="hstack" style="margin-top:10px">
        <button class="btn btn-sm btn-ghost grow" data-steps-edit>${icon('pencil')} Schritte korrigieren</button>
      </div>
      <p class="tiny muted" style="margin-top:6px">${stepNote}</p>
    </section>

    <div class="section-title">Mahlzeiten</div>
    ${MEALS.map((meal) => mealCard(day, meal)).join('')}

    <p class="tiny muted center" style="margin:18px 0 8px">
      ${t.fiber > 0 ? `${fmt(t.fiber)} g Ballaststoffe · ` : ''}${day.entries.length} Einträge
    </p>
  `;

  // Navigation
  root.querySelector('[data-recipes]')?.addEventListener('click', () => {
    location.hash = '#/recipes';
  });
  root.querySelectorAll('[data-today]').forEach((btn) => btn.addEventListener('click', () => {
    selectedDate = todayKey();
    renderDiary(root);
    haptic();
  }));
  root.querySelector('[data-prev]')?.addEventListener('click', () => {
    selectedDate = addDays(selectedDate, -1);
    renderDiary(root);
  });
  root.querySelector('[data-next]')?.addEventListener('click', () => {
    if (selectedDate >= todayKey()) return;
    selectedDate = addDays(selectedDate, 1);
    renderDiary(root);
  });

  // Wasser – freie Eingabe in ml oder Litern
  const waterInput = root.querySelector('[data-water-input]');
  const waterUnits = root.querySelectorAll('[data-water-unit] [data-unit]');

  const setWaterUnit = (next) => {
    waterUnit = next === 'l' ? 'l' : 'ml';
    waterUnits.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.unit === waterUnit)));
    waterInput.placeholder = waterUnit === 'l' ? 'Menge in Litern' : 'Menge in ml';
  };
  waterUnits.forEach((b) => b.addEventListener('click', () => {
    setWaterUnit(b.dataset.unit);
    haptic();
    waterInput.focus();
  }));

  const readWaterAmount = () => {
    const raw = String(waterInput.value).trim().replace(',', '.');
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n === 0) return null;
    return Math.round(waterUnit === 'l' ? n * 1000 : n);
  };

  root.querySelector('[data-water-form]').addEventListener('submit', (e) => {
    e.preventDefault();
    const ml = readWaterAmount();
    if (ml === null) {
      toast('Bitte eine Menge eingeben', 'err');
      waterInput.focus();
      return;
    }
    setWater(key, (day.water || 0) + ml);
    haptic();
    toast(ml > 0 ? `${waterText(ml)} hinzugefügt` : `${waterText(-ml)} entfernt`);
    waterInput.value = '';
  });

  root.querySelectorAll('[data-water-quick]').forEach((btn) => btn.addEventListener('click', () => {
    const ml = Number(btn.dataset.waterQuick);
    setWater(key, (day.water || 0) + ml);
    haptic();
    toast(`${waterText(ml)} hinzugefügt`);
  }));

  root.querySelector('[data-water-minus]').addEventListener('click', () => {
    setWater(key, (day.water || 0) - 250);
    haptic();
  });

  // Schritte
  root.querySelector('[data-steps-toggle]')?.addEventListener('click', async () => {
    if (isCounting()) {
      stopSteps();
      toast('Schrittzähler gestoppt');
      renderDiary(root);
      return;
    }
    const ok = await startSteps();
    toast(ok ? 'Schrittzähler läuft' : 'Kein Zugriff auf den Bewegungssensor', ok ? 'ok' : 'err');
    renderDiary(root);
  });
  root.querySelector('[data-steps-edit]').addEventListener('click', () => openStepsSheet(key, root));

  // Sanfter Modus: Pause starten/beenden, alle Daten bleiben erhalten.
  root.querySelector('[data-gentle-pause]')?.addEventListener('click', () => {
    store.saveSettings({ gentlePaused: true });
    toast('Pause aktiviert');
    haptic();
  });
  root.querySelector('[data-gentle-resume]')?.addEventListener('click', () => {
    store.saveSettings({ gentlePaused: false });
    toast('Pause beendet');
    haptic();
  });
  root.querySelector('[data-minimal-off]')?.addEventListener('click', () => {
    store.saveSettings({ minimalMode: false });
    toast('Zahlen wieder eingeblendet');
    haptic();
  });

  // Mahlzeiten
  root.querySelectorAll('[data-add-meal]').forEach((btn) => btn.addEventListener('click', () => {
    openAddSheet({ dateKey: key, meal: btn.dataset.addMeal });
  }));

  root.querySelectorAll('[data-entry]').forEach((btn) => btn.addEventListener('click', () => {
    const entry = day.entries.find((e) => e.id === btn.dataset.entry);
    if (entry) openEntrySheet(entry, key);
  }));
}

/* Live-Anzeige, während der Sensor Schritte zählt (ohne die Ansicht neu zu bauen). */
window.addEventListener('kaloriq:steps', () => {
  const totalEl = document.querySelector('[data-steps-total]');
  if (!totalEl) return;
  const key = selectedDate;
  const total = (getDay(key).steps || 0) + (key === todayKey() ? pendingSteps() : 0);
  const goal = store.get().settings.stepGoal || 8000;
  const pct = goal ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  totalEl.textContent = fmt(total);
  const pctEl = document.querySelector('[data-steps-pct]');
  if (pctEl) pctEl.textContent = `· ${pct} %`;
  const bar = document.querySelector('[data-steps-bar]');
  if (bar) bar.style.width = `${pct}%`;
});

/* Rückmeldung der nativen Brücke, wenn die Berechtigung fehlt. */
window.addEventListener('kaloriq:steps-status', (event) => {
  const status = event.detail?.status;
  if (status === 'denied') {
    toast('Berechtigung für den Schrittsensor wurde nicht erteilt', 'err');
  } else if (status === 'unavailable') {
    toast('Kein Schrittsensor verfügbar', 'err');
  }
});

/* ---------------- Schritte korrigieren ---------------- */

function openStepsSheet(key, root) {
  const day = getDay(key);
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="step-count">Schritte</label>
      <input class="input" id="step-count" type="number" inputmode="numeric" step="1" value="${day.steps || 0}">
      <span class="hint">Gesamtzahl für ${esc(dayLabel(key))}.</span>
    </div>
    <div class="chips">
      ${[1000, 2000, 5000].map((n) => `<button class="chip" data-add-steps="${n}">+ ${fmt(n)}</button>`).join('')}
    </div>
  `;

  const sheet = openSheet({
    title: 'Schritte korrigieren',
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Speichern</button>',
  });

  const input = body.querySelector('#step-count');
  body.querySelectorAll('[data-add-steps]').forEach((b) => b.addEventListener('click', () => {
    input.value = String((Number(input.value) || 0) + Number(b.dataset.addSteps));
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    setSteps(key, Number(input.value) || 0);
    sheet.close();
    toast('Schritte gespeichert');
    renderDiary(root);
  });
}

function mealCard(day, meal) {
  const entries = day.entries.filter((e) => e.meal === meal.id);
  const mt = mealTotals(day, meal.id);
  return `
    <section class="card meal">
      <div class="meal-head">
        <span class="meal-ico">${meal.icon}</span>
        <span class="meal-name">${meal.label}</span>
        <span class="meal-kcal">${entries.length ? fmt(mt.kcal) + ' kcal' : ''}</span>
        <button class="add-mini" data-add-meal="${meal.id}" aria-label="${meal.label} hinzufügen">+</button>
      </div>
      ${entries.length
        ? entries.map((e) => entryRow(e)).join('')
        : `<div class="empty-line">Noch nichts eingetragen</div>`}
    </section>`;
}

function entryRow(entry) {
  const m = entryMacros(entry);
  const thumb = entry.photo
    ? `<img src="${esc(entry.photo)}" alt="">`
    : (entry.emoji || '🍽️');
  const sub = [
    `${fmt(entry.grams, entry.grams % 1 ? 1 : 0)} g`,
    entry.brand ? esc(entry.brand) : '',
    m.protein || m.carbs || m.fat ? `P ${fmt(m.protein)} · KH ${fmt(m.carbs)} · F ${fmt(m.fat)}` : '',
  ].filter(Boolean).join(' · ');

  const badge = entry.source === 'recipe'
    ? '<span class="badge-ai">Rezept</span>'
    : (entry.source === 'ai' ? '<span class="badge-ai">KI</span>' : '');

  return `
    <button class="entry" data-entry="${esc(entry.id)}">
      <span class="thumb">${thumb}</span>
      <span class="body">
        <span class="t">${esc(entry.name)} ${badge}</span>
        <span class="s">${sub}</span>
      </span>
      <span class="k">${fmt(m.kcal)}<small> kcal</small></span>
    </button>`;
}

/* ---------------- Eintrag bearbeiten ---------------- */

export function openEntrySheet(entry, key) {
  const m0 = entryMacros(entry);
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="entry-grams">Menge (g)</label>
      <input class="input" id="entry-grams" type="number" inputmode="decimal" step="1" value="${entry.grams}">
    </div>
    <div class="chips" style="margin:-4px 0 16px">
      ${[50, 100, 150, 200, 250].map((g) => `<button class="chip" data-g="${g}">${g} g</button>`).join('')}
    </div>
    <div class="stat-grid" id="entry-stats"></div>
    <div class="divider"></div>
    <div class="vstack tiny muted">
      <div class="row static" style="padding:0;border:0"><span class="grow">Pro 100 g</span><span class="v">${fmt(entry.per100.kcal, 1)} kcal · P ${fmt(entry.per100.protein, 1)} · KH ${fmt(entry.per100.carbs, 1)} · F ${fmt(entry.per100.fat, 1)}</span></div>
      <div class="row static" style="padding:0;border:0"><span class="grow">Quelle</span><span class="v">${sourceLabel(entry.source)}</span></div>
    </div>
  `;

  const sheet = openSheet({
    title: entry.name,
    subtitle: entry.brand || (entry.meal ? MEALS.find((x) => x.id === entry.meal)?.label : ''),
    body,
    footer: `
      <button class="btn btn-danger btn-icon-only" data-del aria-label="Löschen">${icon('trash')}</button>
      <button class="btn btn-primary grow" data-save>Speichern</button>
    `,
    tall: false,
  });

  const input = sheet.body.querySelector('#entry-grams');
  const stats = sheet.body.querySelector('#entry-stats');

  const paint = () => {
    const grams = Math.max(0, Number(String(input.value).replace(',', '.')) || 0);
    const e = { ...entry, grams };
    const m = entryMacros(e);
    stats.innerHTML = `
      <div class="stat"><div class="lbl">Kalorien</div><div class="val">${fmt(m.kcal)}</div></div>
      <div class="stat"><div class="lbl">Protein</div><div class="val">${fmt(m.protein)}<small> g</small></div></div>
      <div class="stat"><div class="lbl">Kohlenhydrate</div><div class="val">${fmt(m.carbs)}<small> g</small></div></div>
      <div class="stat"><div class="lbl">Fett</div><div class="val">${fmt(m.fat)}<small> g</small></div></div>`;
  };
  paint();
  input.addEventListener('input', paint);
  sheet.body.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => {
    input.value = b.dataset.g;
    paint();
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const grams = Math.max(1, Number(String(input.value).replace(',', '.')) || 0);
    updateEntry(key, entry.id, { grams });
    sheet.close();
    toast('Eintrag aktualisiert');
  });

  sheet.foot?.querySelector('[data-del]')?.addEventListener('click', async () => {
    sheet.close();
    const ok = await confirmDialog({
      title: 'Eintrag löschen?',
      message: `"${entry.name}" wird aus dem Tagebuch entfernt.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (ok) {
      removeEntry(key, entry.id);
      toast('Gelöscht');
    }
  });

  if (!entry.meal) sheet.foot?.querySelector('[data-save]')?.setAttribute('disabled', '');
  void m0;
}

function sourceLabel(source) {
  return {
    local: 'Datenbank',
    off: 'Open Food Facts',
    ai: 'KI-Schätzung',
    demo: 'Demo-Schätzung',
    manual: 'Manuell',
    custom: 'Eigenes Lebensmittel',
    recipe: 'Rezept',
  }[source] || 'Manuell';
}
