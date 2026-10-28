/* ============================================================
   Kaloriq – Monatsrückblick als Bild
   Rechnet den Monat zusammen und zeichnet eine 1080×1350-Karte.
   ============================================================ */
import { store, totals, streak } from './store.js';
import { locale, tr } from './i18n.js';
import { round1 } from './calc.js';
import { APP_VERSION } from './version.js';

const W = 1080;
const H = 1350;
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const pad = (n) => String(n).padStart(2, '0');

export function monthKeyOf(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1, 12);
  return monthKeyOf(d);
}

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  if (locale().startsWith('en')) {
    return new Date(year, month - 1, 1, 12).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
  }
  return `${MONTHS[month - 1]} ${year}`;
}

export function buildMonthStats(monthKey) {
  const state = store.get();
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const days = [];

  for (let d = 1; d <= lastDay; d++) {
    const key = `${year}-${pad(month)}-${pad(d)}`;
    const day = state.days?.[key];
    const tracked = Boolean(day?.entries?.length);
    days.push({
      key,
      kcal: tracked ? totals(day).kcal : 0,
      tracked,
      water: Number(day?.water) || 0,
      wins: Object.keys(day?.wins || {}).length,
      weight: Number(day?.weight) > 0 ? Number(day.weight) : null,
    });
  }

  const trackedDays = days.filter((d) => d.tracked);
  const avgKcal = trackedDays.length
    ? Math.round(trackedDays.reduce((sum, d) => sum + d.kcal, 0) / trackedDays.length)
    : 0;
  const waterDays = days.filter((d) => d.water > 0).length;
  const wins = days.reduce((sum, d) => sum + d.wins, 0);
  const weights = days.filter((d) => d.weight != null);
  const firstWeight = weights[0]?.weight ?? null;
  const lastWeight = weights[weights.length - 1]?.weight ?? null;
  const weightDelta = firstWeight != null && lastWeight != null ? round1(lastWeight - firstWeight) : null;

  // Längste zusammenhängende Serie innerhalb des Monats.
  let bestStreak = 0;
  let run = 0;
  for (const day of days) {
    if (day.tracked) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  return {
    monthKey,
    label: monthLabel(monthKey),
    days,
    tracked: trackedDays.length,
    avgKcal,
    waterDays,
    wins,
    weight: lastWeight,
    weightDelta,
    bestStreak,
    streak: streak(),
    target: Number(state.targets?.kcal) || 0,
    hasData: trackedDays.length > 0 || waterDays > 0 || wins > 0 || weights.length > 0,
  };
}

/* ---------------- Zeichnen ---------------- */

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawLogo(ctx, x, y, size) {
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, '#19c98a');
  g.addColorStop(1, '#0ea371');
  ctx.save();
  ctx.shadowColor = 'rgba(13, 122, 86, .28)';
  ctx.shadowBlur = size * 0.3;
  ctx.shadowOffsetY = size * 0.1;
  ctx.fillStyle = g;
  roundRect(ctx, x, y, size, size, size * 0.28);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${size * 0.56}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', x + size / 2, y + size / 2 + size * 0.02);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

function statCard(ctx, x, y, w, h, label, value, unit = '', sub = '') {
  ctx.save();
  ctx.shadowColor = 'rgba(12, 48, 33, .10)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, w, h, 26);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#6c8078';
  ctx.font = '600 21px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(tr(label), x + 28, y + 28);

  ctx.fillStyle = '#0f1f18';
  ctx.font = '750 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(String(value), x + 28, y + 64);
  if (unit) {
    const valueWidth = ctx.measureText(String(value)).width;
    ctx.fillStyle = '#6c8078';
    ctx.font = '600 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(unit, x + 28 + valueWidth + 8, y + 92);
  }
  if (sub) {
    ctx.fillStyle = '#8a9a92';
    ctx.font = '600 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(sub, x + 28, y + 122);
  }
}

export function drawShareCard(canvas, stats) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#f7faf8');
  bg.addColorStop(0.55, '#eef6f1');
  bg.addColorStop(1, '#e2f0e8');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(760, 240, 40, 760, 240, 620);
  glow.addColorStop(0, 'rgba(33, 201, 140, .18)');
  glow.addColorStop(1, 'rgba(33, 201, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Kopf
  drawLogo(ctx, 70, 70, 68);
  ctx.fillStyle = '#12251c';
  ctx.font = '700 34px "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Kaloriq', 156, 96);
  ctx.fillStyle = '#6c8078';
  ctx.font = '500 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Monatsrückblick', 156, 128);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#54685f';
  ctx.font = '650 25px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(stats.label, W - 70, 108);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Titel
  ctx.fillStyle = '#0f1f18';
  ctx.font = '750 58px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(stats.hasData ? stats.label : tr('Noch keine Daten'), 70, 205);
  ctx.fillStyle = '#54685f';
  ctx.font = '500 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(
    stats.hasData
      ? `${stats.tracked} ${tr(stats.tracked === 1 ? 'Tag getrackt' : 'Tage getrackt')}`
      : tr('Sobald du trackst, entsteht hier dein Rückblick.'),
    70,
    277,
  );

  if (!stats.hasData) {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 70, 390, W - 140, 420, 32);
    ctx.fill();
    ctx.fillStyle = '#0f1f18';
    ctx.font = '700 40px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🍃', W / 2, 520);
    ctx.fillStyle = '#54685f';
    ctx.font = '500 28px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(tr('Trag ein paar Tage ein – dann gibt es hier'), W / 2, 610);
    ctx.fillText(tr('Kalorien, Gewicht und kleine Erfolge zu sehen.'), W / 2, 652);
    ctx.textAlign = 'left';
  } else {
    // Statistiken
    const cardW = 456;
    const cardH = 160;
    const gap = 28;
    const x1 = 70;
    const x2 = 70 + cardW + gap;
    const y1 = 340;
    const y2 = y1 + cardH + 22;
    const y3 = y2 + cardH + 22;

    statCard(ctx, x1, y1, cardW, cardH, 'Tage getrackt', `${stats.tracked}`.replace('.', ','));
    statCard(ctx, x2, y1, cardW, cardH, 'Ø Kalorien', stats.avgKcal ? stats.avgKcal.toLocaleString(locale()) : '–', stats.avgKcal ? 'kcal' : '');
    statCard(ctx, x1, y2, cardW, cardH, 'Wasser-Tage', stats.waterDays);
    statCard(ctx, x2, y2, cardW, cardH, 'Kleine Erfolge', stats.wins);
    statCard(ctx, x1, y3, cardW, cardH, 'Längste Serie', stats.bestStreak, stats.bestStreak === 1 ? 'Tag' : 'Tage');

    const delta = stats.weightDelta;
    const deltaText = delta == null
      ? ''
      : Math.abs(delta) < 0.05
        ? tr('unverändert')
        : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
    statCard(
      ctx, x2, y3, cardW, cardH, 'Gewicht',
      stats.weight != null ? `${stats.weight.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : '–',
      stats.weight != null ? 'kg' : '',
      deltaText,
    );

    // Kalorienverlauf
    const chartX = 70;
    const chartY = 945;
    const chartW = W - 140;
    const chartH = 245;
    ctx.save();
    ctx.shadowColor = 'rgba(12, 48, 33, .10)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, chartX, chartY, chartW, chartH, 30);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#6c8078';
    ctx.font = '600 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(tr('Kalorien pro Tag'), chartX + 28, chartY + 24);

    const barsX = chartX + 28;
    const barsY = chartY + 108;
    const barsW = chartW - 56;
    const barsH = 100;
    const count = stats.days.length;
    const slot = barsW / count;
    const barW = Math.max(7, slot * 0.62);
    const max = Math.max(stats.target || 0, ...stats.days.map((d) => d.kcal), 1);

    if (stats.target) {
      const targetY = barsY + barsH - (stats.target / max) * barsH;
      ctx.strokeStyle = 'rgba(108, 128, 120, .45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(barsX, targetY);
      ctx.lineTo(barsX + barsW, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    stats.days.forEach((day, index) => {
      const h = day.tracked ? Math.max(4, (day.kcal / max) * barsH) : 3;
      const x = barsX + index * slot + (slot - barW) / 2;
      ctx.fillStyle = day.tracked ? '#19b981' : 'rgba(15, 31, 24, .08)';
      const y = barsY + barsH - h;
      const radius = Math.min(4, barW / 2);
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, y + h);
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = '#8a9a92';
    ctx.font = '500 16px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('1.', barsX, barsY + barsH + 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${count}.`, barsX + barsW, barsY + barsH + 8);
    ctx.textAlign = 'left';
  }

  // Fußzeile
  ctx.fillStyle = '#6c8078';
  ctx.font = '500 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Kaloriq · deine Daten bleiben auf dem Gerät', 70, H - 58);
  ctx.textAlign = 'right';
  ctx.fillText(`v${APP_VERSION}`, W - 70, H - 58);
  ctx.textAlign = 'left';
}

export function cardBlob(stats) {
  const canvas = document.createElement('canvas');
  drawShareCard(canvas, stats);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Bild konnte nicht erstellt werden.'));
    }, 'image/png');
  });
}
