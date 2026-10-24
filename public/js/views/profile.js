/* ============================================================
   Kaloriq – Profil & Einstellungen
   ============================================================ */
import { store, exportJson, importJson, todayKey, streak, streakInfo, listBackups, backupNow, restoreBackup } from '../store.js';
import { ACTIVITY, GOALS, MACRO_PRESETS, computeTargets, projection, round1, bmi, bmiCategory, flexStatus } from '../calc.js';
import {
  esc, fmt, icon, toast, openSheet, confirmDialog, downloadFile, haptic,
} from '../ui.js';
import { estimate, detectProxy, proxyStatus, listModels, pickModel } from '../ai.js';
import { APP_VERSION } from '../version.js';
import { getLang, setLang, locale } from '../i18n.js';

export function renderProfile(root) {
  const state = store.get();
  const p = state.profile;
  const t = state.targets;
  const proj = projection(p);
  const aiConfigured = Boolean(state.settings.apiKey) || proxyStatus();
  const gentle = Boolean(state.settings.gentleMode);
  const paused = gentle && Boolean(state.settings.gentlePaused);
  const minimal = Boolean(state.settings.minimalMode);
  const flexBand = Math.max(0, Number(state.settings.flexBand) || 0);
  const flexOn = flexBand > 0;
  const flexRange = flexStatus(t.kcal, t.kcal, flexBand);
  const grace = streakInfo();
  const graceUsedMonth = Math.min(grace.graceUsedThisMonth, grace.limit);
  const backups = listBackups();
  const backupSub = backups.length
    ? `${backups.length} ${backups.length === 1 ? 'Stand' : 'Stände'} · automatisch alle 12 Std.`
    : 'Automatisch alle 12 Std. – noch keine vorhanden';

  root.innerHTML = `
    <header class="topbar">
      <div class="grow"><h1>Profil</h1></div>
    </header>

    <div class="profile-head">
      <div class="avatar">${state.profile.name ? esc(state.profile.name.slice(0, 1).toUpperCase()) : '🙂'}</div>
      <div class="grow">
        <div class="name">${state.profile.name ? esc(state.profile.name) : 'Dein Profil'}</div>
        <div class="meta">${p.sex === 'male' ? 'Männlich' : 'Weiblich'} · ${p.age} J. · ${fmt(p.height)} cm · ${fmt(p.weight, 1)} kg${!gentle && streak() ? ` · 🔥 ${streak()} ${streak() === 1 ? 'Tag' : 'Tage'}` : ''}</div>
      </div>
      <button class="icon-btn" data-edit aria-label="Daten bearbeiten">${icon('pencil')}</button>
    </div>

    <section class="card summary" style="margin-top:14px">
      <div class="summary-grid">
        ${ringMini(t.kcal, p)}
        <div>
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.06em;font-weight:650">${gentle || flexOn ? 'Richtwert' : 'Tagesziel'}</div>
          <div style="font-size:26px;font-weight:740;letter-spacing:-.03em">${fmt(t.kcal)} <span class="small muted" style="font-weight:600">kcal</span></div>
          <div class="small muted" style="margin-top:2px">
            ${gentle
              ? `<span>Wochenrahmen</span> ${fmt(t.kcal * 7)} kcal · <span>${paused ? 'Pause aktiv' : 'ohne Tagesdruck'}</span>`
              : flexOn
                ? `<span>Spielraum</span> ±${flexBand} % · ${fmt(flexRange.low)}–${fmt(flexRange.high)} kcal`
                : `${p.goal === 'lose' ? `Defizit ${fmt(Math.abs(t.deficit))} kcal` : p.goal === 'gain' ? `Überschuss ${fmt(t.deficit)} kcal` : 'Erhaltung'} · ${esc(t.preset)}`}
          </div>
          <div class="hstack" style="gap:10px;margin-top:8px">
            <span class="pill">P ${fmt(t.protein)} g</span>
            <span class="pill neutral">KH ${fmt(t.carbs)} g</span>
            <span class="pill neutral">F ${fmt(t.fat)} g</span>
          </div>
        </div>
      </div>
    </section>

    <div class="section-title">Plan</div>
    <section class="card flush">
      <button class="row" data-edit>
        <span class="grow"><span class="t">Körperdaten & Ziel</span><span class="s">${esc(activityLabel(p.activity))} · ${esc(goalLabel(p.goal))}</span></span>
        <span class="v">${p.goal !== 'maintain' ? fmt(p.rate, 1) + ' kg/W' : '–'}</span>
        ${icon('chev', 'chev')}
      </button>
      <button class="row" data-macros>
        <span class="grow"><span class="t">Makro-Verteilung</span><span class="s">${esc(MACRO_PRESETS[p.macroPreset]?.label || 'Ausgewogen')}</span></span>
        <span class="v">${MACRO_PRESETS[p.macroPreset]?.protein} / ${MACRO_PRESETS[p.macroPreset]?.carbs} / ${MACRO_PRESETS[p.macroPreset]?.fat}</span>
        ${icon('chev', 'chev')}
      </button>
      <button class="row" data-watertarget>
        <span class="grow"><span class="t">Wasserziel</span><span class="s">aus Gewicht berechnet</span></span>
        <span class="v">${fmt(t.water)} ml</span>
        ${icon('chev', 'chev')}
      </button>
      <button class="row" data-stepgoal>
        <span class="grow"><span class="t">Schrittziel</span><span class="s">Tagesziel</span></span>
        <span class="v">${fmt(state.settings.stepGoal || 8000)}</span>
        ${icon('chev', 'chev')}
      </button>
    </section>

    <div class="section-title">Wohlbefinden</div>
    <section class="card flush">
      <button class="row" data-gentle role="switch" aria-checked="${gentle}" aria-label="Sanfter Modus">
        <span class="grow">
          <span class="t">Sanfter Modus</span>
          <span class="s">${gentle ? 'Aktiv · Wochenrahmen statt Tagesdruck' : 'Anti-Burnout: keine roten Zahlen, Pausen erlaubt'}</span>
        </span>
        <span class="switch" aria-hidden="true" aria-checked="${gentle}" style="pointer-events:none"></span>
      </button>
      ${gentle ? `<button class="row" data-gentle-pause>
        <span class="grow">
          <span class="t">${paused ? 'Pause beenden' : 'Tracking pausieren'}</span>
          <span class="s">${paused ? 'Kalorienziel wieder einblenden' : 'Tagesziel im Tagebuch ausblenden, Daten behalten'}</span>
        </span>
        ${icon(paused ? 'play' : 'pause', 'chev')}
      </button>` : ''}
      <button class="row" data-flex role="switch" aria-checked="${flexOn}" aria-label="Flexbereich">
        <span class="grow">
          <span class="t">Flexbereich</span>
          <span class="s">${flexOn ? `Aktiv · ±${flexBand} % Spielraum um den Richtwert` : 'Aus · Ziel zählt exakt'}</span>
        </span>
        <span class="switch" aria-hidden="true" aria-checked="${flexOn}" style="pointer-events:none"></span>
      </button>
      ${flexOn ? `<button class="row" data-flexband>
        <span class="grow">
          <span class="t">Toleranz</span>
          <span class="s">Wie viel Spielraum als „im Rahmen“ gilt</span>
        </span>
        <span class="v">±${flexBand} %</span>
        ${icon('chev', 'chev')}
      </button>` : ''}
      <button class="row" data-minimal role="switch" aria-checked="${minimal}" aria-label="Minimalmodus">
        <span class="grow">
          <span class="t">Minimalmodus</span>
          <span class="s">${minimal ? 'Aktiv · Ring, Ziel und Makros ausgeblendet' : 'Nur Mahlzeiten, Wasser und Schritte anzeigen'}</span>
        </span>
        <span class="switch" aria-hidden="true" aria-checked="${minimal}" style="pointer-events:none"></span>
      </button>
      <button class="row" data-grace>
        <span class="grow">
          <span class="t">Gnaden-Tage</span>
          <span class="s">${grace.limit
            ? `${graceUsedMonth} von ${grace.limit} diesen Monat genutzt`
            : 'Aus · ein leerer Tag bricht die Serie'}</span>
        </span>
        <span class="v">${grace.limit ? `${grace.graceRemaining} übrig` : '–'}</span>
        ${icon('chev', 'chev')}
      </button>
    </section>

    <div class="section-title">KI-Tracking</div>
    <section class="card flush">
      <button class="row" data-ai>
        <span class="grow">
          <span class="t">Gemini verbinden</span>
          <span class="s">${aiConfigured ? 'Aktiv · ' + esc(state.settings.model) : 'Demo-Modus (ohne Key)'}</span>
        </span>
        <span class="pill ${aiConfigured ? '' : 'warn'}">${aiConfigured ? 'verbunden' : 'Demo'}</span>
        ${icon('chev', 'chev')}
      </button>
      <button class="row" data-aitest>
        <span class="grow"><span class="t">Verbindung testen</span><span class="s">Kurze Testschätzung senden</span></span>
        ${icon('sparkles', 'chev')}
      </button>
    </section>

    <div class="section-title">App</div>
    <section class="card flush">
      <button class="row" data-lang>
        <span class="grow"><span class="t">Sprache</span><span class="s">${getLang() === 'en' ? 'English' : 'Deutsch'}</span></span>
        ${icon('chev', 'chev')}
      </button>
      <button class="row" data-install>
        <span class="grow"><span class="t">Auf dem Handy installieren</span><span class="s">Als App mit eigenem Icon</span></span>
        <span class="pill">Android</span>
      </button>
      <a class="row" href="https://www.tiktok.com/@kaloriq" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:inherit">
        <span class="grow"><span class="t">TikTok</span><span class="s">@kaloriq</span></span>
        ${icon('tiktok', 'chev')}
      </a>
      <button class="row" data-recipes>
        <span class="grow">
          <span class="t">Rezepte</span>
          <span class="s">${state.recipes?.length ? `${state.recipes.length} lokal gespeichert` : 'Noch keine Rezepte'}</span>
        </span>
        ${icon('bowl', 'chev')}
      </button>
      <button class="row" data-export>
        <span class="grow"><span class="t">Daten exportieren</span><span class="s">JSON-Backup</span></span>
        ${icon('download', 'chev')}
      </button>
      <button class="row" data-import>
        <span class="grow"><span class="t">Daten importieren</span><span class="s">Backup zurückspielen</span></span>
        ${icon('upload', 'chev')}
      </button>
      <button class="row" data-backups>
        <span class="grow"><span class="t">Sicherungen</span><span class="s">${backupSub}</span></span>
        ${icon('refresh', 'chev')}
      </button>
      <button class="row" data-reset>
        <span class="grow"><span class="t" style="color:var(--danger)">Alles zurücksetzen</span><span class="s">Löscht alle Einträge auf diesem Gerät</span></span>
      </button>
    </section>

    <p class="tiny muted center" style="margin:18px 0 6px">
      Kaloriq ${APP_VERSION} · lokale Daten, keine Cloud<br>
      Richtwerte, kein medizinisches Gerät.
    </p>
    <div style="height:8px"></div>
  `;

  root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openProfileSheet(root)));
  root.querySelector('[data-macros]').addEventListener('click', () => openMacroSheet(root));
  root.querySelector('[data-watertarget]').addEventListener('click', () => openWaterSheet(root));
  root.querySelector('[data-stepgoal]').addEventListener('click', () => openStepGoalSheet(root));
  root.querySelector('[data-gentle]').addEventListener('click', () => {
    const next = !store.get().settings.gentleMode;
    store.saveSettings({ gentleMode: next, ...(next ? {} : { gentlePaused: false }) });
    toast(next ? 'Sanfter Modus aktiviert' : 'Sanfter Modus deaktiviert');
    haptic();
  });
  root.querySelector('[data-gentle-pause]')?.addEventListener('click', () => {
    const next = !store.get().settings.gentlePaused;
    store.saveSettings({ gentlePaused: next });
    toast(next ? 'Pause aktiviert' : 'Pause beendet');
    haptic();
  });
  root.querySelector('[data-flex]').addEventListener('click', () => {
    const on = (Number(store.get().settings.flexBand) || 0) > 0;
    store.saveSettings({ flexBand: on ? 0 : 10 });
    toast(on ? 'Flexbereich deaktiviert' : 'Flexbereich aktiviert');
    haptic();
  });
  root.querySelector('[data-flexband]')?.addEventListener('click', () => openFlexBandSheet(root));
  root.querySelector('[data-minimal]').addEventListener('click', () => {
    const next = !store.get().settings.minimalMode;
    store.saveSettings({ minimalMode: next });
    toast(next ? 'Minimalmodus aktiviert' : 'Minimalmodus deaktiviert');
    haptic();
  });
  root.querySelector('[data-grace]').addEventListener('click', () => openGraceSheet(root));
  root.querySelector('[data-ai]').addEventListener('click', () => openAiSettings(root));
  root.querySelector('[data-aitest]').addEventListener('click', (e) => testAi(e.currentTarget));
  root.querySelector('[data-recipes]').addEventListener('click', () => {
    location.hash = '#/recipes';
  });
  root.querySelector('[data-export]').addEventListener('click', () => {
    downloadFile(`kaloriq-backup-${todayKey()}.json`, exportJson());
    toast('Backup gespeichert');
  });
  root.querySelector('[data-import]').addEventListener('click', openImport);
  root.querySelector('[data-backups]').addEventListener('click', () => openBackups(root));
  root.querySelector('[data-reset]').addEventListener('click', resetAll);
  root.querySelector('[data-install]').addEventListener('click', installApp);
  root.querySelector('[data-lang]').addEventListener('click', () => openLanguage(root));
}

/* ---------------- Bausteine ---------------- */

function ringMini(kcal, p) {
  return `<div style="width:96px;height:96px;border-radius:50%;background:var(--accent-soft);display:grid;place-items:center;text-align:center">
    <div>
      <div style="font-size:20px;font-weight:750;letter-spacing:-.03em">${fmt(kcal)}</div>
      <div class="tiny muted">kcal</div>
    </div>
  </div>`;
}

const activityLabel = (id) => ACTIVITY.find((a) => a.id === id)?.label || '–';
const goalLabel = (id) => GOALS.find((g) => g.id === id)?.label || '–';

/* ---------------- Profil bearbeiten ---------------- */

function openProfileSheet(root) {
  const p = { ...store.get().profile };
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="p-name">Name</label>
      <input class="input" id="p-name" value="${esc(p.name || '')}" placeholder="optional">
    </div>

    <div class="field">
      <label>Geschlecht</label>
      <div class="chips">
        <button class="chip" data-sex="female" aria-pressed="${p.sex === 'female'}">♀ Weiblich</button>
        <button class="chip" data-sex="male" aria-pressed="${p.sex === 'male'}">♂ Männlich</button>
      </div>
    </div>

    <div class="input-group" style="gap:10px">
      <div class="field grow"><label for="p-age">Alter</label><input class="input" id="p-age" type="number" inputmode="numeric" value="${p.age}"></div>
      <div class="field grow"><label for="p-height">Größe (cm)</label><input class="input" id="p-height" type="number" inputmode="decimal" value="${p.height}"></div>
    </div>

    <div class="input-group" style="gap:10px">
      <div class="field grow"><label for="p-weight">Gewicht (kg)</label><input class="input" id="p-weight" type="number" inputmode="decimal" step="0.1" value="${p.weight}"></div>
      <div class="field grow"><label for="p-target">Ziel (kg)</label><input class="input" id="p-target" type="number" inputmode="decimal" step="0.1" value="${p.targetWeight}"></div>
    </div>

    <div class="field">
      <label for="p-activity">Aktivität</label>
      <select class="select" id="p-activity">
        ${ACTIVITY.map((a) => `<option value="${a.id}" ${a.id === p.activity ? 'selected' : ''}>${esc(a.label)} – ${esc(a.desc)}</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label>Ziel</label>
      <div class="chips">
        ${GOALS.map((g) => `<button class="chip" data-goal="${g.id}" aria-pressed="${p.goal === g.id}">${g.icon} ${esc(g.label)}</button>`).join('')}
      </div>
    </div>

    <div class="field" id="rate-field" style="display:${p.goal === 'maintain' ? 'none' : 'grid'}">
      <label>Tempo: <b data-rate-out>${fmt(p.rate, 1)} kg/Woche</b></label>
      <input type="range" data-rate min="0.1" max="1" step="0.1" value="${p.rate}" style="width:100%;accent-color:var(--accent)">
    </div>
  `;

  const sheet = openSheet({
    title: 'Körperdaten & Ziel',
    body,
    footer: `
      <button class="btn" data-cancel>Abbrechen</button>
      <button class="btn btn-primary grow" data-save>Speichern</button>
    `,
    tall: true,
  });

  body.querySelectorAll('[data-sex]').forEach((b) => b.addEventListener('click', () => {
    p.sex = b.dataset.sex;
    body.querySelectorAll('[data-sex]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  body.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => {
    p.goal = b.dataset.goal;
    body.querySelectorAll('[data-goal]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    body.querySelector('#rate-field').style.display = p.goal === 'maintain' ? 'none' : 'grid';
  }));

  body.querySelector('[data-rate]').addEventListener('input', (e) => {
    p.rate = Number(e.target.value);
    body.querySelector('[data-rate-out]').textContent = fmt(p.rate, 1) + ' kg/Woche';
  });

  body.querySelector('[data-cancel]')?.addEventListener('click', () => sheet.close());

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const num = (id, fallback) => {
      const v = Number(String(body.querySelector(id).value).replace(',', '.'));
      return Number.isFinite(v) ? v : fallback;
    };
    p.name = body.querySelector('#p-name').value.trim().slice(0, 40);
    p.age = Math.min(99, Math.max(14, num('#p-age', p.age)));
    p.height = Math.min(230, Math.max(120, num('#p-height', p.height)));
    p.weight = round1(Math.min(300, Math.max(30, num('#p-weight', p.weight))));
    p.targetWeight = round1(Math.min(300, Math.max(30, num('#p-target', p.targetWeight))));
    p.activity = body.querySelector('#p-activity').value;
    store.saveProfile(p);
    haptic(10);
    toast('Profil aktualisiert');
    sheet.close();
    renderProfile(root);
  });
}

/* ---------------- Makros ---------------- */

function openMacroSheet(root) {
  const p = store.get().profile;
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">Die Verteilung bestimmt, wie sich dein Kalorienziel auf Protein, Kohlenhydrate und Fett aufteilt.</p>
    ${Object.entries(MACRO_PRESETS).map(([id, preset]) => {
      const preview = computeTargets({ ...p, macroPreset: id });
      return `<button class="choice" data-preset="${id}" aria-pressed="${p.macroPreset === id}">
        <span class="ico">${id === 'protein' ? '🥩' : id === 'lowcarb' ? '🥑' : '⚖️'}</span>
        <span class="grow">
          <span class="t">${esc(preset.label)}</span>
          <span class="s">${preset.protein} % P · ${preset.carbs} % KH · ${preset.fat} % F — ${fmt(preview.protein)} g / ${fmt(preview.carbs)} g / ${fmt(preview.fat)} g</span>
        </span>
        <span class="dot"></span>
      </button>`;
    }).join('')}
    <div class="ai-note" style="margin-top:6px">
      <span>💡</span><span>Für Muskelaufbau sind 1,6–2,2 g Protein pro kg Körpergewicht sinnvoll. Bei ${fmt(p.weight, 1)} kg also etwa ${fmt(Math.round(p.weight * 1.8))} g.</span>
    </div>
  `;

  const sheet = openSheet({ title: 'Makro-Verteilung', body, footer: '<button class="btn btn-primary btn-block" data-save>Übernehmen</button>' });

  let choice = p.macroPreset;
  body.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    choice = b.dataset.preset;
    body.querySelectorAll('[data-preset]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    store.saveProfile({ macroPreset: choice });
    toast('Makros angepasst');
    sheet.close();
    renderProfile(root);
  });
}

/* ---------------- Wasser ---------------- */

function openWaterSheet(root) {
  const state = store.get();
  const current = state.targets.water;
  const suggested = Math.min(4000, Math.max(1500, Math.round((state.profile.weight * 35) / 50) * 50));

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="w-target">Tagesziel (ml)</label>
      <input class="input" id="w-target" type="number" inputmode="numeric" step="50" value="${current}">
    </div>
    <div class="chips">
      ${[1500, 2000, 2500, 3000, 3500].map((ml) => `<button class="chip" data-ml="${ml}">${fmt(ml)} ml</button>`).join('')}
    </div>
    <p class="tiny muted" style="margin-top:14px">Empfehlung nach Gewicht: ca. 35 ml pro kg = <b>${fmt(suggested)} ml</b>. Hitze und Sport erhöhen den Bedarf.</p>
  `;

  const sheet = openSheet({
    title: 'Wasserziel',
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Speichern</button>',
  });

  const input = body.querySelector('#w-target');
  body.querySelectorAll('[data-ml]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.ml; }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const ml = Math.min(6000, Math.max(500, Number(input.value) || suggested));
    store.set((s) => { s.targets.water = Math.round(ml); }, 'targets');
    toast('Wasserziel gespeichert');
    sheet.close();
    renderProfile(root);
  });
}

/* ---------------- Schritte ---------------- */

function openStepGoalSheet(root) {
  const current = store.get().settings.stepGoal || 8000;
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="step-target">Tagesziel (Schritte)</label>
      <input class="input" id="step-target" type="number" inputmode="numeric" step="500" value="${current}">
      <span class="hint">Übliche Empfehlung: 7.000–10.000 Schritte pro Tag.</span>
    </div>
    <div class="chips">
      ${[5000, 7500, 8000, 10000, 12000].map((n) => `<button class="chip" data-step="${n}">${fmt(n)}</button>`).join('')}
    </div>
  `;

  const sheet = openSheet({
    title: 'Schrittziel',
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Speichern</button>',
  });

  const input = body.querySelector('#step-target');
  body.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.step; }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const goal = Math.min(50000, Math.max(1000, Math.round(Number(input.value) || 8000)));
    store.saveSettings({ stepGoal: goal });
    toast('Schrittziel gespeichert');
    sheet.close();
    renderProfile(root);
  });
}

/* ---------------- Flexbereich ---------------- */

function openFlexBandSheet(root) {
  const state = store.get();
  const current = Math.max(0, Number(state.settings.flexBand) || 0);
  const kcal = state.targets.kcal || 0;
  const options = [
    { value: 0, label: 'Aus', sub: 'Das Ziel zählt exakt' },
    { value: 5, label: '±5 %', sub: 'Enger Spielraum' },
    { value: 10, label: '±10 %', sub: 'Empfohlen' },
    { value: 15, label: '±15 %', sub: 'Großer Spielraum' },
  ];

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">Wie viel Spielraum um dein Kalorienziel als „im Rahmen“ gilt. Innerhalb des Bereichs bleibt alles neutral – ohne rote Zahlen.</p>
    ${options.map((o) => {
      const low = Math.round(kcal * (1 - o.value / 100));
      const high = Math.round(kcal * (1 + o.value / 100));
      const range = o.value && kcal ? `${fmt(low)}–${fmt(high)} kcal` : '';
      return `<button class="choice" data-band="${o.value}" aria-pressed="${current === o.value}">
        <span class="ico">${o.value ? '±' + o.value + ' %' : '–'}</span>
        <span class="grow">
          <span class="t">${o.label}</span>
          <span class="s">${o.sub}${range ? ` · ${range}` : ''}</span>
        </span>
        <span class="dot"></span>
      </button>`;
    }).join('')}
  `;

  const sheet = openSheet({
    title: 'Flexbereich',
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Übernehmen</button>',
  });

  let choice = current;
  body.querySelectorAll('[data-band]').forEach((b) => b.addEventListener('click', () => {
    choice = Number(b.dataset.band);
    body.querySelectorAll('[data-band]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    store.saveSettings({ flexBand: choice });
    toast(choice ? `Flexbereich ±${choice} %` : 'Flexbereich deaktiviert');
    haptic();
    sheet.close();
    renderProfile(root);
  });
}

/* ---------------- Gnaden-Tage ---------------- */

function openGraceSheet(root) {
  const info = streakInfo();
  const current = info.limit;
  const options = [
    { value: 0, label: 'Aus', sub: 'Ein leerer Tag bricht die Serie' },
    { value: 1, label: '1 pro Monat', sub: 'Eine bewusste Auszeit' },
    { value: 2, label: '2 pro Monat', sub: 'Empfohlen · ein Wochenende flexibel' },
    { value: 3, label: '3 pro Monat', sub: 'Großzügiger Spielraum' },
  ];

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">Ein Gnaden-Tag hält deine Serie am Leben, wenn du an einem Tag nichts einträgst. Sie werden automatisch verbraucht und gelten pro Kalendermonat – ohne Punkte, ohne Strafe.</p>
    <div class="card" style="padding:14px;margin-bottom:14px">
      <div class="hstack" style="justify-content:space-between">
        <span class="small" style="font-weight:620">Aktuelle Serie</span>
        <span class="pill">${info.count} ${info.count === 1 ? 'Tag' : 'Tage'}</span>
      </div>
      <p class="tiny muted" style="margin-top:6px">${info.limit
        ? `${Math.min(info.graceUsedThisMonth, info.limit)} von ${info.limit} Gnaden-Tagen diesen Monat genutzt.`
        : 'Gnaden-Tage sind ausgeschaltet.'}</p>
    </div>
    ${options.map((o) => `<button class="choice" data-grace-value="${o.value}" aria-pressed="${current === o.value}">
      <span class="ico">${o.value ? o.value : '–'}</span>
      <span class="grow">
        <span class="t">${o.label}</span>
        <span class="s">${o.sub}</span>
      </span>
      <span class="dot"></span>
    </button>`).join('')}
  `;

  const sheet = openSheet({
    title: 'Gnaden-Tage',
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Übernehmen</button>',
  });

  let choice = current;
  body.querySelectorAll('[data-grace-value]').forEach((b) => b.addEventListener('click', () => {
    choice = Number(b.dataset.graceValue);
    body.querySelectorAll('[data-grace-value]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    store.saveSettings({ graceDaysPerMonth: choice });
    toast(choice ? `${choice} Gnaden-Tag${choice === 1 ? '' : 'e'} pro Monat` : 'Gnaden-Tage deaktiviert');
    haptic();
    sheet.close();
    renderProfile(root);
  });
}

/* ---------------- KI-Einstellungen ---------------- */

function openAiSettings(root) {
  const s = { ...store.get().settings };
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="card" style="padding:14px;margin-bottom:14px">
      <div class="hstack" style="justify-content:space-between">
        <span class="small" style="font-weight:620">Server-Proxy</span>
        <span class="pill ${proxyStatus() ? '' : 'neutral'}">${proxyStatus() ? 'verfügbar' : 'nicht aktiv'}</span>
      </div>
      <p class="tiny muted" style="margin-top:6px">
        ${proxyStatus()
          ? 'Der lokale Server hat einen Key – Anfragen laufen über ihn, der Key bleibt auf dem Rechner.'
          : 'Läuft die App ohne Server (z. B. installiert), wird der Key direkt auf dem Gerät gespeichert und an Google gesendet.'}
      </p>
    </div>

    <div class="field">
      <label for="ai-key">Gemini API-Key</label>
      <input class="input" id="ai-key" type="password" autocomplete="off" spellcheck="false"
        placeholder="AIza…" value="${esc(s.apiKey || '')}">
      <span class="hint">Kostenlos unter aistudio.google.com/apikey erstellen.</span>
    </div>

    <div class="field">
      <label for="ai-model">Modell</label>
      <div class="hstack" style="gap:8px;align-items:stretch">
        <select class="select grow" id="ai-model">
          <option value="${esc(s.model || 'gemini-3.8-flash')}" selected>${esc(s.model || 'gemini-3.8-flash')}</option>
        </select>
        <button class="btn btn-sm" type="button" data-models>Laden</button>
      </div>
      <input class="input" id="ai-model-manual" placeholder="z. B. gemini-3.8-flash" spellcheck="false" autocomplete="off" style="margin-top:8px;display:none">
      <span class="hint" data-model-hint>Tippe auf „Laden“ – dann erscheint hier eine echte Auswahlliste mit allen Modellen deines Keys.</span>
    </div>

    <div class="hstack" style="justify-content:space-between;padding:12px 0">
      <span class="small" style="font-weight:600">Key anzeigen</span>
      <button class="switch" data-show role="switch" aria-checked="false"></button>
    </div>

    <div class="ai-note">
      <span>⚠️</span><span>Der Key wird nur lokal gespeichert. Wer Zugriff aufs Gerät hat, kann ihn lesen – nutze am besten einen eigenen, nicht geteilten Key.</span>
    </div>
  `;

  const sheet = openSheet({
    title: 'KI-Tracking',
    subtitle: 'Google Gemini',
    body,
    footer: `
      <button class="btn" data-del>Key löschen</button>
      <button class="btn btn-primary grow" data-save>Speichern</button>
    `,
    tall: true,
  });

  const keyInput = body.querySelector('#ai-key');
  const showBtn = body.querySelector('[data-show]');
  showBtn.addEventListener('click', () => {
    const on = keyInput.type === 'password';
    keyInput.type = on ? 'text' : 'password';
    showBtn.setAttribute('aria-checked', String(on));
  });

  body.querySelector('[data-del]')?.addEventListener('click', () => {
    keyInput.value = '';
    store.saveSettings({ apiKey: '' });
    toast('Key entfernt');
  });

  const modelSelect = body.querySelector('#ai-model');
  const manualInput = body.querySelector('#ai-model-manual');
  const modelHint = body.querySelector('[data-model-hint]');
  const loadBtn = body.querySelector('[data-models]');
  const MANUAL = '__manual';
  const modelCache = { key: '', at: 0, models: [] };

  const currentModel = () => (modelSelect.value === MANUAL ? manualInput.value.trim() : modelSelect.value);

  modelSelect.addEventListener('change', () => {
    const manual = modelSelect.value === MANUAL;
    manualInput.style.display = manual ? '' : 'none';
    if (manual) manualInput.focus();
  });

  /** Baut die Auswahlliste: aktuelles/empfohlenes Modell oben, Rest darunter. */
  function fillModels(models) {
    const current = modelSelect.value && modelSelect.value !== MANUAL ? modelSelect.value : '';
    const known = models.some((m) => m.id === current);
    const best = pickModel(models);
    const options = [];

    if (current && !known) {
      options.push(`<option value="${esc(current)}">${esc(current)} (gespeichert)</option>`);
    }
    for (const m of models) {
      const label = m.label && m.label !== m.id ? `${m.id} · ${m.label}` : m.id;
      options.push(`<option value="${esc(m.id)}">${esc(label)}</option>`);
    }
    options.push(`<option value="${MANUAL}">Anderes Modell eintippen…</option>`);

    modelSelect.innerHTML = options.join('');
    modelSelect.value = known ? current : best;
    if (modelSelect.value === MANUAL) manualInput.style.display = '';
  }

  async function loadModels({ force = false, silent = false } = {}) {
    if (loadBtn.disabled) return;
    await detectProxy();
    const apiKey = keyInput.value.trim();
    const useProxy = proxyStatus();
    const cacheKey = `${useProxy ? 'proxy' : 'key'}:${apiKey}`;
    const fresh = modelCache.key === cacheKey && Date.now() - modelCache.at < 10 * 60 * 1000;

    if (!force && fresh && modelCache.models.length) {
      fillModels(modelCache.models);
      modelHint.innerHTML = `${modelCache.models.length} Modelle verfügbar · empfohlen: <b>${esc(pickModel(modelCache.models))}</b>`;
      return;
    }

    const label = loadBtn.textContent;
    loadBtn.disabled = true;
    if (!silent) {
      loadBtn.textContent = '…';
      modelHint.textContent = 'Frage verfügbare Modelle ab…';
    }

    try {
      if (!apiKey && !useProxy) throw new Error('Bitte zuerst den API-Key eingeben.');
      const models = await listModels({ apiKey, useProxy });
      if (!models.length) throw new Error('Der Key liefert keine nutzbaren Gemini-Modelle.');
      modelCache.key = cacheKey;
      modelCache.at = Date.now();
      modelCache.models = models;
      fillModels(models);
      modelHint.innerHTML = `${models.length} Modelle verfügbar · empfohlen: <b>${esc(pickModel(models))}</b>`;
    } catch (err) {
      if (!silent) modelHint.textContent = err.message || 'Modellliste nicht abrufbar.';
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = label;
    }
  }

  loadBtn.addEventListener('click', () => loadModels({ force: true }));

  // Beim Öffnen direkt laden, wenn ein Key (oder Proxy) vorhanden ist.
  if (keyInput.value.trim() || proxyStatus()) loadModels({ silent: true });

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const model = currentModel();
    if (!model) {
      toast('Bitte ein Modell auswählen oder eintippen', 'err');
      manualInput.focus();
      return;
    }
    store.saveSettings({ apiKey: keyInput.value.trim(), model });
    toast(`Gespeichert · ${model}`);
    sheet.close();
    renderProfile(root);
  });
}

async function testAi(btn) {
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="grow"><span class="t">Teste…</span><span class="s">Anfrage an Gemini</span></span><span class="spinner" style="color:var(--accent)"></span>`;
  try {
    await detectProxy();
    const res = await estimate({ text: 'Ein mittelgroßer Apfel', settings: store.get().settings, mealHint: 'Snack' });
    if (res.demo) {
      toast('Demo-Modus – kein Key hinterlegt', 'err');
    } else {
      const kcal = res.items.reduce((a, i) => a + Math.round((i.per100.kcal * i.grams) / 100), 0);
      toast(`KI antwortet: ${res.items[0]?.name || 'OK'} · ${kcal} kcal`);
    }
  } catch (err) {
    toast(err.message, 'err', 4200);
  } finally {
    btn.innerHTML = original;
  }
}

/* ---------------- Sprache ---------------- */

function openLanguage(root) {
  const body = document.createElement('div');
  const item = (id, label, sub) => `
    <button class="row" data-l="${id}">
      <span class="grow"><span class="t">${label}</span><span class="s">${sub}</span></span>
      ${getLang() === id ? icon('check') : ''}
    </button>`;

  body.innerHTML = `
    <p class="small muted" style="margin-top:0">
      Die Auswahl gilt sofort für die ganze App. Deine Daten bleiben unverändert.
    </p>
    <div class="card flush">
      ${item('de', 'Deutsch', 'Deutsch')}
      ${item('en', 'English', 'English')}
    </div>
  `;

  const sheet = openSheet({ title: 'Sprache', subtitle: 'Language', body });

  body.querySelectorAll('[data-l]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.l;
      if (next === getLang()) { sheet.close(); return; }
      store.saveSettings({ lang: next });
      setLang(next);
      sheet.close();
      window.dispatchEvent(new CustomEvent('kaloriq:language'));
      toast(next === 'en' ? 'Language set to English' : 'Sprache auf Deutsch gestellt');
      renderProfile(root);
    });
  });
}

/* ---------------- Sicherungen ---------------- */

function openBackups(root) {
  const list = listBackups();
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-top:0">
      Die App legt automatisch alle 12 Stunden eine Sicherung an (max. 3 Stände).
      Vor „Importieren“ und „Zurücksetzen“ wird zusätzlich der aktuelle Stand gesichert.
      Ein App-Update löscht keine Daten.
    </p>
    ${list.length
      ? `<div class="card flush">${list.map((b) => `
          <button class="row" data-restore="${b.at}">
            <span class="grow">
              <span class="t">${new Date(b.at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' })}</span>
              <span class="s">${b.dayCount} ${b.dayCount === 1 ? 'Tag' : 'Tage'} mit Einträgen · ${Math.max(1, Math.round(b.size / 1024))} KB</span>
            </span>
            ${icon('refresh', 'chev')}
          </button>`).join('')}</div>`
      : '<p class="small muted">Noch keine Sicherung vorhanden.</p>'}
  `;

  const sheet = openSheet({
    title: 'Sicherungen',
    body,
    footer: '<button class="btn btn-block" data-now>Jetzt sichern</button>',
  });

  body.querySelectorAll('[data-restore]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const at = Number(btn.dataset.restore);
      const when = new Date(at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });
      const ok = await confirmDialog({
        title: 'Sicherung wiederherstellen?',
        message: `Der Stand vom ${when} ersetzt die aktuellen Daten. Der jetzige Stand wird vorher gesichert.`,
        confirmLabel: 'Wiederherstellen',
        danger: true,
      });
      if (!ok) return;
      try {
        restoreBackup(at);
        sheet.close();
        toast('Sicherung wiederhergestellt');
        renderProfile(root);
      } catch (err) {
        toast(err.message || 'Wiederherstellen fehlgeschlagen', 'err');
      }
    });
  });

  sheet.foot?.querySelector('[data-now]')?.addEventListener('click', () => {
    backupNow();
    toast('Sicherung angelegt');
    sheet.close();
    openBackups(root);
  });
}

/* ---------------- Import / Reset / Install ---------------- */

function openImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || !data.profile) throw new Error('Keine gültige Kaloriq-Datei.');
      const ok = await confirmDialog({
        title: 'Backup einspielen?',
        message: 'Die aktuellen Daten auf diesem Gerät werden überschrieben.',
        confirmLabel: 'Importieren',
        danger: true,
      });
      if (!ok) return;
      importJson(text);
      toast('Backup importiert');
    } catch (err) {
      toast(err.message || 'Import fehlgeschlagen', 'err');
    }
  });
  input.click();
}

async function resetAll() {
  const ok = await confirmDialog({
    title: 'Alles zurücksetzen?',
    message: 'Alle Einträge, Gewichte und Einstellungen auf diesem Gerät werden gelöscht. Der aktuelle Stand wird dabei automatisch gesichert und kann unter „Sicherungen“ zurückgeholt werden.',
    confirmLabel: 'Endgültig löschen',
    danger: true,
  });
  if (!ok) return;
  store.reset();
  toast('Zurückgesetzt');
}

async function installApp() {
  const prompt = window.__installPrompt;
  if (prompt) {
    prompt.prompt();
    try {
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') toast('Kaloriq wird installiert…');
    } catch { /* ignorieren */ }
    window.__installPrompt = null;
    return;
  }

  if (matchMedia('(display-mode: standalone)').matches) {
    toast('Kaloriq läuft bereits als installierte App');
    return;
  }

  const insecure = !window.isSecureContext;

  openSheet({
    title: 'App installieren',
    body: `
      <div class="vstack" style="gap:14px">
        ${insecure ? `
          <div class="ai-note" style="margin:0">
            <span>⚠️</span>
            <span>
              Diese Seite läuft über <b>http://</b> – Chrome erlaubt die Installation dann nicht,
              der Menüpunkt „App installieren" fehlt deshalb.<br><br>
              <b>Lösung:</b> App über eine <b>https://</b>-Adresse öffnen. Am PC im Projektordner:<br>
              <code style="display:block;margin-top:6px;padding:8px 10px;border-radius:8px;background:var(--bg-2);font-size:11.5px">cloudflared tunnel --url http://localhost:4173</code>
              Die ausgegebene <b>https://…trycloudflare.com</b>-Adresse am Handy öffnen und dort installieren.
            </span>
          </div>` : ''}

        <div class="card" style="padding:14px">
          <b style="font-size:14px">Android (Chrome)</b>
          <p class="small muted" style="margin-top:6px">Menü ⋮ oben rechts → „App installieren" bzw. „Zum Startbildschirm hinzufügen".</p>
        </div>
        <div class="card" style="padding:14px">
          <b style="font-size:14px">iPhone (Safari)</b>
          <p class="small muted" style="margin-top:6px">Teilen-Symbol → „Zum Home-Bildschirm".</p>
        </div>
        <p class="tiny muted">Nach der Installation startet Kaloriq im Vollbild, mit eigenem Icon – und funktioniert offline.</p>
      </div>`,
  });
}
