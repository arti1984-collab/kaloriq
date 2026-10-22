/* ============================================================
   Kaloriq – Bootstrap & Navigation
   ============================================================ */
import { store, hydrateFromDurable, requestPersistentStorage } from './store.js';
import { $, icon, setActiveTab, toast } from './ui.js';
import { setLang, applyI18n, watchI18n } from './i18n.js';
import { detectProxy } from './ai.js';
import { resumeSteps } from './steps.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderDiary } from './views/diary.js';
import { renderProgress } from './views/progress.js';
import { renderFasting } from './views/fasting.js';
import { renderProfile } from './views/profile.js';
import { renderRecipes } from './views/recipes.js';
import { openAiSheet } from './views/add.js';

const TABS = [
  { id: 'diary', label: 'Tagebuch', icon: 'book' },
  { id: 'progress', label: 'Fortschritt', icon: 'chart' },
  { id: 'fasting', label: 'Fasten', icon: 'timer' },
  { id: 'profile', label: 'Profil', icon: 'user' },
];

const VIEWS = {
  diary: renderDiary,
  progress: renderProgress,
  fasting: renderFasting,
  profile: renderProfile,
  recipes: renderRecipes,
};

let currentTab = 'diary';
let scheduled = false;

function paintTabbar() {
  const bar = $('#tabbar');
  const makeTab = (t) => `
    <button class="tab" type="button" data-tab="${t.id}" aria-label="${t.label}">
      ${icon(t.icon)}<span>${t.label}</span>
    </button>`;
  bar.innerHTML = [makeTab(TABS[0]), makeTab(TABS[1]), '<span class="tab gap"></span>', makeTab(TABS[2]), makeTab(TABS[3])].join('');
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

async function boot() {
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

  $('#fab').addEventListener('click', () => openAiSheet());

  store.subscribe((state, reason) => {
    if (reason === 'hydrate') {
      setLang(state.settings.lang || 'de');
      paintTabbar();
    }
    if (reason === 'onboarding') requestPersistentStorage();
    scheduleRender();
  });
  window.addEventListener('hashchange', () => {
    const next = location.hash.replace('#/', '');
    if (VIEWS[next] && next !== currentTab) {
      currentTab = next;
      render();
    }
  });

  detectProxy();
  render();
  resumeSteps();

  // Persistenten Speicher anfordern (iOS ab 15.2) und bei Bedarf nach dem
  // ersten Tippen erneut versuchen, falls der Browser eine Geste verlangt.
  requestPersistentStorage();
  window.addEventListener('pointerdown', () => requestPersistentStorage(), { once: true, passive: true });

  // Android-Shortcut "KI-Tracking" (?action=ai)
  const params = new URLSearchParams(location.search);
  if (params.get('action') === 'ai' && store.get().onboarded) {
    setTimeout(() => openAiSheet(), 260);
    history.replaceState(null, '', location.pathname + location.hash);
  }

  // Service Worker (nur über https/localhost – auf LAN-IP ohne TLS nicht verfügbar)
  // In der APK nicht nötig: die Dateien liegen bereits lokal in der App.
  const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
  if ('serviceWorker' in navigator && !isNativeApp) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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

boot().catch((err) => {
  console.error('Start fehlgeschlagen:', err);
  render();
});
