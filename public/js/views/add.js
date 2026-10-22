/* ============================================================
   Kaloriq – Hinzufügen (Suche, Barcode, Eigene, KI)
   ============================================================ */
import { store, addEntries, todayKey, MEALS } from '../store.js';
import { searchLocal, searchRemote, lookupBarcode, foodEmoji, customFoodFromInput } from '../foods.js';
import { estimate, prepareImage, detectProxy } from '../ai.js';
import { esc, fmt, icon, toast, openSheet, haptic } from '../ui.js';

const mealLabel = (id) => MEALS.find((m) => m.id === id)?.label || 'Mahlzeit';

// Open Food Facts erlaubt nur wenige Suchanfragen pro Minute → Ergebnisse cachen.
const remoteCache = new Map();
let remoteCooldownUntil = 0;

/* ============================================================
   Hinzufügen-Sheet
   ============================================================ */
export function openAddSheet({ dateKey = todayKey(), meal = 'breakfast' } = {}) {
  const state = { dateKey, meal, mode: 'search' };

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
  });

  const panel = body.querySelector('[data-panel]');
  const segs = Array.from(body.querySelectorAll('[data-mode]'));

  const setMode = (mode) => {
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
      <div id="food-results"></div>
      <div id="food-remote" style="margin-top:12px"></div>`;

    const input = panel.querySelector('#food-q');
    const results = panel.querySelector('#food-results');
    const remoteBox = panel.querySelector('#food-remote');
    let timer = null;

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
    panel.innerHTML = `
      <button class="btn btn-ghost btn-sm" data-back style="margin:-6px 0 10px -8px">${icon('left')} Zurück</button>
      <div class="card" style="padding:16px">
        <div class="hstack" style="align-items:flex-start">
          <span class="avatar" style="width:46px;height:46px;border-radius:14px;font-size:20px">${food.image ? `<img src="${esc(food.image)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px">` : foodEmoji(food)}</span>
          <div class="grow">
            <div class="t" style="font-weight:680;font-size:16px">${esc(food.name)}</div>
            <div class="s tiny muted">${food.brand ? esc(food.brand) + ' · ' : ''}${fmt(food.per100.kcal)} kcal pro 100 g</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="field" style="margin-bottom:10px">
          <label for="qty">Menge (g)</label>
          <input class="input" id="qty" type="number" inputmode="decimal" step="1" value="${defaultGrams}">
        </div>
        <div class="chips" style="margin-bottom:14px">
          ${[50, 100, 150, 200, 250].map((g) => `<button class="chip" data-q="${g}">${g} g</button>`).join('')}
          ${food.portion ? `<button class="chip on" data-q="${food.portion.grams}">${esc(food.portion.label)} (${fmt(food.portion.grams)} g)</button>` : ''}
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
    panel.querySelectorAll('[data-meal]').forEach((b) => b.addEventListener('click', () => {
      state.meal = b.dataset.meal;
      panel.querySelectorAll('[data-meal]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      sheet.el.querySelector('.sheet-head .small').textContent = mealLabel(state.meal);
    }));
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
      haptic(12);
      toast(`${food.name} hinzugefügt`);
      sheet.close();
    });
  }

  /* ---------- Barcode ---------- */
  function renderBarcode() {
    const supported = 'BarcodeDetector' in window;
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
      const value = String(code || input.value).trim();
      if (!value) return;
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

    panel.querySelector('[data-scan]')?.addEventListener('click', () => startScanner(out, doLookup));
  }

  async function startScanner(out, onCode) {
    out.innerHTML = `
      <div class="card" style="padding:10px;position:relative;overflow:hidden">
        <video id="scan-video" playsinline muted style="width:100%;border-radius:14px;background:#000;aspect-ratio:4/3;object-fit:cover"></video>
        <div style="position:absolute;inset:10px;border-radius:14px;pointer-events:none;border:2px solid rgba(255,255,255,.55)"></div>
        <button class="btn btn-sm btn-block" data-stop style="margin-top:8px">Abbrechen</button>
      </div>
      <p class="tiny muted center" style="margin-top:8px">Barcode in den Rahmen halten…</p>`;

    const video = out.querySelector('#scan-video');
    let stream = null;
    let raf = 0;
    let stopped = false;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      out.innerHTML = '';
    };
    out.querySelector('[data-stop]').addEventListener('click', stop);

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();

      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          if (codes?.length) {
            const raw = codes[0].rawValue;
            haptic(30);
            stopped = true;
            stream.getTracks().forEach((t) => t.stop());
            out.innerHTML = `<div class="pill">Code erkannt: ${esc(raw)}</div>`;
            onCode(raw);
            return;
          }
        } catch { /* Frame überspringen */ }
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      out.innerHTML = `<div class="ai-note">Kamera nicht verfügbar: ${esc(err.message)}. Bitte Nummer eingeben.</div>`;
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
      toast('Eigenes Lebensmittel gespeichert');
      sheet.close();
    });
  }

  setMode('search');
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
