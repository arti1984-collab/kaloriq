/* ============================================================
   Kaloriq – Intervallfasten
   ============================================================ */
import { store, todayKey, getDay, startFast, stopFast, addDays } from '../store.js';
import { FASTING_PLANS } from '../calc.js';
import { esc, fmt, icon, toast, ring, haptic } from '../ui.js';

let ticker = null;
let selectedPlan = '16:8';

export function renderFasting(root) {
  clearInterval(ticker);
  const state = store.get();
  const key = todayKey();
  const day = getDay(key);
  const fast = day.fast;
  const plan = FASTING_PLANS.find((p) => p.id === selectedPlan) || FASTING_PLANS[1];
  const active = fast && !fast.end;
  const finished = fast && fast.end;

  const hours = fast?.hours || plan.hours;
  const target = hours * 3600 * 1000;
  const elapsed = active ? Date.now() - fast.start : finished ? fast.end - fast.start : 0;
  const pct = Math.min(1, elapsed / target);
  const remaining = Math.max(0, target - elapsed);

  root.innerHTML = `
    <header class="topbar">
      <div class="grow">
        <h1>Fasten</h1>
        <div class="sub">${active ? 'Läuft gerade' : finished ? 'Heute abgeschlossen' : 'Bereit zum Start'}</div>
      </div>
    </header>

    <section class="card" style="padding-top:14px">
      <div class="fast-ring-wrap">
        <div class="fast-ring">
          ${ring({
            size: 190,
            stroke: 13,
            pct,
            color: active ? 'var(--accent)' : 'var(--muted)',
            id: 'fast',
            center: `
              <div class="time" id="fast-time">${formatDuration(active || finished ? remaining : target)}</div>
              <div class="state" id="fast-state">${active ? 'verbleibend' : finished ? 'geschafft' : hours + ' Stunden'}</div>`,
          })}
        </div>
      </div>

      <div class="hstack" style="justify-content:center;gap:8px;margin-top:10px">
        <span class="pill ${active ? '' : 'neutral'}">${active ? '🔥 Fasten aktiv' : finished ? '✅ Ziel erreicht' : 'Noch nicht gestartet'}</span>
        <span class="pill neutral">${fast ? fmt(elapsed / 3600000, 1) + ' h gefastet' : plan.label}</span>
      </div>

      <div style="margin-top:16px">
        ${active
          ? `<button class="btn btn-block btn-danger" data-stop>${icon('stop')} Fasten beenden</button>`
          : `<button class="btn btn-block btn-primary" data-start>${icon('play')} ${plan.label}-Fasten starten</button>`}
      </div>
    </section>

    <div class="section-title">Plan</div>
    <div class="chips">
      ${FASTING_PLANS.map((p) => `<button class="chip" data-plan="${p.id}" aria-pressed="${p.id === plan.id}">${p.label}</button>`).join('')}
    </div>
    <p class="tiny muted" style="margin:8px 4px 0">${esc(plan.desc)} · ${plan.hours} Stunden Essenspause.</p>

    <div class="section-title">Letzte 7 Tage</div>
    <section class="card flush">
      <div class="rows">
        ${lastWeek().map((d) => {
          const f = d.fast;
          const dur = f ? ((f.end || Date.now()) - f.start) / 3600000 : 0;
          const done = f && (f.end || Date.now()) - f.start >= (f.hours || 16) * 3600000;
          return `<div class="row static">
            <span class="grow">
              <span class="t">${esc(d.label)}</span>
              <span class="s">${f ? `${f.plan} · ${fmt(dur, 1)} h` : 'nicht gefastet'}</span>
            </span>
            <span class="v">${f ? (done ? '✅' : '⏳') : '–'}</span>
          </div>`;
        }).join('')}
      </div>
    </section>

    <div class="ai-note" style="margin-top:14px">
      <span>ℹ️</span>
      <span>Beim Fasten sind Wasser, ungesüßter Tee und schwarzer Kaffee erlaubt. Bei Vorerkrankungen, Schwangerschaft oder Essstörungen vorher ärztlich abklären.</span>
    </div>
  `;

  root.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => {
    selectedPlan = b.dataset.plan;
    renderFasting(root);
  }));

  root.querySelector('[data-start]')?.addEventListener('click', () => {
    startFast(key, plan.id, plan.hours);
    haptic(15);
    toast(`${plan.label}-Fasten gestartet`);
  });

  root.querySelector('[data-stop]')?.addEventListener('click', () => {
    stopFast(key);
    haptic(15);
  });

  if (active) {
    ticker = setInterval(() => {
      const el = document.getElementById('fast-time');
      if (!el) { clearInterval(ticker); return; }
      const left = Math.max(0, target - (Date.now() - fast.start));
      el.textContent = formatDuration(left);
      if (left <= 0) {
        const stateEl = document.getElementById('fast-state');
        if (stateEl) stateEl.textContent = 'Ziel erreicht';
      }
    }, 1000);
  }
}

function lastWeek() {
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return Array.from({ length: 7 }, (_, i) => {
    const key = addDays(todayKey(), -i);
    const d = getDay(key);
    const date = new Date(key + 'T00:00:00');
    return {
      ...d,
      label: i === 0 ? 'Heute' : i === 1 ? 'Gestern' : `${WD[date.getDay()]}, ${date.getDate()}.${date.getMonth() + 1}.`,
    };
  });
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
