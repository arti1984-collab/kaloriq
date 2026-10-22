/* ============================================================
   Kaloriq – Fortschritt (Gewicht, Woche, Makros)
   ============================================================ */
import { store, todayKey, setWeight, weightSeries, weekSummary, streak, series } from '../store.js';
import { bmi, bmiCategory, projection, round1 } from '../calc.js';
import { esc, fmt, icon, toast, openSheet, lineChart, weekBars, macroRow, haptic } from '../ui.js';
import { locale } from '../i18n.js';

export function renderProgress(root) {
  const state = store.get();
  const p = state.profile;
  const t = state.targets;
  const b = bmi(p);
  const cat = bmiCategory(b);
  const proj = projection(p);
  const weights = weightSeries().slice(-30);
  const diff = round1((p.weight || 0) - (p.targetWeight || 0));
  const week = weekSummary();
  const weekTotal = week.days.reduce((a, d) => a + d.totals.kcal, 0);
  const weekTarget = t.kcal * Math.max(1, week.loggedDays);

  root.innerHTML = `
    <header class="topbar">
      <div class="grow">
        <h1>Fortschritt</h1>
        <div class="sub">${streak() > 0 ? `🔥 ${streak()} ${streak() === 1 ? 'Tag' : 'Tage'} Serie · ` : ''}${week.loggedDays}/7 Tage getrackt</div>
      </div>
    </header>

    <section class="card">
      <div class="card-title">Gewicht</div>
      <div class="hstack" style="align-items:flex-end;margin-bottom:2px">
        <div class="big-num">${fmt(p.weight, 1)}<span class="small muted" style="font-size:15px;font-weight:600"> kg</span></div>
        <div class="grow" style="text-align:right">
          <div class="tiny muted">Ziel</div>
          <div style="font-weight:680">${fmt(p.targetWeight, 1)} kg</div>
        </div>
      </div>
      <div class="hstack" style="gap:8px;margin:6px 0 10px">
        <span class="pill ${cat.tone === 'ok' ? '' : cat.tone === 'danger' ? 'danger' : 'warn'}">BMI ${fmt(b, 1)} · ${cat.label}</span>
        <span class="pill ${Math.abs(diff) < 0.3 ? '' : 'neutral'}">${diff > 0 ? '−' : '+'} ${fmt(Math.abs(diff), 1)} kg bis Ziel</span>
      </div>
      ${lineChart({
        points: weights.length ? weights.map((w) => ({ label: shortLabel(w.key), value: w.weight })) : [],
        target: p.targetWeight,
        unit: 'kg',
      })}
      <button class="btn btn-block" data-weight style="margin-top:14px">${icon('scale')} Gewicht eintragen</button>
    </section>

    <div class="stat-grid" style="margin-top:12px">
      <div class="stat">
        <div class="lbl">Grundumsatz</div>
        <div class="val">${fmt(t.bmr)}<small> kcal</small></div>
      </div>
      <div class="stat">
        <div class="lbl">Gesamtumsatz</div>
        <div class="val">${fmt(t.tdee)}<small> kcal</small></div>
      </div>
      <div class="stat">
        <div class="lbl">Tagesziel</div>
        <div class="val">${fmt(t.kcal)}<small> kcal</small></div>
      </div>
      <div class="stat">
        <div class="lbl">Ziel erreicht in</div>
        <div class="val">${proj.days > 0 ? fmt(proj.days) : '–'}<small>${proj.days > 0 ? ' Tagen' : ''}</small></div>
      </div>
    </div>

    <div class="section-title">Diese Woche</div>
    <section class="card">
      <div class="hstack" style="justify-content:space-between;margin-bottom:6px">
        <div>
          <div class="tiny muted">Ø Kalorien (${week.loggedDays} ${week.loggedDays === 1 ? 'Tag' : 'Tage'})</div>
          <div style="font-size:22px;font-weight:720;letter-spacing:-.03em">${fmt(week.avgKcal)} <span class="small muted" style="font-weight:600">kcal</span></div>
        </div>
        <span class="pill ${weekTarget && weekTotal > weekTarget * 1.08 ? 'warn' : ''}">
          ${week.loggedDays ? (weekTotal >= weekTarget * 0.92 && weekTotal <= weekTarget * 1.08 ? 'im Ziel' : weekTotal > weekTarget ? 'über Ziel' : 'unter Ziel') : 'keine Daten'}
        </span>
      </div>
      ${weekBars(week.days, t.kcal)}
      <div class="divider"></div>
      <div class="macros">
        ${macroRow('Protein', week.avgProtein, t.protein, 'protein')}
        ${macroRow('KH', week.avgCarbs, t.carbs, 'carbs')}
        ${macroRow('Fett', week.avgFat, t.fat, 'fat')}
      </div>
      <p class="tiny muted" style="margin-top:10px">Balken = Kalorien pro Tag, Linie = dein Ziel (${fmt(t.kcal)} kcal).</p>
    </section>

    <div class="section-title">Verlauf</div>
    <section class="card flush">
      <div class="rows">
        ${lastDays(series(7)).map((d) => `
          <div class="row static">
            <span class="grow">
              <span class="t">${esc(d.label)}</span>
              <span class="s">${d.day?.entries?.length || 0} Einträge · ${fmt(d.day?.water || 0)} ml Wasser</span>
            </span>
            <span class="v">${d.totals.kcal ? fmt(d.totals.kcal) + ' kcal' : '–'}</span>
          </div>`).join('')}
      </div>
    </section>

    <p class="tiny muted center" style="margin:16px 0 8px">Alle Angaben sind Schätzwerte – kein medizinisches Gerät.</p>
  `;

  root.querySelector('[data-weight]').addEventListener('click', openWeightSheet);
}

function lastDays(days) {
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return days.slice().reverse().map((d) => {
    const date = new Date(d.key + 'T00:00:00');
    let label;
    try {
      label = new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'numeric' }).format(date);
    } catch {
      label = `${WD[date.getDay()]}, ${date.getDate()}.${date.getMonth() + 1}.`;
    }
    return { ...d, label };
  });
}

function shortLabel(key) {
  const date = new Date(key + 'T00:00:00');
  try {
    return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'numeric' }).format(date);
  } catch {
    const [, m, d] = key.split('-');
    return `${Number(d)}.${Number(m)}.`;
  }
}

function openWeightSheet() {
  const p = store.get().profile;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="w">Gewicht (kg)</label>
      <input class="input" id="w" type="number" inputmode="decimal" step="0.1" value="${p.weight}">
    </div>
    <div class="chips">
      ${[-0.5, -0.1, 0.1, 0.5].map((d) => `<button class="chip" data-d="${d}">${d > 0 ? '+' : ''}${fmt(d, 1)}</button>`).join('')}
    </div>
    <p class="tiny muted" style="margin-top:14px">Tipp: am besten morgens, nackt und nach dem Toilettengang wiegen. Schwankungen von 1–2 kg pro Tag sind normal.</p>
  `;

  const sheet = openSheet({
    title: 'Gewicht eintragen',
    subtitle: 'Für ' + new Date().toLocaleDateString(locale(), { day: 'numeric', month: 'long' }),
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Speichern</button>',
  });

  const input = sheet.body.querySelector('#w');
  sheet.body.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
    input.value = round1((Number(input.value) || 0) + Number(b.dataset.d));
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const kg = Number(String(input.value).replace(',', '.'));
    if (!(kg >= 30 && kg <= 300)) return toast('Bitte ein realistisches Gewicht angeben', 'err');
    setWeight(todayKey(), kg);
    haptic(12);
    toast('Gewicht gespeichert');
    sheet.close();
  });

  setTimeout(() => input.select(), 250);
}
