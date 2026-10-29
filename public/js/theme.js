/* ============================================================
   Kaloriq – Darstellung
   Hell, Dunkel oder automatisch nach System. Die Einstellung liegt
   im Zustand (settings.theme); das eigentliche Umschalten passiert
   über data-theme am <html>, damit CSS ohne Neuladen reagiert.
   ============================================================ */

export const THEME_PREFS = ['auto', 'light', 'dark'];
export const THEME_COLORS = { light: '#f5f6f4', dark: '#0b100e' };

export function normalizeTheme(value) {
  return THEME_PREFS.includes(value) ? value : 'auto';
}

export function systemTheme() {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function resolveTheme(pref) {
  const wanted = normalizeTheme(pref);
  return wanted === 'auto' ? systemTheme() : wanted;
}

/** Setzt data-theme, color-scheme und die Farbe der Statusleiste. */
export function applyTheme(pref) {
  const wanted = normalizeTheme(pref);
  const resolved = resolveTheme(wanted);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePref = wanted;
  root.style.colorScheme = resolved;

  const color = resolved === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
  // Die zweite, medienabhängige Angabe aus index.html würde sonst gewinnen.
  document.querySelectorAll('meta[name="theme-color"][media]').forEach((node) => node.remove());

  return resolved;
}

/**
 * Startet die Darstellung und folgt Systemwechseln, solange „automatisch“
 * gewählt ist. `getPref` darf eine Funktion sein (dann wird sie bei jedem
 * Systemwechsel neu gefragt) oder ein fester Wert.
 */
export function initTheme(getPref = 'auto') {
  const pref = () => normalizeTheme(typeof getPref === 'function' ? getPref() : getPref);
  applyTheme(pref());

  try {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', () => {
      if (pref() === 'auto') applyTheme('auto');
    });
  } catch {
    /* Ohne matchMedia bleibt die zuletzt gesetzte Darstellung. */
  }

  return pref();
}
