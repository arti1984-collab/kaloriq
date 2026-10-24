/* ============================================================
   Kaloriq – Hinzufügen (Suche, Barcode, Eigene, KI)
   ============================================================ */
import {
  store, addEntries, todayKey, MEALS, recentFoods, isFavoriteFood, toggleFavoriteFood, rememberFood,
} from '../store.js';
import { searchLocal, searchRemote, lookupBarcode, foodEmoji, customFoodFromInput } from '../foods.js';
import { estimate, prepareImage, detectProxy } from '../ai.js';
import { esc, fmt, icon, toast, openSheet, haptic } from '../ui.js';
import { tr } from '../i18n.js';

const mealLabel = (id) => MEALS.find((m) => m.id === id)?.label || 'Mahlzeit';

const NATIVE_SCAN_ERRORS = {
  open_failed: 'Scanner konnte nicht geöffnet werden.',
  no_code: 'Kein Barcode erkannt.',
  read_failed: 'Scan-Ergebnis konnte nicht gelesen werden.',
};

/* ---------------- Nativer Barcode-Scanner (APK) ---------------- */

function hasNativeScanner() {
  return typeof window !== 'undefined'
    && window.AndroidBarcodeScanner
    && typeof window.AndroidBarcodeScanner.scan === 'function';
}

/**
 * Öffnet den nativen Scanner und wartet auf das Ergebnis.
 * Löst mit dem erkannten Code auf, bei Abbruch mit einem leeren String.
 */
function scanWithNative() {
  return new Promise((resolve, reject) => {
    if (!hasNativeScanner()) {
      reject(new Error(tr('Scanner nicht verfügbar.')));
      return;
    }

    let settled = false;
    let timer = 0;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (window.__kaloriqBarcode === onResult) delete window.__kaloriqBarcode;
      fn(value);
    };
    const onResult = (result) => {
      if (!result || result.cancelled) return finish(resolve, '');
      if (result.error) {
        const message = NATIVE_SCAN_ERRORS[result.error] || 'Scan fehlgeschlagen. Bitte erneut versuchen.';
        return finish(reject, new Error(tr(message)));
      }
      const value = String(result.value || '').trim();
      if (!value) return finish(reject, new Error(tr('Kein Barcode erkannt.')));
      finish(resolve, value);
    };

    window.__kaloriqBarcode = onResult;
    timer = setTimeout(
      () => finish(reject, new Error(tr('Zeitüberschreitung beim Scan. Bitte erneut versuchen.'))),
      120000
    );
    try {
      window.AndroidBarcodeScanner.scan(tr('Barcode scannen'));
    } catch {
      finish(reject, new Error(tr('Scanner konnte nicht geöffnet werden.')));
    }
  });
}

/* ---------------- Browser-Scanner (Safari/Firefox ohne BarcodeDetector) ---------------- */

const ZXING_URL = new URL('../../vendor/zxing.min.js', import.meta.url).href;
let zxingLoading = null;

/** Lädt ZXing erst beim ersten Scan und nur einmal. */
function loadZXing() {
  if (typeof window !== 'undefined' && window.ZXing) return Promise.resolve(window.ZXing);
  if (zxingLoading) return zxingLoading;

  zxingLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      script.remove();
      const err = new Error('ZXing konnte nicht geladen werden.');
      err.name = 'ZXingLoadError';
      reject(err);
    };
    script.src = ZXING_URL;
    script.async = true;
    script.onload = () => {
      script.remove();
      if (window.ZXing) resolve(window.ZXing);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((err) => {
    zxingLoading = null;
    throw err;
  });

  return zxingLoading;
}

function cameraErrorMessage(err) {
  if (err?.name === 'ZXingLoadError') {
    return tr('Scanner konnte nicht geladen werden. Bitte Nummer eingeben.');
  }
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
    return tr('Kamerazugriff wurde abgelehnt. Bitte in den Einstellungen erlauben oder Nummer eingeben.');
  }
  if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError' || err?.name === 'OverconstrainedError') {
    return tr('Keine Kamera gefunden. Bitte Nummer eingeben.');
  }
  if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
    return tr('Die Kamera wird bereits verwendet. Bitte Nummer eingeben.');
  }
  return tr('Kamera nicht verfügbar. Bitte Nummer eingeben.');
}

// Open Food Facts erlaubt nur wenige Suchanfragen pro Minute → Ergebnisse cachen.
const remoteCache = new Map();
let remoteCooldownUntil = 0;

/* ============================================================
   Hinzufügen-Sheet
   ============================================================ */
export function openAddSheet({ dateKey = todayKey(), meal = 'breakfast' } = {}) {
  const state = { dateKey, meal, mode: 'search' };
  let stopActiveScan = null;

  const stopActiveScanIfAny = () => {
    const stop = stopActiveScan;
    stopActiveScan = null;
    try { stop?.(); } catch { /* Scanner war bereits beendet */ }
  };

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="seg" style="margin-bottom:16px" role="tablist">
      <button type="button" data-mode="search" aria-selected="true">Suche</button>
      <button type="button" data-mode="barcode" aria-selected="false">Barcode</button>
      <button type="button" data-mode="custom" aria-selected="false">Eigene</button>
    </div>
    <div data-panel></div>`;

  const sheet = openSheet({
    title: 'Hinzufügen',
    subtitle: mealLabel(state.meal),
    body,
    tall: true,
    onClose: stopActiveScanIfAny,
  });

  const panel = body.querySelector('[data-panel]');
  const segs = Array.from(body.querySelectorAll('[data-mode]'));

  const setMode = (mode) => {
    if (mode !== 'barcode') stopActiveScanIfAny();
    state.mode = mode;
    segs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
    if (mode === 'search') renderSearch();
    if (mode === 'barcode') renderBarcode();
    if (mode === 'custom') renderCustom();
  };
  segs.forEach((b) => b.addEventListener('click', () => { haptic(); setMode(b.dataset.mode); }));

  /* ---------- Suche ---------- */
  function renderSearch() {
    panel.innerHTML = `
      <div class="search-wrap" style="margin-bottom:12px">
        ${icon('search')}
        <input class="input" id="food-q" type="search" placeholder="Lebensmittel suchen…" autocomplete="off" enterkeyhint="search">
      </div>
      <div class="tiny muted" style="margin:0 4px 8px">Eigene Datenbank · Open Food Facts auf Anfrage</div>
      <div id="food-quick"></div>
      <div id="food-results"></div>
      <div id="food-remote" style="margin-top:12px"></div>`;

    const input = panel.querySelector('#food-q');
    const results = panel.querySelector('#food-results');
    const remoteBox = panel.querySelector('#food-remote');
    const quick = panel.querySelector('#food-quick');
    let timer = null;

    const paintQuick = () => {
      if (!quick) return;
      if (input.value.trim()) { quick.innerHTML = ''; return; }
      const favorites = (store.get().favorites || []).slice(0, 6);
      const recents = recentFoods().slice(0, 6);
      const block = (title, items, attr) => items.length
        ? `<div class="section-title" style="margin:4px 4px 8px">${title}</div>
           <div class="chips" style="margin-bottom:14px">${items.map((f, i) => `<button class="chip" data-${attr}="${i}">${esc(f.name)}</button>`).join('')}</div>`
        : '';
      quick.innerHTML = block('Favoriten', favorites, 'quick-fav') + block('Zuletzt', recents, 'quick-recent');
      quick.querySelectorAll('[data-quick-fav]').forEach((btn) => btn.addEventListener('click', () => {
        const f = favorites[Number(btn.dataset.quickFav)];
        if (f) renderQuantity(f);
      }));
      quick.querySelectorAll('[data-quick-recent]').forEach((btn) => btn.addEventListener('click', () => {
        const f = recents[Number(btn.dataset.quickRecent)];
        if (f) renderQuantity(f);
      }));
    };

    // Schnellzugriff: Chip übernimmt den Begriff in die Suche
    results.addEventListener('click', (e) => {
      const chip = e.target.closest?.('[data-suggest]');
      if (!chip) return;
      input.value = chip.dataset.suggest;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
      haptic();
    });

    const paintLocal = (q) => {
      const local = searchLocal(q, 25);
      results.innerHTML = local.length
        ? `<div class="card flush rows">${local.map((f, i) => foodRow(f, i)).join('')}</div>`
        : `<div class="empty"><span class="emoji">🔎</span><span>Nichts in der lokalen Liste gefunden</span><span class="tiny">Nutze die Online-Suche oder lege ein eigenes Lebensmittel an.</span></div>`;
      results.querySelectorAll('[data-food]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const f = local[Number(btn.dataset.food)];
          if (f) renderQuantity(f);
        });
      });
      remoteBox.innerHTML = q.length >= 2
        ? `<button class="btn btn-block btn-sm" data-remote-search>${icon('search')} „${esc(q)}" online suchen</button>`
        : '';
      remoteBox.querySelector('[data-remote-search]')?.addEventListener('click', () => searchOnline(q));
    };

    const renderRemote = (items, q) => {
      remoteBox.innerHTML = `<div class="section-title" style="margin:0 4px 8px">Open Food Facts</div>
        <div class="card flush rows">${items.map((f, i) => foodRow(f, i, true)).join('')}</div>`;
      remoteBox.querySelectorAll('[data-remote]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const f = items[Number(btn.dataset.remote)];
          if (f) renderQuantity(f);
        });
      });
      void q;
    };

    const searchOnline = async (q) => {
      const key = q.trim().toLowerCase();
      if (remoteCache.has(key)) return renderRemote(remoteCache.get(key), q);
      if (Date.now() < remoteCooldownUntil) {
        remoteBox.innerHTML = `<div class="ai-note"><span>⏳</span><span>Open Food Facts hat gerade zu viele Anfragen erhalten. Bitte in ein paar Sekunden erneut versuchen – lokale Treffer funktionieren sofort.</span></div>`;
        return;
      }

      remoteBox.innerHTML = `<div class="vstack"><div class="skeleton"></div><div class="skeleton"></div></div>`;
      try {
        const items = await searchRemote(q, 20);
        if (!items.length) {
          remoteBox.innerHTML = `<div class="ai-note"><span>🔍</span><span>Keine Treffer bei Open Food Facts. Andere Schreibweise probieren oder eigenes Lebensmittel anlegen.</span></div>`;
          return;
        }
        if (remoteCache.size > 40) remoteCache.clear();
        remoteCache.set(key, items);
        renderRemote(items, q);
      } catch (err) {
        remoteCooldownUntil = Date.now() + 30000;
        remoteBox.innerHTML = `<div class="ai-note">
          <span>📡</span>
          <span>Online-Suche nicht erreichbar (Limit oder kein Netz). Lokale Treffer und eigene Lebensmittel funktionieren weiter.<br>
          <button class="btn btn-sm" data-retry style="margin-top:8px">Erneut versuchen</button></span>
        </div>`;
        remoteBox.querySelector('[data-retry]')?.addEventListener('click', () => {
          remoteCooldownUntil = 0;
          searchOnline(q);
        });
      }
    };

    input.addEventListener('input', () => {
      const q = input.value.trim();
      clearTimeout(timer);
      paintQuick();
      if (!q) { results.innerHTML = hintBlock(); remoteBox.innerHTML = ''; return; }
      paintLocal(q);
      if (q.length >= 3) timer = setTimeout(() => searchOnline(q), 600);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = input.value.trim();
        if (q.length >= 2) searchOnline(q);
      }
    });

    results.innerHTML = hintBlock();
    paintQuick();
    setTimeout(() => input.focus(), 180);
  }

  function hintBlock() {
    return `<div class="card" style="padding:16px">
      <div class="tiny muted" style="margin-bottom:8px">Schnellzugriff</div>
      <div class="chips">
        ${['Haferflocken', 'Hähnchenbrust', 'Banane', 'Magerquark', 'Vollkornbrot', 'Kaffee'].map((s) => `<button class="chip" data-suggest="${s}">${s}</button>`).join('')}
      </div>
    </div>`;
  }

  function foodRow(food, index, remote = false) {
    const src = food.source === 'off' ? 'OFF' : food.group;
    const img = food.image ? `<img src="${esc(food.image)}" alt="" loading="lazy">` : foodEmoji(food);
    return `<button class="row" ${remote ? `data-remote="${index}"` : `data-food="${index}"`}>
      <span class="row-thumb">${img}</span>
      <span class="grow">
        <span class="t">${esc(food.name)}</span>
        <span class="s">${food.brand ? esc(food.brand) + ' · ' : ''}${fmt(food.per100.kcal)} kcal · P ${fmt(food.per100.protein, 1)} · KH ${fmt(food.per100.carbs, 1)} · F ${fmt(food.per100.fat, 1)}</span>
      </span>
      <span class="v">${src}</span>
    </button>`;
  }

  /* ---------- Menge / Detail ---------- */
  function renderQuantity(food) {
    const defaultGrams = food.portion?.grams || 100;
    const baseGrams = defaultGrams;
    const favorite = isFavoriteFood(food);
    const handGrams = {
      small: Math.max(10, Math.round(baseGrams * 0.7)),
      medium: Math.max(10, Math.round(baseGrams)),
      large: Math.max(10, Math.round(baseGrams * 1.5)),
    };
    panel.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-back style="margin:-6px 0 10px -8px">${icon('left')} Zurück</button>
      <div class="card" style="padding:16px">
        <div class="hstack" style="align-items:flex-start">
          <span class="avatar" style="width:46px;height:46px;border-radius:14px;font-size:20px">${food.image ? `<img src="${esc(food.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px">` : foodEmoji(food)}</span>
          <div class="grow">
            <div class="t" style="font-weight:680;font-size:16px">${esc(food.name)}</div>
            <div class="s tiny muted">${food.brand ? esc(food.brand) + ' · ' : ''}${fmt(food.per100.kcal)} kcal pro 100 g</div>
          </div>
          <button class="icon-btn" data-fav aria-label="Favorit" aria-pressed="${favorite}">${icon('star')}</button>
        </div>
        <div class="divider"></div>
        <div class="seg" style="margin-bottom:12px" data-unit-switch>
          <button type="button" data-unit="g" aria-selected="true">Gramm</button>
          <button type="button" data-unit="hand" aria-selected="false">Handportion</button>
        </div>
        <div data-qty-g>
          <div class="field" style="margin-bottom:10px">
            <label for="qty">Menge (g)</label>
            <input class="input" id="qty" type="number" inputmode="decimal" step="1" value="${defaultGrams}">
          </div>
          <div class="chips" style="margin-bottom:14px">
            ${[50, 100, 150, 200, 250].map((g) => `<button class="chip" data-q="${g}">${g} g</button>`).join('')}
            ${food.portion ? `<button class="chip on" data-q="${food.portion.grams}">${esc(food.portion.label)} (${fmt(food.portion.grams)} g)</button>` : ''}
          </div>
        </div>
        <div data-qty-hand hidden>
          <div class="chips" style="margin-bottom:10px">
            <button class="chip" data-hand="small" aria-pressed="false">Klein · ca. ${fmt(handGrams.small)} g</button>
            <button class="chip" data-hand="medium" aria-pressed="true">Mittel · ca. ${fmt(handGrams.medium)} g</button>
            <button class="chip" data-hand="large" aria-pressed="false">Groß · ca. ${fmt(handGrams.large)} g</button>
          </div>
          <p class="tiny muted" style="margin-bottom:14px">Orientierung: eine Handportion, keine Waage.</p>
        </div>
        <div class="stat-grid" id="qty-stats"></div>
      </div>

      <div class="section-title">Mahlzeit</div>
      <div class="chips">
        ${MEALS.map((m) => `<button class="chip" data-meal="${m.id}" aria-pressed="${m.id === state.meal}">${m.icon} ${m.label}</button>`).join('')}
      </div>`;

    const input = panel.querySelector('#qty');
    const stats = panel.querySelector('#qty-stats');

    const paint = () => {
      const g = Math.max(0, Number(String(input.value).replace(',', '.')) || 0);
      const f = g / 100;
      stats.innerHTML = `
        <div class="stat"><div class="lbl">Kalorien</div><div class="val">${fmt(food.per100.kcal * f)}</div></div>
        <div class="stat"><div class="lbl">Protein</div><div class="val">${fmt(food.per100.protein * f, 1)}<small> g</small></div></div>
        <div class="stat"><div class="lbl">Kohlenhydrate</div><div class="val">${fmt(food.per100.carbs * f, 1)}<small> g</small></div></div>
        <div class="stat"><div class="lbl">Fett</div><div class="val">${fmt(food.per100.fat * f, 1)}<small> g</small></div></div>`;
    };
    paint();
    input.addEventListener('input', paint);
    input.addEventListener('change', paint);
    panel.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
      input.value = b.dataset.q;
      paint();
    }));

    // Handportionen: grobe Portionsgrößen statt Gramm.
    let unit = 'g';
    let hand = 'medium';
    const applyUnit = (next) => {
      unit = next;
      panel.querySelectorAll('[data-unit]').forEach((b) => {
        b.setAttribute('aria-selected', String(b.dataset.unit === unit));
      });
      panel.querySelectorAll('[data-qty-g]').forEach((el) => { el.hidden = unit !== 'g'; });
      const handBox = panel.querySelector('[data-qty-hand]');
      if (handBox) handBox.hidden = unit !== 'hand';
      if (unit === 'hand') {
        input.value = String(handGrams[hand]);
        paint();
      }
    };
    panel.querySelectorAll('[data-unit]').forEach((b) => b.addEventListener('click', () => {
      applyUnit(b.dataset.unit);
      haptic();
    }));
    panel.querySelectorAll('[data-hand]').forEach((b) => b.addEventListener('click', () => {
      hand = b.dataset.hand;
      panel.querySelectorAll('[data-hand]').forEach((x) => {
        x.setAttribute('aria-pressed', String(x === b));
      });
      if (unit !== 'hand') applyUnit('hand');
      else {
        input.value = String(handGrams[hand]);
        paint();
      }
      haptic();
    }));

    if (store.get().settings.portionMode === 'hand') applyUnit('hand');

    panel.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => {
      state.meal = b.dataset.meal;
      panel.querySelectorAll('[data-meal]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      sheet.el.querySelector('.sheet-head .small').textContent = mealLabel(state.meal);
    }));
    panel.querySelector('[data-fav]')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const on = toggleFavoriteFood(food);
      btn.setAttribute('aria-pressed', String(on));
      toast(on ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
      haptic();
    });
    panel.querySelector('[data-back]').addEventListener('click', () => renderSearch());

    // Hauptbutton im Footer
    const foot = sheet.el.querySelector('.sheet-foot');
    if (foot) foot.remove();

    const bar = document.createElement('div');
    bar.className = 'sheet-foot';
    bar.innerHTML = `<button class="btn btn-primary grow" data-add>Zu ${mealLabel(state.meal)} hinzufügen</button>`;
    sheet.el.appendChild(bar);

    bar.querySelector('[data-add]').addEventListener('click', () => {
      const grams = Math.max(1, Number(String(input.value).replace(',', '.')) || defaultGrams);
      addEntries(state.dateKey, state.meal, [{
        name: food.name,
        brand: food.brand,
        grams,
        per100: food.per100,
        source: food.source,
        emoji: food.emoji,
      }]);
      rememberFood(food);
      haptic(12);
      toast(`${food.name} hinzugefügt`);
      sheet.close();
    });
  }

  /* ---------- Barcode ---------- */
  function renderBarcode() {
    const native = hasNativeScanner();
    const canUseCamera = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    const supported = native || canUseCamera;
    panel.innerHTML = `
      <div class="card" style="padding:16px">
        <div class="field" style="margin-bottom:10px">
          <label for="barcode">Barcode-Nummer</label>
          <input class="input" id="barcode" type="text" inputmode="numeric" placeholder="z. B. 4008400403928" autocomplete="off">
        </div>
        <div class="hstack">
          <button class="btn btn-primary grow" data-lookup>${icon('search')} Suchen</button>
          ${supported ? `<button class="btn" data-scan>${icon('camera')} Scannen</button>` : ''}
        </div>
        ${supported ? '' : '<p class="tiny muted" style="margin-top:10px">Kamera-Scan wird von diesem Browser nicht unterstützt – Nummer steht auf der Verpackung.</p>'}
      </div>
      <div id="barcode-out" style="margin-top:14px"></div>`;

    const out = panel.querySelector('#barcode-out');
    const input = panel.querySelector('#barcode');

    const doLookup = async (code) => {
      stopActiveScanIfAny();
      const value = String(code || input.value).trim();
      if (!value) return;
      if (code) input.value = value;
      out.innerHTML = `<div class="skeleton"></div>`;
      try {
        const food = await lookupBarcode(value);
        out.innerHTML = '';
        renderQuantity(food);
      } catch (err) {
        out.innerHTML = `<div class="ai-note">${esc(err.message)}</div>`;
      }
    };

    panel.querySelector('[data-lookup]').addEventListener('click', () => doLookup());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLookup(); });

    const scanBtn = panel.querySelector('[data-scan]');
    scanBtn?.addEventListener('click', async () => {
      if (stopActiveScan) return;
      // In der PWA: BarcodeDetector wo vorhanden, sonst ZXing (Safari/Firefox).
      if (!native) {
        startScanner(out, doLookup);
        return;
      }
      if (scanBtn.disabled) return;

      scanBtn.disabled = true;
      const label = scanBtn.innerHTML;
      scanBtn.textContent = tr('Scanner wird geöffnet …');
      out.innerHTML = `<div class="pill">${esc(tr('Scanner wird geöffnet …'))}</div>`;

      try {
        const code = await scanWithNative();
        if (!code) {
          out.innerHTML = '';
          return;
        }
        input.value = code;
        haptic(30);
        await doLookup(code);
      } catch (err) {
        out.innerHTML = `<div class="ai-note">${esc(err.message)}</div>`;
      } finally {
        scanBtn.disabled = false;
        scanBtn.innerHTML = label;
      }
    });
  }

  async function startScanner(out, onCode) {
    out.innerHTML = `
      <div class="card" style="padding:10px;position:relative;overflow:hidden">
        <video id="scan-video" playsinline muted autoplay style="width:100%;border-radius:14px;background:#000;aspect-ratio:4/3;object-fit:cover"></video>
        <div style="position:absolute;inset:10px;border-radius:14px;pointer-events:none;border:2px solid rgba(255,255,255,.55)"></div>
        <button class="btn btn-sm btn-block" data-stop style="margin-top:8px">Abbrechen</button>
      </div>
      <p class="tiny muted center" data-scan-hint style="margin-top:8px">${esc(tr('Scanner wird geladen …'))}</p>`;

    const video = out.querySelector('#scan-video');
    const hint = out.querySelector('[data-scan-hint]');
    let stream = null;
    let reader = null;
    let raf = 0;
    let stopped = false;

    const stop = (clear = true) => {
      stopped = true;
      cancelAnimationFrame(raf);
      try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* egal */ }
      try { reader?.reset(); } catch { /* egal */ }
      reader = null;
      if (stopActiveScan === stop) stopActiveScan = null;
      if (clear && out.isConnected) out.innerHTML = '';
    };
    stopActiveScan = () => stop(true);
    out.querySelector('[data-stop]').addEventListener('click', () => stop(true));

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera_not_supported');

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      if (stopped) return;
      if (hint) hint.textContent = tr('Barcode in den Rahmen halten…');

      let detector = null;
      if (typeof window.BarcodeDetector === 'function') {
        try {
          detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        } catch { detector = null; }
      }

      if (detector) {
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            if (codes?.length) {
              const raw = String(codes[0].rawValue || '').trim();
              if (!raw) return;
              haptic(30);
              stop(false);
              out.innerHTML = `<div class="pill">${esc(tr('Code erkannt:'))} ${esc(raw)}</div>`;
              onCode(raw);
              return;
            }
          } catch { /* Frame überspringen */ }
          if (!stopped) raf = requestAnimationFrame(tick);
        };
        tick();
        return;
      }

      const ZXing = await loadZXing();
      if (stopped) return;
      const hints = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.ITF,
      ]);
      reader = new ZXing.BrowserMultiFormatReader(hints, 200);
      reader.decodeContinuously(video, (result) => {
        if (stopped || !result) return;
        const raw = String(result.getText?.() || '').trim();
        if (!raw) return;
        haptic(30);
        stop(false);
        out.innerHTML = `<div class="pill">${esc(tr('Code erkannt:'))} ${esc(raw)}</div>`;
        onCode(raw);
      });
    } catch (err) {
      if (!stopped) {
        stop(false);
        out.innerHTML = `<div class="ai-note">${esc(cameraErrorMessage(err))}</div>`;
      }
    }
  }

  /* ---------- Eigenes Lebensmittel ---------- */
  function renderCustom() {
    panel.innerHTML = `
      <div class="card" style="padding:16px">
        <div class="field">
          <label for="c-name">Name</label>
          <input class="input" id="c-name" placeholder="z. B. Omas Apfelkuchen">
        </div>
        <div class="field">
          <label>Nährwerte pro 100 g</label>
          <div class="input-group">
            <input class="input" id="c-kcal" type="number" inputmode="decimal" placeholder="kcal">
            <input class="input" id="c-p" type="number" inputmode="decimal" placeholder="Protein g">
          </div>
          <div class="input-group" style="margin-top:8px">
            <input class="input" id="c-c" type="number" inputmode="decimal" placeholder="KH g">
            <input class="input" id="c-f" type="number" inputmode="decimal" placeholder="Fett g">
          </div>
        </div>
        <div class="field" style="margin-bottom:0">
          <label>Portion <span class="muted">(optional)</span></label>
          <div class="input-group">
            <input class="input" id="c-pl" placeholder="Stück">
            <input class="input" id="c-pg" type="number" inputmode="decimal" placeholder="Gramm">
          </div>
        </div>
      </div>
      <div class="section-title">Mahlzeit</div>
      <div class="chips">
        ${MEALS.map((m) => `<button class="chip" data-meal="${m.id}" aria-pressed="${m.id === state.meal}">${m.icon} ${m.label}</button>`).join('')}
      </div>`;

    panel.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => {
      state.meal = b.dataset.meal;
      panel.querySelectorAll('[data-meal]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));

    const foot = sheet.el.querySelector('.sheet-foot');
    if (foot) foot.remove();
    const bar = document.createElement('div');
    bar.className = 'sheet-foot';
    bar.innerHTML = `<button class="btn btn-primary grow" data-save>Speichern & hinzufügen</button>`;
    sheet.el.appendChild(bar);

    bar.querySelector('[data-save]').addEventListener('click', () => {
      const name = panel.querySelector('#c-name').value.trim();
      const kcal = Number(panel.querySelector('#c-kcal').value.replace(',', '.'));
      if (!name) return toast('Bitte einen Namen eingeben', 'err');
      if (!(kcal >= 0) || !kcal) return toast('Bitte Kalorien pro 100 g angeben', 'err');

      const grams = Number(panel.querySelector('#c-pg').value.replace(',', '.')) || 100;
      const food = customFoodFromInput({
        name,
        kcal,
        protein: panel.querySelector('#c-p').value.replace(',', '.'),
        carbs: panel.querySelector('#c-c').value.replace(',', '.'),
        fat: panel.querySelector('#c-f').value.replace(',', '.'),
        portionLabel: panel.querySelector('#c-pl').value,
        portionGrams: panel.querySelector('#c-pg').value,
      });

      store.set((s) => { s.customFoods.push(food); }, 'customFoods');
      addEntries(state.dateKey, state.meal, [{
        name: food.name,
        grams,
        per100: food.per100,
        source: 'custom',
        emoji: '✏️',
      }]);
      rememberFood(food);
      toast('Eigenes Lebensmittel gespeichert');
      sheet.close();
    });
  }

  setMode('search');
}

/* ============================================================
   Schnell eintragen (Rough Log)
   ============================================================ */
export function openQuickLogSheet({ dateKey = todayKey(), meal = 'lunch' } = {}) {
  const targets = store.get().targets;
  const options = [
    { id: 'light', label: 'Leicht', sub: 'Kleine Portion', factor: 0.2 },
    { id: 'normal', label: 'Normal', sub: 'Normale Portion', factor: 0.3 },
    { id: 'hearty', label: 'Reichhaltig', sub: 'Große Portion', factor: 0.4 },
  ];
  const state = { meal, size: 'normal' };
  const current = () => options.find((o) => o.id === state.size) || options[1];
  const estimate = (factor) => {
    const goal = targets.kcal || 1800;
    const kcal = Math.max(1, Math.round(goal * factor));
    const ratio = kcal / goal;
    const macro = (value) => Math.round((Number(value) || 0) * ratio * 10) / 10;
    return {
      kcal,
      protein: macro(targets.protein),
      carbs: macro(targets.carbs),
      fat: macro(targets.fat),
      fiber: macro(targets.fiber),
    };
  };

  const body = document.createElement('div');
  body.innerHTML = `
    <p class="small muted" style="margin-bottom:14px">Grobe Schätzung ohne Grammangaben. Die Werte richten sich nach deinem Tagesziel – du kannst den Eintrag später jederzeit bearbeiten.</p>
    <div class="field">
      <label for="ql-name">Was war es? <span class="muted">(optional)</span></label>
      <input class="input" id="ql-name" placeholder="z. B. Kantine, Pizza, Salat" autocomplete="off">
    </div>
    <div class="section-title" style="margin-top:4px">Portion</div>
    ${options.map((o) => {
      const e = estimate(o.factor);
      return `<button class="choice" data-size="${o.id}" aria-pressed="${o.id === state.size}">
        <span class="ico">${o.id === 'light' ? '◔' : o.id === 'hearty' ? '●' : '◑'}</span>
        <span class="grow"><span class="t">${o.label}</span><span class="s">${o.sub} · ca. ${fmt(e.kcal)} kcal</span></span>
        <span class="dot"></span>
      </button>`;
    }).join('')}
    <div class="hstack" id="ql-macros" style="gap:8px;margin-top:12px;flex-wrap:wrap"></div>
    <div class="section-title">Mahlzeit</div>
    <div class="chips">
      ${MEALS.map((m) => `<button class="chip" data-meal="${m.id}" aria-pressed="${m.id === state.meal}">${m.icon} ${m.label}</button>`).join('')}
    </div>
  `;

  const sheet = openSheet({
    title: 'Schnell eintragen',
    subtitle: mealLabel(state.meal),
    body,
    footer: '<button class="btn btn-primary btn-block" data-add>Schnell eintragen</button>',
    tall: true,
  });

  const macros = body.querySelector('#ql-macros');
  const paint = () => {
    const e = estimate(current().factor);
    macros.innerHTML = `
      <span class="pill">P ${fmt(e.protein, 1)} g</span>
      <span class="pill neutral">KH ${fmt(e.carbs, 1)} g</span>
      <span class="pill neutral">F ${fmt(e.fat, 1)} g</span>`;
    const add = sheet.foot?.querySelector('[data-add]');
    if (add) add.textContent = `Eintragen · ca. ${fmt(e.kcal)} kcal`;
  };
  paint();

  body.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
    state.size = b.dataset.size;
    body.querySelectorAll('[data-size]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    paint();
    haptic();
  }));
  body.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => {
    state.meal = b.dataset.meal;
    body.querySelectorAll('[data-meal]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const sub = sheet.el.querySelector('.sheet-head .small');
    if (sub) sub.textContent = mealLabel(state.meal);
  }));

  sheet.foot?.querySelector('[data-add]')?.addEventListener('click', () => {
    const option = current();
    const e = estimate(option.factor);
    const nameInput = body.querySelector('#ql-name');
    const name = nameInput.value.trim().slice(0, 80) || `${tr('Schnell')} · ${tr(option.label)}`;
    addEntries(dateKey, state.meal, [{
      name,
      grams: 100,
      per100: { kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, fiber: e.fiber },
      source: 'rough',
      emoji: '≈',
    }]);
    haptic(15);
    toast('Schnell-Eintrag hinzugefügt');
    sheet.close();
  });
}

/* ============================================================
   KI-Sheet (Foto / Text)
   ============================================================ */
export function openAiSheet({ dateKey = todayKey(), meal = 'lunch' } = {}) {
  const settings = store.get().settings;
  const state = {
    dateKey,
    meal,
    mode: 'photo',
    imageBase64: '',
    previewUrl: '',
    text: '',
    hint: '',
    items: [],
    notes: '',
    demo: false,
    loading: false,
    error: '',
  };

  const body = document.createElement('div');
  const sheet = openSheet({
    title: 'KI-Tracking',
    subtitle: 'Foto oder Beschreibung – Kalorien werden geschätzt',
    body,
    tall: true,
  });

  const paint = () => {
    body.innerHTML = `
      <div class="seg" style="margin-bottom:16px">
        <button type="button" data-mode="photo" aria-selected="${state.mode === 'photo'}">📷 Foto</button>
        <button type="button" data-mode="text" aria-selected="${state.mode === 'text'}">📝 Text</button>
      </div>

      ${state.mode === 'photo' ? `
        <input type="file" id="ai-file" accept="image/*" capture="environment" hidden>
        <input type="file" id="ai-gallery" accept="image/*" hidden>
        <div class="dz ${state.previewUrl ? 'has-img' : ''}" id="ai-dz">
          ${state.previewUrl
            ? `<img src="${state.previewUrl}" alt="Mahlzeit">
               <span class="change">Foto ändern</span>`
            : `<span class="ico">📸</span><b style="color:var(--text)">Foto aufnehmen</b><span>Kamera öffnen</span>`}
        </div>
        <button class="btn btn-sm btn-block" data-gallery style="margin-top:8px">Bild aus Galerie wählen</button>
      ` : `
        <div class="field">
          <label for="ai-text">Was hast du gegessen?</label>
          <textarea class="input" id="ai-text" placeholder="z. B. 2 Scheiben Vollkornbrot mit Butter, 1 Ei und ein Cappuccino">${esc(state.text)}</textarea>
        </div>
        <div class="chips" style="margin-bottom:6px">
          ${['Müsli mit Milch', 'Hähnchen mit Reis und Brokkoli', 'Döner Kebab', 'Latte macchiato'].map((s) => `<button class="chip" data-example="${s}">${s}</button>`).join('')}
        </div>
      `}

      <div class="field" style="margin-top:14px">
        <label for="ai-hint">Zusatzinfo <span class="muted">(optional)</span></label>
        <input class="input" id="ai-hint" placeholder="z. B. große Portion, mit Sauce" value="${esc(state.hint)}">
      </div>

      ${state.error ? `<div class="ai-note">${esc(state.error)}</div>` : ''}

      <div id="ai-result"></div>
    `;

    // Modus
    body.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      paint();
    }));

    // Foto
    const file = body.querySelector('#ai-file');
    const gallery = body.querySelector('#ai-gallery');
    const handleFile = async (input) => {
      const f = input?.files?.[0];
      if (!f) return;
      try {
        const img = await prepareImage(f, 1024, 0.82);
        state.imageBase64 = img.base64;
        state.previewUrl = img.dataUrl;
        paint();
      } catch (err) {
        toast(err.message, 'err');
      }
    };
    body.querySelector('#ai-dz')?.addEventListener('click', () => file?.click());
    body.querySelector('[data-gallery]')?.addEventListener('click', () => gallery?.click());
    file?.addEventListener('change', () => handleFile(file));
    gallery?.addEventListener('change', () => handleFile(gallery));

    // Text
    body.querySelector('#ai-text')?.addEventListener('input', (e) => { state.text = e.target.value; });
    body.querySelectorAll('[data-example]').forEach((b) => b.addEventListener('click', () => {
      state.text = b.dataset.example;
      paint();
    }));

    // Zusatzinfo
    body.querySelector('#ai-hint').addEventListener('input', (e) => { state.hint = e.target.value; });

    // Ergebnis
    const result = body.querySelector('#ai-result');
    if (state.loading) {
      result.innerHTML = `<div class="card center" style="padding:30px 16px">
        <div class="spinner" style="margin:0 auto 10px;color:var(--accent)"></div>
        <div class="small muted">${state.mode === 'photo' ? 'Foto wird analysiert…' : 'Mahlzeit wird geschätzt…'}</div>
      </div>`;
    } else if (state.items.length) {
      result.innerHTML = resultsHtml(state);
      wireResults(result);
    } else {
      result.innerHTML = `<div class="ai-note">
        <span>💡</span><span>Die KI schätzt Portionsgrößen. Prüfe die Werte und passe die Grammzahl an – besonders bei Saucen und Öl.</span>
      </div>`;
    }

    wireFooter();
  };

  const wireFooter = () => {
    const foot = sheet.el.querySelector('.sheet-foot');
    if (foot) foot.remove();

    if (state.items.length) {
      const selected = state.items.filter((i) => i.selected !== false);
      const total = selected.reduce((a, i) => a + kcalOf(i), 0);
      const bar = document.createElement('div');
      bar.className = 'sheet-foot';
      bar.innerHTML = `<button class="btn btn-primary grow" data-accept>${selected.length} Einträge · ${fmt(total)} kcal übernehmen</button>`;
      sheet.el.appendChild(bar);

      bar.querySelector('[data-accept]').addEventListener('click', () => {
        const items = state.items.filter((i) => i.selected !== false).map((i) => ({
          name: i.name,
          grams: i.grams,
          per100: i.per100,
          source: state.demo ? 'demo' : 'ai',
          emoji: '📷',
        }));
        if (!items.length) return toast('Keine Einträge ausgewählt', 'err');
        items.forEach((item) => rememberFood({ ...item, source: state.demo ? 'demo' : 'ai', emoji: '📷' }));
        addEntries(state.dateKey, state.meal, items);
        haptic(15);
        toast(`${items.length} Einträge hinzugefügt`);
        sheet.close();
      });
      return;
    }

    const bar = document.createElement('div');
    bar.className = 'sheet-foot';
    bar.innerHTML = `
      <button class="btn btn-primary grow" data-estimate ${state.loading ? 'disabled' : ''}>
        ${state.loading ? '<span class="spinner"></span> Schätze…' : '✨ Kalorien schätzen'}
      </button>`;
    sheet.el.appendChild(bar);

    bar.querySelector('[data-estimate]').addEventListener('click', async () => {
      if (state.mode === 'photo' && !state.imageBase64) {
        state.error = 'Bitte zuerst ein Foto aufnehmen oder aus der Galerie wählen.';
        paint();
        return;
      }
      if (state.mode === 'text' && !state.text.trim()) {
        state.error = 'Bitte beschreiben, was du gegessen hast.';
        paint();
        return;
      }

      state.loading = true;
      state.error = '';
      paint();

      try {
        const res = await estimate({
          text: state.mode === 'text' ? state.text.trim() : '',
          imageBase64: state.mode === 'photo' ? state.imageBase64 : '',
          imageMime: 'image/jpeg',
          settings: store.get().settings,
          mealHint: mealLabel(state.meal),
        });
        state.items = res.items.map((i) => ({ ...i, selected: true }));
        state.notes = res.notes;
        state.demo = Boolean(res.demo);
      } catch (err) {
        state.error = err.message || 'Schätzung fehlgeschlagen.';
      } finally {
        state.loading = false;
        paint();
      }
    });
  };

  const wireResults = (result) => {
    result.querySelectorAll('[data-item]').forEach((row) => {
      const idx = Number(row.dataset.item);
      const item = state.items[idx];
      const gramsInput = row.querySelector('[data-grams]');
      gramsInput.addEventListener('input', () => {
        item.grams = Math.max(1, Number(String(gramsInput.value).replace(',', '.')) || 1);
        const kcalEl = row.querySelector('[data-kcal]');
        if (kcalEl) kcalEl.textContent = fmt(kcalOf(item)) + ' kcal';
        const bar = sheet.el.querySelector('.sheet-foot [data-accept]');
        if (bar) {
          const selected = state.items.filter((i) => i.selected !== false);
          bar.textContent = `${selected.length} Einträge · ${fmt(selected.reduce((a, i) => a + kcalOf(i), 0))} kcal übernehmen`;
        }
      });
      row.querySelector('[data-toggle]').addEventListener('click', () => {
        item.selected = item.selected === false;
        paint();
      });
    });

    result.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => {
      state.meal = b.dataset.meal;
      paint();
    }));
  };

  paint();
}

function kcalOf(food) {
  return Math.round((food.per100.kcal * food.grams) / 100);
}

function resultsHtml(state) {
  const total = state.items.filter((i) => i.selected !== false).reduce((a, i) => a + kcalOf(i), 0);
  return `
    <div class="hstack" style="justify-content:space-between;margin:18px 2px 6px">
      <b style="font-size:15px">Erkannt</b>
      <span class="pill">${fmt(total)} kcal</span>
    </div>
    ${state.demo ? `<div class="ai-note" style="margin-top:0;margin-bottom:10px"><span>🧪</span><span>Demo-Modus: Werte aus der lokalen Datenbank. Für echte Foto-Erkennung einen Gemini-Key im Profil hinterlegen.</span></div>` : ''}
    <div class="card" style="padding:4px 14px">
      ${state.items.map((item, i) => `
        <div class="ai-item ${item.selected === false ? 'off' : ''}">
          <div>
            <div class="nm">${esc(item.name)} ${item.confidence ? `<span class="pill ${item.confidence === 'niedrig' ? 'warn' : 'neutral'}">${esc(item.confidence)}</span>` : ''}</div>
            <div class="mac">${fmt(item.per100.protein, 1)} P · ${fmt(item.per100.carbs, 1)} KH · ${fmt(item.per100.fat, 1)} F pro 100 g · <b data-kcal>${fmt(kcalOf(item))} kcal</b></div>
          </div>
          <div class="hstack" style="gap:6px">
            <div class="grams"><input class="input" data-grams type="number" inputmode="decimal" value="${item.grams}"></div>
            <button class="icon-btn" data-toggle aria-label="Auswahl umschalten" style="width:34px;height:34px;border-radius:10px">${item.selected === false ? icon('plus') : icon('check')}</button>
          </div>
        </div>`).join('')}
    </div>
    ${state.notes ? `<div class="ai-note"><span>🤖</span><span>${esc(state.notes)}</span></div>` : ''}
    <div class="section-title">Mahlzeit</div>
    <div class="chips">
      ${MEALS.map((m) => `<button class="chip" data-meal="${m.id}" aria-pressed="${m.id === state.meal}">${m.icon} ${m.label}</button>`).join('')}
    </div>`;
}
