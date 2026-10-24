/* ============================================================
   Kaloriq – Kleine Nicht-Zahl-Erfolge
   Sanftes Feedback im Tagebuch, ohne Punkte, Serien oder Bewertung.
   ============================================================ */
import { toggleWin } from './store.js';
import { haptic } from './ui.js';

export const WINS = [
  { id: 'water', label: 'Wasser getrunken' },
  { id: 'walk', label: 'Spaziergang gemacht' },
  { id: 'mindful', label: 'Bewusst gegessen' },
  { id: 'time', label: 'Mir Zeit genommen' },
];

/** Karte mit den Erfolgen des Tages. */
export function winsCard(day) {
  const any = WINS.some((w) => day?.wins?.[w.id]);
  return `
    <section class="card wins-card">
      <div class="card-title" style="margin-bottom:2px">Kleine Erfolge</div>
      <div class="tiny muted">Nicht alles muss eine Zahl sein.</div>
      <div class="wins-chips">
        ${WINS.map((w) => `<button class="win-chip" data-win="${w.id}" aria-pressed="${Boolean(day?.wins?.[w.id])}">${w.label}</button>`).join('')}
      </div>
      ${any ? `<p class="tiny muted" style="margin-top:10px">Das zählt auch – ohne Zahl.</p>` : ''}
    </section>`;
}

/** Klick-Handler für die Erfolgskarte an das Tagebuch binden. */
export function bindWins(root, dateKey) {
  root.querySelectorAll('[data-win]').forEach((btn) => btn.addEventListener('click', () => {
    toggleWin(dateKey, btn.dataset.win);
    haptic();
  }));
}
