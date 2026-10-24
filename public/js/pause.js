/* ============================================================
   Kaloriq – Pausenmodus
   „Nur heute drüber“ oder ein paar Tage ohne Kaloriendruck.
   Die Serie wird eingefroren, Einträge bleiben optional.
   ============================================================ */
import {
  activePause, startPause, endPause, pauseRemainingDays, PAUSE_OPEN_END,
} from './store.js';
import { openSheet, toast, haptic } from './ui.js';
import { locale } from './i18n.js';

/** „bis 26. Oktober 2026“ oder „ohne Enddatum“. */
export function pauseEndLabel(pause = activePause()) {
  if (!pause) return '';
  if (pause.to === PAUSE_OPEN_END) return 'ohne Enddatum';
  const date = new Date(`${pause.to}T00:00:00`);
  try {
    return `bis ${new Intl.DateTimeFormat(locale(), {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date)}`;
  } catch {
    return `bis ${pause.to}`;
  }
}

/** Kurze Beschreibung für Zeilen und Karten. */
export function pauseStateLabel(pause = activePause()) {
  if (!pause) return '';
  const left = pauseRemainingDays(pause);
  if (left === null) return 'ohne Enddatum';
  return `${pauseEndLabel(pause)} · noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`;
}

const DURATIONS = [
  { days: 1, label: 'Nur heute', sub: 'Ein Tag ohne Bewertung' },
  { days: 3, label: '3 Tage', sub: 'Kurze Auszeit' },
  { days: 7, label: '1 Woche', sub: 'Eine Woche ohne Druck' },
  { days: 14, label: '2 Wochen', sub: 'Längere Pause' },
  { days: null, label: 'Bis ich es beende', sub: 'Offenes Ende' },
];

/** Sheet zum Starten, Verlängern oder Beenden der Pause. */
export function openPauseSheet() {
  const current = activePause();
  const left = current ? pauseRemainingDays(current) : 0;
  const currentDays = current ? left : null;
  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">
      Manchmal ist einfach „heute drüber“ okay. In der Pause wird dein
      Kalorienziel ausgeblendet und die Serie eingefroren. Du kannst weiter
      eintragen – nichts wird bewertet.
    </p>
    ${current ? `<div class="card" style="padding:14px;margin-bottom:14px">
      <div class="hstack" style="justify-content:space-between">
        <span class="small" style="font-weight:620">Pause aktiv</span>
        <span class="pill">${left === null ? 'offen' : `${left} ${left === 1 ? 'Tag' : 'Tage'}`}</span>
      </div>
      <p class="tiny muted" style="margin-top:6px"><span>${pauseStateLabel(current)}</span> · <span>Serie eingefroren</span>.</p>
    </div>` : ''}
    ${DURATIONS.map((d) => `
      <button class="choice" data-pause-days="${d.days == null ? 'open' : d.days}" aria-pressed="${current
        ? (d.days == null ? current.to === PAUSE_OPEN_END : currentDays === d.days)
        : false}">
        <span class="ico">${d.days == null ? '∞' : d.days}</span>
        <span class="grow">
          <span class="t">${d.label}</span>
          <span class="s">${d.sub}</span>
        </span>
        <span class="dot"></span>
      </button>`).join('')}
    ${current ? '<p class="tiny muted" style="margin-top:10px">Eine bestehende Pause lässt sich verlängern oder verkürzen. Vergangene Pausentage bleiben eingefroren.</p>' : ''}
  `;

  const sheet = openSheet({
    title: 'Pausenmodus',
    subtitle: 'Nur heute drüber oder ein paar Tage',
    body,
    footer: current
      ? '<button class="btn btn-danger" data-pause-end>Pause beenden</button><button class="btn btn-primary grow" data-save>Übernehmen</button>'
      : '<button class="btn btn-primary btn-block" data-save>Pause starten</button>',
    tall: true,
  });

  let choice = null;
  body.querySelectorAll('[data-pause-days]').forEach((b) => b.addEventListener('click', () => {
    const raw = b.dataset.pauseDays;
    choice = raw === 'open' ? null : Number(raw);
    body.querySelectorAll('[data-pause-days]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    haptic();
  }));

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', () => {
    if (choice === null && !body.querySelector('[data-pause-days][aria-pressed="true"]')) {
      // Kein neues Intervall gewählt: bei aktiver Pause einfach schließen.
      if (current) { sheet.close(); return; }
      toast('Bitte eine Dauer auswählen', 'err');
      return;
    }
    const pause = startPause(choice);
    toast(current
      ? 'Pause angepasst'
      : pause.to === PAUSE_OPEN_END ? 'Pause gestartet · ohne Enddatum' : 'Pause gestartet');
    haptic(12);
    sheet.close();
  });

  sheet.foot?.querySelector('[data-pause-end]')?.addEventListener('click', () => {
    endPause();
    toast('Pause beendet');
    haptic(12);
    sheet.close();
  });
}
