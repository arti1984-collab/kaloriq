/* ============================================================
   Kaloriq – Bootstrap & Navigation
   ============================================================ */
import {
  store, hydrateFromDurable, requestPersistentStorage,
  listBackups, backupNow, exportJson, setWater, todayKey,
} from './store.js';
import { $, icon, setActiveTab, toast, toastAction, downloadFile } from './ui.js';
import { setLang, applyI18n, watchI18n } from './i18n.js';
import { resumeSteps } from './steps.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderDiary } from './views/diary.js';
import { renderProgress } from './views/progress.js';
import { renderFasting } from './views/fasting.js';
import { renderProfile } from './views/profile.js';
import { renderRecipes } from './views/recipes.js';
import { renderMealPlan } from './views/mealplan.js';
import { openAiSheet, openQuickLogSheet, openAddSheet } from './views/add.js';
import { initWidget } from './widget.js';
import { initReminders } from './reminders.js';
import { initUpdateNotice, applyUpdate } from './update.js';

const TABS = [
  { id: 'diary', label: 'Tagebuch', icon: 'book' },
  { id: 'progress', label: 'Fortschritt', icon: 'chart' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'fasting', label: 'Fasten', icon: 'timer' },
  { id: 'profile', label: 'Profil', icon: 'user' },
];

const VIEWS = {
  diary: renderDiary,
  progress: renderProgress,
  fasting: renderFasting,
  profile: renderProfile,
  recipes: renderRecipes,
  plan: renderMealPlan,
};

let currentTab = 'diary';
let scheduled = false;

function paintTabbar() {
  const bar = $('#tabbar');
  const makeTab = (t) => `
    <button class="tab" type="button" data-tab="${t.id}" aria-label="${t.label}">
      ${icon(t.icon)}<span>${t.label}</span>
    </button>`;
  bar.innerHTML = TABS.map(makeTab).join('');
  bar.querySelectorAll('.tab[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });
  applyI18n(bar);
}

export function navigate(tab) {
  if (!VIEWS[tab]) tab = 'diary';
  currentTab = tab;
  if (location.hash !== `#/${tab}`) history.replaceState(null, '', `#/${tab}`);
  render();
  window.scrollTo(0, 0);
}

function render() {
  const view = $('#view');
  const app = $('#app');
  const state = store.get();

  if (!state.onboarded) {
    app.dataset.onboarded = 'false';
    $('#tabbar').style.display = 'none';
    $('#fab').style.display = 'none';
    renderOnboarding(view);
    applyI18n(view);
    return;
  }

  app.dataset.onboarded = 'true';
  $('#tabbar').style.display = '';
  $('#fab').style.display = '';
  setActiveTab(currentTab);
  VIEWS[currentTab](view);
  applyI18n(view);
}

/** Mehrfach-Renders in einem Tick zusammenfassen. */
function scheduleRender() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    render();
  });
}

/** Einmal pro Tag an eine ältere Sicherung erinnern – ohne Druck. */
function maybeBackupReminder() {
  const state = store.get();
  if (!state.onboarded) return;
  const hasEntries = Object.values(state.days || {}).some((d) => d?.entries?.length);
  if (!hasEntries) return;
  const last = listBackups()[0]?.at || 0;
  if (last && Date.now() - last < 14 * 86400000) return;
  const day = todayKey();
  if (state.settings.backupRemindedAt === day) return;
  store.saveSettings({ backupRemindedAt: day });
  toastAction('Letzte Sicherung ist älter als 14 Tage', 'Jetzt sichern', () => {
    backupNow();
    toast('Sicherung angelegt');
  }, 6500);
}

/** Letzter Ausweg bei einem Startfehler: Daten sichern statt leerer Seite. */
function showFatalError(err) {
  if (document.getElementById('fatal-error')) return;
  const wrap = document.createElement('div');
  wrap.id = 'fatal-error';
  wrap.className = 'fatal-error';
  wrap.innerHTML = `
    <div class="card">
      <h2>Etwas ist schiefgelaufen</h2>
      <p>Die App konnte nicht vollständig starten. Deine gespeicherten Daten bleiben auf dem Gerät. Lade die Seite neu oder sichere sie vorher als JSON.</p>
      <code></code>
      <div class="vstack" style="margin-top:14px">
        <button class="btn btn-primary btn-block" data-reload>Neu laden</button>
        <button class="btn btn-block" data-export>Daten als JSON sichern</button>
      </div>
    </div>`;
  wrap.querySelector('code').textContent = String(err?.message || err || 'Unbekannter Fehler').slice(0, 300);
  wrap.querySelector('[data-reload]')?.addEventListener('click', () => location.reload());
  wrap.querySelector('[data-export]')?.addEventListener('click', () => {
    downloadFile(`kaloriq-notfall-${todayKey()}.json`, exportJson());
  });
  document.body.appendChild(wrap);
}

/** PWA-Shortcuts und ?action=… auswerten. */
function handleActionParam() {
  const params = new URLSearchParams(location.search);
  const action = params.get('action');
  if (!action || !store.get().onboarded) return;
  const meal = params.get('meal') || 'breakfast';
  const clean = () => history.replaceState(null, '', location.pathname + location.hash);
  if (action === 'ai') {
    setTimeout(() => openAiSheet(), 260);
    clean();
  } else if (action === 'quick') {
    setTimeout(() => openQuickLogSheet({ meal }), 260);
    clean();
  } else if (action === 'search') {
    setTimeout(() => openAddSheet({ meal }), 260);
    clean();
  } else if (action === 'water') {
    const today = todayKey();
    const current = store.get().days[today]?.water || 0;
    setWater(today, current + 250);
    toast('250 ml Wasser hinzugefügt');
    clean();
  }
}

/** Nach einem Update-Reload die Cache-Umgehung (?v=…) wieder aus der Adresse nehmen. */
function cleanUpdateParam() {
  const params = new URLSearchParams(location.search);
  if (!params.has('v')) return;
  params.delete('v');
  const query = params.toString();
  history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
}

async function boot() {
  cleanUpdateParam();
  // Zuerst die IndexedDB-Zweitkopie prüfen, den Start aber nicht blockieren.
  const hydration = hydrateFromDurable().catch(() => false);
  await Promise.race([
    hydration,
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]);

  setLang(store.get().settings.lang || 'de');
  paintTabbar();
  watchI18n();

  const hash = location.hash.replace('#/', '');
  if (VIEWS[hash]) currentTab = hash;

  // Sprachwechsel aus dem Profil: Tabbar + aktuelle Ansicht neu übersetzen.
  window.addEventListener('kaloriq:language', () => {
    paintTabbar();
    render();
  });

  // Update-Prüfung meldet ein Ergebnis: Profilzeile „App-Update“ auffrischen.
  window.addEventListener('kaloriq:update', () => render());

  $('#fab').addEventListener('click', () => openAiSheet());

  store.subscribe((state, reason) => {
    if (reason === 'hydrate') {
      setLang(state.settings.lang || 'de');
      paintTabbar();
    }
    if (reason === 'onboarding') requestPersistentStorage();
    // Schritte aktualisieren sich live über `kaloriq:steps` in der
    // Tagebuch-Ansicht. Ein vollständiger Re-Render bei jedem Sensor-Update
    // würde die Oberfläche nur unnötig alle paar hundert Millisekunden
    // neu aufbauen und die Anzeige träge wirken lassen.
    if (reason === 'steps') return;
    scheduleRender();
  });
  window.addEventListener('hashchange', () => {
    const next = location.hash.replace('#/', '');
    if (VIEWS[next] && next !== currentTab) {
      currentTab = next;
      render();
    }
  });

  render();
  resumeSteps();
  initWidget();
  initReminders();
  initUpdateNotice();

  // Persistenten Speicher anfordern (iOS ab 15.2) und bei Bedarf nach dem
  // ersten Tippen erneut versuchen, falls der Browser eine Geste verlangt.
  requestPersistentStorage();
  window.addEventListener('pointerdown', () => requestPersistentStorage(), { once: true, passive: true });

  // PWA-Shortcuts (?action=ai|quick|search|water) und Sicherungserinnerung
  handleActionParam();
  maybeBackupReminder();

  // Service Worker (nur über https/localhost – auf LAN-IP ohne TLS nicht verfügbar)
  // In der APK nicht nötig: die Dateien liegen bereits lokal in der App.
  const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
  if ('serviceWorker' in navigator && !isNativeApp) {
    let hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) { hadController = true; return; }
      toastAction('Neue Version verfügbar', 'Neu laden', () => { void applyUpdate(); }, 8000);
    });
    window.addEventListener('load', () => {
      // Relativ registrieren: funktioniert an der Domain-Wurzel und im
      // GitHub-Pages-Unterpfad (/kaloriq/).
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
    });
  }

  // iOS: Doppeltipp-Zoom verhindern (Safari ignoriert user-scalable teilweise)
  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__installPrompt = e;
  });

  window.addEventListener('appinstalled', () => {
    window.__installPrompt = null;
    toast('Kaloriq wurde installiert');
  });

  window.addEventListener('online', () => toast('Wieder online'));
  window.addEventListener('offline', () => toast('Offline – lokale Daten funktionieren weiter', 'err'));
}

window.addEventListener('error', (event) => {
  if (!event.error) return;
  console.error('Fehler:', event.error);
  toastAction('Etwas ist schiefgelaufen', 'Neu laden', () => location.reload(), 7000);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason?.name === 'AbortError') return;
  console.error('Unbehandelter Fehler:', reason);
  toastAction('Etwas ist schiefgelaufen', 'Neu laden', () => location.reload(), 7000);
});

boot().catch((err) => {
  console.error('Start fehlgeschlagen:', err);
  showFatalError(err);
});
