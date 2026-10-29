/* ============================================================
   Kaloriq – Profil & Einstellungen
   ============================================================ */
import { store, exportJson, importJson, todayKey, streak, streakInfo, listBackups, backupNow, restoreBackup, activePause, applyTrackingStyle, setSteps, setWeight } from '../store.js';
import { ACTIVITY, GOALS, MACRO_PRESETS, computeTargets, projection, round1, bmi, bmiCategory, flexStatus } from '../calc.js';
import {
  esc, fmt, icon, toast, openSheet, confirmDialog, downloadFile, haptic, copyText,
} from '../ui.js';
import { estimate } from '../ai.js';
import { FREE_MODELS, DEFAULT_MODEL, normalizeModel } from '../models.js';
import { APP_VERSION } from '../version.js';
import { getLang, setLang, locale, tr } from '../i18n.js';
import { applyTheme, normalizeTheme } from '../theme.js';
import { openPauseSheet, pauseStateLabel } from '../pause.js';
import { exportEntriesCsv, exportDaysCsv } from '../csv.js';
import { healthBridgePresent, healthStatus, requestHealthPermissions, readHealthToday, openHealthSettings } from '../health.js';
import { scheduleSystemReminder, systemRemindersAvailable } from '../reminders.js';
import { getUpdateState, checkForUpdate, openUpdateSheet } from '../update.js';

export function renderProfile(root) {
  const state = store.get();
  const p = state.profile;
  const t = state.targets;
  const proj = projection(p);
  const aiConfigured = Boolean(state.settings.apiKey);
  const gentle = Boolean(state.settings.gentleMode);
  const pause = activePause();
  const paused = Boolean(pause);
  const minimal = Boolean(state.settings.minimalMode);
  const hungerCheck = state.settings.hungerCheck !== false;
  const winsOn = state.settings.nonScaleWins !== false;
  const trackingStyle = state.settings.trackingStyle || 'precise';
  const reminderOn = Boolean(state.settings.reminderEnabled);
  const reminderTime = state.settings.reminderTime || '18:00';
  const healthOn = healthBridgePresent();
  const healthState = healthOn ? healthStatus() : null;
  const healthSub = !healthOn
    ? ''
    : healthState?.sdk === 'available'
      ? (healthState.steps || healthState.weight)
        ? 'Schritte und Gewicht aus Android Health importieren'
        : 'Verbinden, um Schritte und Gewicht zu importieren'
      : healthState?.sdk === 'update_required'
        ? 'App aktualisieren, um Daten zu lesen'
        : 'Zum Import aus Android Health installieren';
  const systemReminder = systemRemindersAvailable();
  const styleText = trackingStyle === 'rough'
    ? 'Grob · Handportionen und Schnell-Eintrag'
    : trackingStyle === 'overview'
      ? 'Überblick · ohne Zahlen, Fokus auf Erfolge'
      : 'Genau · Gramm, Makros und Ziele';
  const flexBand = Math.max(0, Number(state.settings.flexBand) || 0);
  const flexOn = flexBand > 0;
  const flexRange = flexStatus(t.kcal, t.kcal, flexBand);
  const grace = streakInfo();
  const graceUsedMonth = Math.min(grace.graceUsedThisMonth, grace.limit);
  const backups = listBackups();
  const lastBackup = backups[0]?.at;
  const backupSub = backups.length
    ? `Letzte: ${new Date(lastBackup).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })} · ${backups.length} ${backups.length === 1 ? 'Stand' : 'Stände'}`
    : 'Automatisch alle 12 Std. – noch keine vorhanden';
  const updateState = getUpdateState();
  const updateSub = updateState.available
    ? `Version ${APP_VERSION} · ${updateState.latest} verfügbar`
    : `Version ${APP_VERSION} · aktuell`;

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
      <button class="row" data-style>
        <span class="grow">
          <span class="t">Trackingsstil</span>
          <span class="s">${styleText}</span>
        </span>
        <span class="v">${trackingStyle === 'rough' ? 'Grob' : trackingStyle === 'overview' ? 'Überblick' : 'Genau'}</span>
        ${icon('chev', 'chev')}
      </button>
      ${healthOn ? `<button class="row" data-health>
        <span class="grow">
          <span class="t">Health Connect</span>
          <span class="s">${healthSub}</span>
        </span>
        ${healthState?.sdk === 'available' && !(healthState.steps || healthState.weight)
          ? '<span class="pill neutral">verbinden</span>'
          : icon('chev', 'chev')}
      </button>` : ''}
      <button class="row" data-gentle role="switch" aria-checked="${gentle}" aria-label="Sanfter Modus">
        <span class="grow">
          <span class="t">Sanfter Modus</span>
          <span class="s">${gentle ? 'Aktiv · Wochenrahmen statt Tagesdruck' : 'Anti-Burnout: keine roten Zahlen, Pausen erlaubt'}</span>
        </span>
        <span class="switch" aria-hidden="true" aria-checked="${gentle}" style="pointer-events:none"></span>
      </button>
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
      <button class="row" data-pause>
        <span class="grow">
          <span class="t">Pausenmodus</span>
          <span class="s">${pause ? `<span>Aktiv</span> · <span>${pauseStateLabel(pause)}</span>` : 'Nur heute drüber oder ein paar Tage ohne Druck'}</span>
        </span>
        <span class="v">${pause ? 'Pause' : ''}</span>
        ${icon('pause', 'chev')}
      </button>
      <button class="row" data-hunger role="switch" aria-checked="${hungerCheck}" aria-label="Hunger &amp; Sättigung">
        <span class="grow">
          <span class="t">Hunger &amp; Sättigung</span>
          <span class="s">${hungerCheck ? 'Aktiv · optionaler Check-in pro Mahlzeit' : 'Aus · keine Check-ins in den Mahlzeiten'}</span>
        </span>
        <span class="switch" aria-hidden="true" aria-checked="${hungerCheck}" style="pointer-events:none"></span>
      </button>
      <button class="row" data-wins-toggle role="switch" aria-checked="${winsOn}" aria-label="Kleine Erfolge">
        <span class="grow">
          <span class="t">Kleine Erfolge</span>
          <span class="s">${winsOn ? 'Aktiv · Nicht-Zahl-Erfolge im Tagebuch' : 'Aus · keine Erfolgs-Karte im Tagebuch'}</span>
        </span>
        <span class="switch" aria-hidden="true" aria-checked="${winsOn}" style="pointer-events:none"></span>
      </button>
      <button class="row" data-reminder>
        <span class="grow">
          <span class="t">Sanfte Erinnerung</span>
          <span class="s">${reminderOn
            ? systemReminder
              ? `System-Erinnerung ab ${reminderTime}`
              : `Beim Öffnen ab ${reminderTime} · kein Push`
            : 'Aus · keine Erinnerungen'}</span>
        </span>
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
      <button class="row" data-update>
        <span class="grow"><span class="t">App-Update</span><span class="s">${updateSub}</span></span>
        ${updateState.available ? '<span class="pill">Neu</span>' : icon('refresh', 'chev')}
      </button>
      <button class="row" data-theme>
        <span class="grow"><span class="t">Darstellung</span><span class="s">${themeLabel(state.settings.theme)}</span></span>
        ${icon(normalizeTheme(state.settings.theme) === 'dark' ? 'moon' : normalizeTheme(state.settings.theme) === 'light' ? 'sun' : 'contrast', 'chev')}
      </button>
      <button class="row" data-lang>
        <span class="grow"><span class="t">Sprache</span><span class="s">${getLang() === 'en' ? 'English' : 'Deutsch'}</span></span>
        ${icon('chev', 'chev')}
      </button>
      <button class="row" data-feedback>
        <span class="grow"><span class="t">Feedback &amp; Hilfe</span><span class="s">Problem melden oder Idee vorschlagen</span></span>
        ${icon('info', 'chev')}
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
      <button class="row" data-plan>
        <span class="grow">
          <span class="t">Wochenplan &amp; Einkauf</span>
          <span class="s">Rezepte auf Tage legen, Zutaten bündeln</span>
        </span>
        ${icon('calendar', 'chev')}
      </button>
      <button class="row" data-export>
        <span class="grow"><span class="t">Daten exportieren</span><span class="s">JSON-Backup</span></span>
        ${icon('download', 'chev')}
      </button>
      <button class="row" data-csv>
        <span class="grow"><span class="t">CSV exportieren</span><span class="s">Für Excel, Numbers oder Sheets</span></span>
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
    store.saveSettings({ gentleMode: next });
    toast(next ? 'Sanfter Modus aktiviert' : 'Sanfter Modus deaktiviert');
    haptic();
  });
  root.querySelector('[data-style]').addEventListener('click', () => openTrackingStyleSheet(root));
  root.querySelector('[data-health]')?.addEventListener('click', () => openHealthSheet(root));
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
  root.querySelector('[data-pause]').addEventListener('click', () => openPauseSheet());
  root.querySelector('[data-hunger]').addEventListener('click', () => {
    const next = store.get().settings.hungerCheck === false;
    store.saveSettings({ hungerCheck: next });
    toast(next ? 'Hunger-Check aktiviert' : 'Hunger-Check deaktiviert');
    haptic();
  });
  root.querySelector('[data-wins-toggle]').addEventListener('click', () => {
    const next = store.get().settings.nonScaleWins === false;
    store.saveSettings({ nonScaleWins: next });
    toast(next ? 'Kleine Erfolge aktiviert' : 'Kleine Erfolge deaktiviert');
    haptic();
  });
  root.querySelector('[data-reminder]').addEventListener('click', () => openReminderSheet(root));
  root.querySelector('[data-ai]').addEventListener('click', () => openAiSettings(root));
  root.querySelector('[data-aitest]').addEventListener('click', (e) => testAi(e.currentTarget));
  root.querySelector('[data-recipes]').addEventListener('click', () => {
    location.hash = '#/recipes';
  });
  root.querySelector('[data-plan]').addEventListener('click', () => {
    location.hash = '#/plan';
  });
  root.querySelector('[data-export]').addEventListener('click', () => {
    downloadFile(`kaloriq-backup-${todayKey()}.json`, exportJson());
    toast('Backup gespeichert');
  });
  root.querySelector('[data-csv]').addEventListener('click', openCsvSheet);
  root.querySelector('[data-import]').addEventListener('click', openImport);
  root.querySelector('[data-backups]').addEventListener('click', () => openBackups(root));
  root.querySelector('[data-reset]').addEventListener('click', resetAll);
  root.querySelector('[data-install]').addEventListener('click', installApp);
  root.querySelector('[data-update]').addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    if (getUpdateState().available) {
      openUpdateSheet();
      return;
    }
    btn.disabled = true;
    try {
      const info = await checkForUpdate({ manual: true });
      if (info && getUpdateState().available) {
        openUpdateSheet(info);
        renderProfile(root);
      }
    } finally {
      btn.disabled = false;
    }
  });
  root.querySelector('[data-lang]').addEventListener('click', () => openLanguage(root));
  root.querySelector('[data-theme]')?.addEventListener('click', () => openTheme(root));
  root.querySelector('[data-feedback]').addEventListener('click', openFeedbackSheet);
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

/* ---------------- Health Connect ---------------- */

function openHealthSheet(root) {
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">Health Connect liest heute Schritte und das zuletzt eingetragene Gewicht aus Android Health. Kaloriq schreibt keine Daten zurück.</p>

    <div class="card" style="padding:14px;margin-bottom:14px">
      <div class="hstack" style="justify-content:space-between">
        <span class="small" style="font-weight:620">Health Connect</span>
        <span class="pill neutral" data-health-status>–</span>
      </div>
      <div class="hstack" style="justify-content:space-between;margin-top:10px">
        <span class="small">Schritte lesen</span>
        <span class="pill neutral" data-health-steps>–</span>
      </div>
      <div class="hstack" style="justify-content:space-between;margin-top:6px">
        <span class="small">Gewicht lesen</span>
        <span class="pill neutral" data-health-weight>–</span>
      </div>
      <p class="tiny muted" data-health-detail style="margin-top:8px"></p>
    </div>

    <div class="vstack">
      <button class="btn btn-block" data-health-open>Health Connect öffnen</button>
      <button class="btn btn-block" data-health-permission>Berechtigung erteilen</button>
      <button class="btn btn-primary btn-block" data-health-import>Daten importieren</button>
    </div>

    <p class="tiny muted" style="margin-top:14px">
      Health Connect enthält nur Daten, die andere Apps (z. B. Google Fit oder Samsung Health)
      dorthin schreiben. Der Schrittzähler von Kaloriq zählt unabhängig davon direkt am Gerät.
    </p>
    <p class="tiny muted" style="margin-top:10px">Apple Health ist in der Android-App und in der PWA technisch nicht erreichbar. Dafür wäre eine native iOS-App mit HealthKit nötig.</p>`;

  let repaintTimer = 0;
  const sheet = openSheet({
    title: 'Health Connect',
    subtitle: 'Android Health',
    body,
    onClose: () => clearInterval(repaintTimer),
  });

  const statusEl = body.querySelector('[data-health-status]');
  const stepsEl = body.querySelector('[data-health-steps]');
  const weightEl = body.querySelector('[data-health-weight]');
  const detailEl = body.querySelector('[data-health-detail]');
  const permBtn = body.querySelector('[data-health-permission]');
  const importBtn = body.querySelector('[data-health-import]');
  const openBtn = body.querySelector('[data-health-open]');

  const paint = () => {
    const s = healthStatus();
    const labels = {
      available: 'verfügbar',
      update_required: 'Update nötig',
      unavailable: 'nicht installiert',
      error: 'Status unklar',
    };
    statusEl.textContent = tr(labels[s.sdk] || 'unbekannt');
    statusEl.className = `pill ${s.sdk === 'available' ? '' : 'warn'}`;

    const mark = (el, ok) => {
      el.textContent = ok ? tr('erteilt') : tr('fehlt');
      el.className = `pill ${ok ? '' : 'neutral'}`;
    };
    mark(stepsEl, s.steps);
    mark(weightEl, s.weight);

    const anyPermission = s.steps || s.weight;
    permBtn.textContent = tr(s.steps || s.weight ? 'Berechtigungen prüfen' : 'Berechtigungen erteilen');
    permBtn.disabled = s.sdk !== 'available';
    importBtn.disabled = s.sdk !== 'available' || !anyPermission;
    openBtn.textContent = s.sdk === 'available' ? tr('Health Connect öffnen') : tr('Health Connect installieren');

    detailEl.textContent = s.error
      ? `Details: ${s.error}`
      : s.sdk === 'update_required'
        ? tr('Bitte die Health-Connect-App im Play Store aktualisieren.')
        : s.sdk === 'unavailable'
          ? tr('Bitte Health Connect aus dem Play Store installieren (Android 13 und älter).')
          : anyPermission
            ? tr('Berechtigungen können jederzeit in Health Connect widerrufen werden.')
            : tr('Noch keine Berechtigung erteilt.');
  };

  paint();
  repaintTimer = setInterval(paint, 2500);

  permBtn?.addEventListener('click', async () => {
    try {
      const result = await requestHealthPermissions();
      if (result.granted) toast('Health Connect verbunden');
      else if (result.steps || result.weight) toast('Teilweise verbunden – Import ist möglich');
      else toast('Berechtigung nicht erteilt', 'err');
      paint();
      renderProfile(root);
    } catch (err) {
      toast(err.message || 'Berechtigung fehlgeschlagen', 'err');
    }
  });

  openBtn?.addEventListener('click', () => openHealthSettings());

  importBtn?.addEventListener('click', async () => {
    try {
      const data = await readHealthToday();
      const steps = Math.max(0, Math.round(Number(data.steps) || 0));
      const weight = Number(data.weight);
      const hasWeight = Number.isFinite(weight) && weight > 0;

      if (!steps && !hasWeight) {
        const suffix = data.errors.length ? ` (${data.errors[0]})` : '';
        toast('Keine Health-Connect-Daten gefunden – dort schreiben nur andere Apps hinein', 'err');
        detailEl.textContent = tr('Keine Werte gefunden. Prüfe, ob eine App wie Google Fit oder Samsung Health Daten an Health Connect schreibt.') + suffix;
        return;
      }

      const parts = [];
      if (steps) parts.push(`${fmt(steps)} ${tr('Schritte')}`);
      if (hasWeight) parts.push(`${fmt(weight, 1)} kg ${tr('Gewicht')}`);
      const ok = await confirmDialog({
        title: 'Health Connect importieren?',
        message: `${parts.join(' und ')} werden in Kaloriq übernommen. Vorhandene Tageswerte werden überschrieben.`,
        confirmLabel: 'Importieren',
      });
      if (!ok) return;
      if (steps) setSteps(todayKey(), steps);
      if (hasWeight) setWeight(todayKey(), weight);
      sheet.close();
      toast('Health-Connect-Daten importiert');
      renderProfile(root);
    } catch (err) {
      toast(err.message || 'Import fehlgeschlagen', 'err');
    }
  });
}

/* ---------------- Sanfte Erinnerung ---------------- */

function openReminderSheet(root) {
  const s = store.get().settings;
  const system = systemRemindersAvailable();
  let enabled = Boolean(s.reminderEnabled);
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">${system
      ? 'Erscheint als System-Benachrichtigung – auch bei geschlossener App. Standardmäßig aus.'
      : 'Eine ruhige Erinnerung beim nächsten Öffnen – nicht per Push, nicht als Drohung. Standardmäßig aus.'}</p>
    <button class="row" data-reminder-toggle role="switch" aria-checked="${enabled}" aria-label="Erinnerung aktivieren">
      <span class="grow"><span class="t">Erinnerung aktivieren</span><span class="s">${enabled ? 'Aktiv' : 'Aus'}</span></span>
      <span class="switch" aria-hidden="true" aria-checked="${enabled}" style="pointer-events:none"></span>
    </button>
    <div class="field" style="margin-top:14px">
      <label for="reminder-time">Uhrzeit</label>
      <input class="input" id="reminder-time" type="time" value="${esc(s.reminderTime || '18:00')}">
      <span class="hint">Erscheint nur, wenn du an dem Tag noch nichts eingetragen hast.</span>
    </div>`;
  const sheet = openSheet({
    title: 'Sanfte Erinnerung',
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Speichern</button>',
  });

  const toggle = body.querySelector('[data-reminder-toggle]');
  const paint = () => {
    toggle.setAttribute('aria-checked', String(enabled));
    toggle.querySelector('.switch')?.setAttribute('aria-checked', String(enabled));
    toggle.querySelector('.s').textContent = enabled ? 'Aktiv' : 'Aus';
  };
  toggle.addEventListener('click', () => { enabled = !enabled; paint(); haptic(); });

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const time = body.querySelector('#reminder-time').value || '18:00';
    store.saveSettings({ reminderEnabled: enabled, reminderTime: time });
    scheduleSystemReminder(enabled, time);
    toast(enabled ? `Erinnerung ab ${time}` : 'Erinnerung deaktiviert');
    sheet.close();
    renderProfile(root);
  });
}

/* ---------------- Trackingsstil ---------------- */

function openTrackingStyleSheet(root) {
  const current = store.get().settings.trackingStyle || 'precise';
  const options = [
    { id: 'precise', icon: '🎯', label: 'Genau', sub: 'Gramm, Makros und Tagesziele – volle Kontrolle.' },
    { id: 'rough', icon: '✋', label: 'Grob', sub: 'Handportionen und Schnell-Eintrag – weniger Wiegen.' },
    { id: 'overview', icon: '🌿', label: 'Überblick', sub: 'Zahlen ausblenden, Fokus auf Erfolge, Wasser und Schritte.' },
  ];

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">Wähle, wie viel Genauigkeit sich für dich gerade richtig anfühlt. Du kannst den Stil jederzeit ändern – nichts wird gesperrt.</p>
    ${options.map((o) => `<button class="choice" data-style-choice="${o.id}" aria-pressed="${current === o.id}">
      <span class="ico">${o.icon}</span>
      <span class="grow"><span class="t">${o.label}</span><span class="s">${o.sub}</span></span>
      <span class="dot"></span>
    </button>`).join('')}
  `;

  const sheet = openSheet({
    title: 'Trackingsstil',
    body,
    footer: '<button class="btn btn-primary btn-block" data-save>Übernehmen</button>',
  });

  let choice = current;
  body.querySelectorAll('[data-style-choice]').forEach((b) => b.addEventListener('click', () => {
    choice = b.dataset.styleChoice;
    body.querySelectorAll('[data-style-choice]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    applyTrackingStyle(choice);
    toast(choice === 'rough' ? 'Trackingsstil: Grob' : choice === 'overview' ? 'Trackingsstil: Überblick' : 'Trackingsstil: Genau');
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
  const model = normalizeModel(s.model);
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-top:0">
      Jeder nutzt seinen eigenen Key – es gibt keinen geteilten Server-Key.
      Der Key bleibt auf diesem Gerät und geht nur an Google.
    </p>

    <div class="field">
      <label for="ai-key">Gemini API-Key</label>
      <input class="input" id="ai-key" type="password" autocomplete="off" spellcheck="false"
        placeholder="AIza…" value="${esc(s.apiKey || '')}">
      <span class="hint">Kostenlos unter aistudio.google.com/apikey erstellen.</span>
    </div>

    <div class="field">
      <label for="ai-model">Modell</label>
      <select class="select" id="ai-model">
        ${FREE_MODELS.map((m) => `
          <option value="${esc(m.id)}"${m.id === model ? ' selected' : ''}>${esc(m.label)}</option>
        `).join('')}
      </select>
      <span class="hint">Nur Modelle mit kostenlosem Free-Tier. Bezahlte Modelle sind bewusst nicht wählbar.</span>
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
    subtitle: 'Google Gemini · Free-Tier',
    body,
    footer: `
      <button class="btn" data-del>Key löschen</button>
      <button class="btn btn-primary grow" data-save>Speichern</button>
    `,
    tall: true,
  });

  const keyInput = body.querySelector('#ai-key');
  const modelSelect = body.querySelector('#ai-model');
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

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    const selected = normalizeModel(modelSelect.value || DEFAULT_MODEL);
    store.saveSettings({ apiKey: keyInput.value.trim(), model: selected });
    toast(keyInput.value.trim() ? `Gespeichert · ${selected}` : 'Demo-Modus ohne Key');
    sheet.close();
    renderProfile(root);
  });
}

async function testAi(btn) {
  const original = btn.innerHTML;
  btn.innerHTML = `<span class="grow"><span class="t">Teste…</span><span class="s">Anfrage an Gemini</span></span><span class="spinner" style="color:var(--accent)"></span>`;
  try {
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

/* ---------------- Darstellung ---------------- */

function themeLabel(pref) {
  const value = normalizeTheme(pref);
  if (value === 'light') return 'Hell · immer helle Oberfläche';
  if (value === 'dark') return 'Dunkel · immer dunkle Oberfläche';
  return 'Automatisch · wie dein Gerät';
}

function openTheme(root) {
  const current = normalizeTheme(store.get().settings.theme);
  const item = (id, name, sub, iconName) => `
    <button class="row" data-t="${id}">
      <span class="grow"><span class="t">${name}</span><span class="s">${sub}</span></span>
      ${current === id ? icon('check') : icon(iconName, 'chev')}
    </button>`;

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-top:0">
      Gilt sofort für die ganze App – auch für Sheets und Diagramme.
      „Automatisch“ folgt der hell/dunkel-Einstellung deines Geräts.
    </p>
    <div class="card flush rows">
      ${item('auto', 'Automatisch', 'Wie dein Gerät', 'contrast')}
      ${item('light', 'Hell', 'Immer helle Oberfläche', 'sun')}
      ${item('dark', 'Dunkel', 'Immer dunkle Oberfläche, abends angenehmer', 'moon')}
    </div>`;

  const sheet = openSheet({ title: 'Darstellung', body });

  body.querySelectorAll('[data-t]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = normalizeTheme(btn.dataset.t);
      if (next === current) { sheet.close(); return; }
      store.saveSettings({ theme: next });
      applyTheme(next);
      sheet.close();
      haptic();
      toast(next === 'auto' ? 'Darstellung: automatisch' : next === 'dark' ? 'Dunkle Darstellung' : 'Helle Darstellung');
      renderProfile(root);
    });
  });
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

/* ---------------- CSV ---------------- */

function openCsvSheet() {
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">CSV-Dateien lassen sich in Excel, Numbers oder Google Sheets öffnen. Beide Exporte enthalten nur deine lokalen Daten.</p>
    <div class="vstack">
      <button class="row" data-csv-entries>
        <span class="grow"><span class="t">Einträge</span><span class="s">Datum, Mahlzeit, Lebensmittel, Menge und Nährwerte</span></span>
        ${icon('download', 'chev')}
      </button>
      <button class="row" data-csv-days>
        <span class="grow"><span class="t">Tageswerte</span><span class="s">Kalorien, Makros, Wasser, Schritte, Gewicht und Erfolge</span></span>
        ${icon('download', 'chev')}
      </button>
    </div>`;
  const sheet = openSheet({ title: 'CSV exportieren', body });
  body.querySelector('[data-csv-entries]')?.addEventListener('click', () => {
    const count = exportEntriesCsv();
    toast(`${count} ${count === 1 ? 'Eintrag' : 'Einträge'} exportiert`);
    sheet.close();
  });
  body.querySelector('[data-csv-days]')?.addEventListener('click', () => {
    const count = exportDaysCsv();
    toast(`${count} ${count === 1 ? 'Tag' : 'Tage'} exportiert`);
    sheet.close();
  });
}

/* ---------------- Feedback ---------------- */

function openFeedbackSheet() {
  const state = store.get();
  const days = Object.values(state.days || {}).filter((d) => d?.entries?.length).length;
  const diag = [
    `Kaloriq ${APP_VERSION}`,
    `Sprache: ${getLang()}`,
    `Gerät: ${navigator.userAgent}`,
    `Standalone: ${matchMedia('(display-mode: standalone)').matches ? 'ja' : 'nein'}`,
    `Tage mit Einträgen: ${days}`,
  ].join('\n');
  const issue = (title) => `https://github.com/arti1984-collab/kaloriq/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(`Bitte beschreibe dein Problem oder deine Idee:\n\n\n---\n${diag}`)}`;

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">Direkt, ehrlich, ohne Konto: Melde ein Problem oder schlage eine Verbesserung vor. Die technischen Angaben helfen beim Einordnen – persönliche Daten werden nicht übertragen.</p>
    <div class="vstack">
      <a class="btn btn-block" href="${issue('Problem: ')}" target="_blank" rel="noopener noreferrer">Problem melden</a>
      <a class="btn btn-block" href="${issue('Idee: ')}" target="_blank" rel="noopener noreferrer">Idee vorschlagen</a>
      <button class="btn btn-block btn-ghost" data-copy-diag>Diagnose kopieren</button>
    </div>
    <div class="card" style="padding:14px;margin-top:14px">
      <div class="tiny muted" style="white-space:pre-wrap">${esc(diag)}</div>
    </div>`;

  const sheet = openSheet({ title: 'Feedback & Hilfe', body, tall: true });

  body.querySelector('[data-copy-diag]')?.addEventListener('click', async () => {
    try {
      await copyText(diag);
      toast('Diagnose kopiert');
    } catch {
      toast('Kopieren nicht möglich', 'err');
    }
  });
  void sheet;
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
