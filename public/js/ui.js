/* ============================================================
   Kaloriq – UI-Bausteine (Sheets, Toasts, Icons, Charts)
   ============================================================ */
import { locale, tr, applyI18n } from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export const nf = new Intl.NumberFormat('de-DE');

export function fmt(value, digits = 0) {
  const n = Number(value) || 0;
  return n.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

export function haptic(ms = 8) {
  try { navigator.vibrate?.(ms); } catch { /* iOS: nicht verfügbar */ }
}

/* ---------------- Icons ---------------- */

const PATHS = {
  camera: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l.9-1.4A2 2 0 0 1 10.3 3.7h3.4a2 2 0 0 1 1.7.9l.9 1.4h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.4" r="3.4"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><path d="M8 7.5h7M8 11h5"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4M12.5 16V8M17 16v-6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 1.5"/><path d="M9 2h6"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  barcode: '<path d="M4 6v12M7 6v12M10 6v8M13 6v12M16 6v8M19 6v12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="M14.5 5l-7 7 7 7"/>',
  right: '<path d="M9.5 5l7 7-7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.4a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>',
  scale: '<path d="M4 7h16v13H4z"/><path d="M8 7V4.5h8V7"/><path d="M9.5 13.5h5"/>',
  flame: '<path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.4 1.4 1.3 2 2 2.2C11.6 8 12 5 12 3z"/>',
  sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M18 15l.9 2.1 2.1.9-2.1.9L18 21l-.9-2.1-2.1-.9 2.1-.9z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  pencil: '<path d="M4 20h4l10-10-4-4L4 16z"/>',
  download: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M4 20h16"/>',
  upload: '<path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M4 20h16"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-1.9-3.3-2.3.9a7 7 0 0 0-2-1.2L14.3 3h-3.8l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-.9L3.9 9.3l2 1.5A7 7 0 0 0 5.8 12c0 .4 0 .8.1 1.2l-2 1.5 1.9 3.3 2.3-.9a7 7 0 0 0 2 1.2l.4 2.7h3.8l.4-2.7a7 7 0 0 0 2-1.2l2.3.9 1.9-3.3-2-1.5c.1-.4.1-.8.1-1.2z"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
};

export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name] || ''}</svg>`;
}

/* ---------------- Toasts ---------------- */

export function toast(message, type = 'ok', ms = 2600) {
  const root = $('#toast-root');
  if (!root) return;
  const node = document.createElement('div');
  node.className = 'toast' + (type === 'err' ? ' err' : '');
  node.innerHTML = `<span>${type === 'err' ? '⚠️' : '✓'}</span><span>${esc(tr(message))}</span>`;
  root.appendChild(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 240);
  }, ms);
}

/* ---------------- Sheet ---------------- */

const openSheets = [];

// Android-Zurück-Taste: schließt zuerst das oberste Sheet.
let ignoreBack = 0;
window.addEventListener('popstate', () => {
  if (ignoreBack > 0) { ignoreBack--; return; }
  if (openSheets.length) openSheets[openSheets.length - 1].close(true);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && openSheets.length) openSheets[openSheets.length - 1].close();
});

/**
 * Öffnet ein Bottom-Sheet.
 * @returns {{el:HTMLElement, body:HTMLElement, close:Function}}
 */
export function openSheet({ title = '', subtitle = '', body = '', footer = '', tall = false, onClose } = {}) {
  const root = $('#sheet-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';

  const sheet = document.createElement('section');
  sheet.className = 'sheet' + (tall ? ' tall' : '');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = `
    <div class="sheet-grab"></div>
    <header class="sheet-head">
      <div class="grow">
        ${title ? `<h2>${esc(title)}</h2>` : ''}
        ${subtitle ? `<div class="small muted">${esc(subtitle)}</div>` : ''}
      </div>
      <button class="icon-btn" data-close aria-label="Schließen">${icon('x')}</button>
    </header>
    <div class="sheet-body"></div>
    ${footer ? '<div class="sheet-foot"></div>' : ''}
  `;

  const bodyEl = $('.sheet-body', sheet);
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else bodyEl.appendChild(body);

  if (footer) {
    const foot = $('.sheet-foot', sheet);
    if (typeof footer === 'string') foot.innerHTML = footer;
    else foot.appendChild(footer);
  }

  root.append(backdrop, sheet);
  applyI18n(sheet);
  document.body.classList.add('sheet-open');

  // Eigener History-Eintrag, damit die Android-Zurück-Taste das Sheet schließt.
  try { history.pushState({ kaloriqSheet: true }, ''); } catch { /* egal */ }

  requestAnimationFrame(() => {
    backdrop.classList.add('show');
    sheet.classList.add('show');
  });

  let closed = false;
  function close(fromPop = false) {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('show');
    sheet.classList.remove('show');
    const idx = openSheets.findIndex((s) => s.close === close);
    if (idx >= 0) openSheets.splice(idx, 1);
    if (!openSheets.length) document.body.classList.remove('sheet-open');
    setTimeout(() => { backdrop.remove(); sheet.remove(); }, 320);
    if (!fromPop) {
      ignoreBack++;
      try { history.back(); } catch { ignoreBack--; }
    }
    onClose?.();
  }

  backdrop.addEventListener('click', close);
  $('[data-close]', sheet).addEventListener('click', close);

  // Nach unten ziehen zum Schließen
  const head = $('.sheet-head', sheet);
  let startY = 0;
  let delta = 0;
  let dragging = false;

  const onStart = (e) => {
    if (bodyEl.scrollTop > 0) return;
    dragging = true;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    delta = 0;
    sheet.style.transition = 'none';
  };
  const onMove = (e) => {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    delta = Math.max(0, y - startY);
    if (delta > 0) {
      sheet.style.transform = `translateY(${delta}px)`;
      if (e.cancelable) e.preventDefault();
    }
  };
  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (delta > 110) close();
  };

  head.addEventListener('touchstart', onStart, { passive: true });
  head.addEventListener('touchmove', onMove, { passive: false });
  head.addEventListener('touchend', onEnd);
  head.addEventListener('touchcancel', onEnd);

  const footEl = footer ? $('.sheet-foot', sheet) : null;
  const api = { el: sheet, body: bodyEl, foot: footEl, close };
  openSheets.push(api);
  return api;
}

export function confirmDialog({ title, message, confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen', danger = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'vstack';
    wrap.innerHTML = `<p class="small" style="color:var(--text-2)">${esc(message)}</p>`;

    let decided = false;
    const sheet = openSheet({
      title,
      body: wrap,
      footer: `
        <button class="btn grow" data-no>${esc(cancelLabel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} grow" data-yes>${esc(confirmLabel)}</button>
      `,
      onClose: () => { if (!decided) resolve(false); },
    });

    $('[data-no]', sheet.el).addEventListener('click', () => { decided = true; resolve(false); sheet.close(); });
    $('[data-yes]', sheet.el).addEventListener('click', () => { decided = true; resolve(true); sheet.close(); });
  });
}

/* ---------------- Ring ---------------- */

export function ring({ size = 132, stroke = 11, pct = 0, color = 'var(--accent)', track = 'var(--line)', center = '', id = 'r' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = clamp(pct, 0, 1);
  return `
    <div class="ring-wrap" style="width:${size}px;height:${size}px">
      <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <linearGradient id="grad-${id}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="${color}" stop-opacity=".72"/>
          </linearGradient>
        </defs>
        <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}" stroke="${track}"/>
        <circle class="bar" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
          stroke="url(#grad-${id})" stroke-width="${stroke}"
          stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - p)).toFixed(2)}"/>
      </svg>
      <div class="ring-center">${center}</div>
    </div>`;
}

/* ---------------- Charts ---------------- */

export function lineChart({ points, target = null, height = 130, min = null, max = null, unit = 'kg' }) {
  if (!points || points.length < 1) {
    return `<div class="empty" style="padding:26px"><span class="emoji">📈</span><span>Noch keine Daten</span></div>`;
  }
  const W = 320;
  const H = height;
  const padY = 14;
  const padX = 6;
  const values = points.map((p) => p.value);
  const lo = min !== null ? min : Math.min(...values, target ?? Infinity) - 0.4;
  const hi = max !== null ? max : Math.max(...values, target ?? -Infinity) + 0.4;
  const span = Math.max(0.1, hi - lo);

  const x = (i) => padX + (points.length === 1 ? (W - padX * 2) / 2 : (i / (points.length - 1)) * (W - padX * 2));
  const y = (v) => padY + (1 - (v - lo) / span) * (H - padY * 2);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`;

  const targetLine = target !== null && target >= lo && target <= hi
    ? `<line class="target" x1="0" x2="${W}" y1="${y(target).toFixed(1)}" y2="${y(target).toFixed(1)}"/>`
    : '';

  const last = points[points.length - 1];
  const first = points[0];

  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Verlauf">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity=".22"/>
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${targetLine}
      <path class="area" d="${area}"/>
      <path class="line" d="${path}" vector-effect="non-scaling-stroke"/>
      <circle class="dot" cx="${x(points.length - 1)}" cy="${y(last.value)}" r="3.6"/>
      <text x="${padX}" y="${H - 1}">${esc(first.label)}</text>
      <text x="${W - padX}" y="${H - 1}" text-anchor="end">${esc(last.label)}</text>
    </svg>
    <div class="hstack" style="justify-content:space-between;margin-top:2px">
      <span class="tiny muted">Start ${fmt(first.value, 1)} ${unit}</span>
      <span class="tiny" style="font-weight:650">${fmt(last.value, 1)} ${unit}</span>
    </div>`;
}

export function weekBars(days, target, maxKcal = 0) {
  const max = Math.max(maxKcal, target, ...days.map((d) => d.totals.kcal), 1);
  return `<div class="bars">
    ${days.map((d, i) => {
      const isToday = i === days.length - 1;
      const k = d.totals.kcal;
      const hPct = Math.round((k / max) * 100);
      const over = target && k > target * 1.03;
      const label = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(d.key + 'T00:00:00').getDay()];
      return `<div class="col${isToday ? ' today' : ''}" title="${fmt(k)} kcal">
        <div class="stack" style="height:${Math.max(3, hPct)}%">
          <i style="height:${k ? 100 : 0}%;background:${over ? 'var(--danger)' : k ? 'var(--accent)' : 'transparent'}"></i>
        </div>
        <span class="lbl">${label}</span>
      </div>`;
    }).join('')}
  </div>`;
}

/* ---------------- Kleinkram ---------------- */

export function macroRow(name, value, target, cls) {
  const pct = target ? clamp((value / target) * 100, 0, 100) : 0;
  const over = target && value > target * 1.05;
  return `<div class="macro-row">
    <span class="name"><span>${esc(name)}</span> <b>${fmt(value)}/${fmt(target)}g</b></span>
    <span class="bar ${cls}${over ? ' over' : ''}"><i style="width:${pct}%"></i></span>
  </div>`;
}

export function setActiveTab(tab) {
  document.body.dataset.tab = tab;
  $$('.tab').forEach((btn) => {
    if (btn.dataset.tab === tab) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

export function downloadFile(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
