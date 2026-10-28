/* ============================================================
   Kaloriq – Wochenplan & Einkaufsliste
   Rezepte auf Tage legen; daraus entsteht die Einkaufsliste.
   ============================================================ */
import {
  store, planFor, addPlanEntry, updatePlanEntry, removePlanEntry, todayKey,
  shoppingFor, setShoppingChecked, clearShoppingChecked,
  addShoppingExtra, toggleShoppingExtra, removeShoppingExtra,
} from '../store.js';
import {
  PLAN_MEALS, mealLabel, addDaysKey, weekStartKey, weekDays, weekLabel, dayLabel,
  isToday, collectShopping, shoppingText, formatGrams,
} from '../plan.js';
import { getRecipe, addRecipeToDiary, recipeTotals } from '../recipes.js';
import {
  esc, fmt, icon, toast, openSheet, haptic, copyText,
} from '../ui.js';
import { tr } from '../i18n.js';

let weekOffset = 0;
let tab = 'plan';

export function renderMealPlan(root) {
  const state = store.get();
  const recipes = Array.isArray(state.recipes) ? state.recipes : [];
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const start = addDaysKey(weekStartKey(), weekOffset * 7);
  const days = weekDays(start).map((key) => ({ key, slots: planFor(key) }));
  const today = todayKey();

  const shopping = shoppingFor(start);
  const list = collectShopping({
    days,
    recipesById: byId,
    checked: shopping.checked,
    extra: shopping.extra,
  });

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-back aria-label="${esc(tr('Zurück zum Tagebuch'))}">${icon('left')}</button>
      <div class="grow">
        <h1>${esc(tr('Wochenplan'))}</h1>
        <div class="sub">${esc(weekLabel(start))}${weekOffset === 0 ? ` · ${esc(tr('Diese Woche'))}` : ''}</div>
      </div>
      <button class="icon-btn" data-share aria-label="${esc(tr('Teilen'))}">${icon('share')}</button>
    </header>

    <div class="seg" role="tablist" aria-label="${esc(tr('Wochenplan und Einkauf'))}">
      <button role="tab" data-tab="plan" aria-selected="${tab === 'plan'}">${esc(tr('Wochenplan'))}</button>
      <button role="tab" data-tab="shopping" aria-selected="${tab === 'shopping'}">
        ${esc(tr('Einkauf'))}${list.total ? `<span class="seg-count">${list.total}</span>` : ''}
      </button>
    </div>

    <div class="datenav">
      <button class="icon-btn" data-prev aria-label="${esc(tr('Vorherige Woche'))}">${icon('left')}</button>
      <button class="day" data-this-week style="border:0;background:none;cursor:pointer">
        ${esc(weekLabel(start))}
        <small>${weekOffset === 0 ? esc(tr('Diese Woche')) : esc(tr('Tippen für diese Woche'))}</small>
      </button>
      <button class="icon-btn" data-next aria-label="${esc(tr('Nächste Woche'))}">${icon('right')}</button>
    </div>

    ${tab === 'plan' ? planMarkup(days, byId, today, recipes) : shoppingMarkup(list, start)}
  `;

  root.querySelector('[data-back]').addEventListener('click', () => { location.hash = '#/diary'; });
  root.querySelector('[data-prev]').addEventListener('click', () => { weekOffset -= 1; renderMealPlan(root); });
  root.querySelector('[data-next]').addEventListener('click', () => { weekOffset += 1; renderMealPlan(root); });
  root.querySelector('[data-this-week]').addEventListener('click', () => {
    if (weekOffset !== 0) { weekOffset = 0; renderMealPlan(root); }
  });
  root.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      tab = button.dataset.tab;
      renderMealPlan(root);
    });
  });
  root.querySelector('[data-share]')?.addEventListener('click', () => shareShopping(start, list.groups));
  root.querySelector('[data-recipes]')?.addEventListener('click', () => { location.hash = '#/recipes'; });

  if (tab === 'plan') {
    root.querySelectorAll('[data-add]').forEach((button) => {
      button.addEventListener('click', () => {
        const [dateKey, meal] = button.dataset.add.split('|');
        openRecipePicker(root, dateKey, meal);
      });
    });
    root.querySelectorAll('[data-edit]').forEach((button) => {
      button.addEventListener('click', () => {
        const [dateKey, meal, id] = button.dataset.edit.split('|');
        openPlanEntry(root, dateKey, meal, id);
      });
    });
  } else {
    root.querySelectorAll('[data-check]').forEach((row) => {
      const toggle = () => {
        const key = row.dataset.check;
        if (row.dataset.extra === '1') {
          toggleShoppingExtra(start, row.dataset.id);
        } else {
          setShoppingChecked(start, key, row.getAttribute('aria-checked') !== 'true');
        }
        haptic();
      };
      row.addEventListener('click', (event) => {
        if (event.target.closest('[data-del]')) return;
        toggle();
      });
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });
    root.querySelectorAll('[data-del]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        removeShoppingExtra(start, button.dataset.del);
        toast(tr('Artikel entfernt'));
      });
    });
    root.querySelector('[data-add-extra]')?.addEventListener('click', () => openExtraSheet(root, start));
    root.querySelector('[data-clear-checks]')?.addEventListener('click', () => {
      clearShoppingChecked(start);
      shoppingFor(start).extra.forEach((item) => {
        if (item.checked) toggleShoppingExtra(start, item.id);
      });
      toast(tr('Haken zurückgesetzt'));
    });
  }
}

/* ---------------- Plan ---------------- */

function planMarkup(days, byId, today, recipes) {
  if (!recipes.length) {
    return `
      <div class="empty" style="padding:38px 20px">
        <span class="emoji">🍲</span>
        <span>${esc(tr('Noch keine Rezepte'))}</span>
        <span class="tiny">${esc(tr('Lege zuerst ein Rezept an – daraus entstehen Plan und Einkaufsliste.'))}</span>
        <div class="chips" style="justify-content:center;margin-top:14px">
          <button class="btn btn-primary btn-sm" data-recipes>${icon('bowl')} ${esc(tr('Rezepte öffnen'))}</button>
        </div>
      </div>`;
  }

  return `<div class="plan-days">${days.map((day) => {
    const kcal = PLAN_MEALS.reduce((sum, meal) => sum + (day.slots[meal] || []).reduce((acc, entry) => {
      const recipe = byId.get(entry.recipeId);
      if (!recipe) return acc;
      return acc + recipeTotals(recipe).perServing.kcal * entry.portions;
    }, 0), 0);

    return `
      <section class="card plan-day${day.key === today ? ' today' : ''}">
        <header class="plan-day-head">
          <span class="plan-day-label">${esc(dayLabel(day.key))}</span>
          ${day.key === today ? `<span class="pill">${esc(tr('Heute'))}</span>` : ''}
          <span class="plan-day-kcal">${kcal ? `${fmt(Math.round(kcal))} kcal` : ''}</span>
        </header>
        ${PLAN_MEALS.map((meal) => {
          const entries = day.slots[meal] || [];
          return `
            <div class="plan-meal">
              <div class="plan-meal-head">
                <span>${esc(tr(mealLabel(meal)))}</span>
                ${entries.length ? `<button class="plan-add" type="button" data-add="${day.key}|${meal}" aria-label="${esc(tr('Rezept hinzufügen'))}">${icon('plus')}</button>` : ''}
              </div>
              ${entries.length ? entries.map((entry) => {
                const recipe = byId.get(entry.recipeId);
                if (!recipe) return '';
                const entryKcal = Math.round(recipeTotals(recipe).perServing.kcal * entry.portions);
                return `
                  <button class="plan-item" type="button" data-edit="${day.key}|${meal}|${entry.id}">
                    <span class="plan-emoji">${esc(recipe.emoji || '🍲')}</span>
                    <span class="grow">
                      <span class="t">${esc(recipe.title)}</span>
                      <span class="s">${fmt(entry.portions, entry.portions % 1 ? 1 : 0)} ${esc(tr(entry.portions === 1 ? 'Portion' : 'Portionen'))} · ${fmt(entryKcal)} kcal</span>
                    </span>
                  </button>`;
              }).join('') : `<button class="plan-slot" type="button" data-add="${day.key}|${meal}">${icon('plus')} ${esc(tr('Rezept planen'))}</button>`}
            </div>`;
        }).join('')}
      </section>`;
  }).join('')}</div>`;
}

function openRecipePicker(root, dateKey, meal) {
  const recipes = store.get().recipes || [];
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="search-wrap" style="margin-bottom:12px">
      ${icon('search')}
      <input class="input" data-pick-search type="search" placeholder="${esc(tr('Rezept suchen…'))}" autocomplete="off">
    </div>
    <div data-pick-list></div>`;
  const sheet = openSheet({
    title: tr('Rezept wählen'),
    subtitle: `${tr(mealLabel(meal))} · ${dayLabel(dateKey)}`,
    body,
    tall: true,
  });

  const list = body.querySelector('[data-pick-list]');
  const search = body.querySelector('[data-pick-search]');

  const paint = () => {
    const query = search.value.trim().toLowerCase();
    const hits = recipes.filter((recipe) => !query || recipe.title.toLowerCase().includes(query));
    list.innerHTML = hits.length
      ? `<section class="card flush rows">${hits.map((recipe) => {
        const totals = recipeTotals(recipe);
        return `
          <button class="row" type="button" data-pick="${esc(recipe.id)}">
            <span class="row-thumb">${esc(recipe.emoji || '🍲')}</span>
            <span class="grow">
              <span class="t">${esc(recipe.title)}</span>
              <span class="s">${fmt(totals.perServing.kcal)} kcal / ${esc(tr('Portion'))}</span>
            </span>
            ${icon('plus', 'chev')}
          </button>`;
      }).join('')}</section>`
      : `<p class="small muted">${esc(tr('Keine Rezepte gefunden'))}</p>`;

    list.querySelectorAll('[data-pick]').forEach((button) => {
      button.addEventListener('click', () => {
        const picked = recipes.find((recipe) => recipe.id === button.dataset.pick);
        const portions = Math.max(1, Number(picked?.servings) || 1);
        addPlanEntry(dateKey, meal, button.dataset.pick, portions);
        sheet.close();
        haptic();
        toast(tr('Zum Plan hinzugefügt'));
        renderMealPlan(root);
      });
    });
  };

  paint();
  search.addEventListener('input', paint);
  setTimeout(() => search.focus(), 250);
}

function openPlanEntry(root, dateKey, meal, entryId) {
  const entry = (planFor(dateKey)[meal] || []).find((item) => item.id === entryId);
  if (!entry) return;
  const recipe = getRecipe(entry.recipeId);
  if (!recipe) {
    toast(tr('Rezept nicht gefunden'), 'err');
    return;
  }
  const totals = recipeTotals(recipe);
  let portions = entry.portions;

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="card" style="padding:14px;margin-bottom:14px">
      <div class="hstack" style="gap:12px">
        <span class="row-thumb" style="width:44px;height:44px;font-size:20px">${esc(recipe.emoji || '🍲')}</span>
        <span class="grow">
          <span class="t" style="font-weight:650">${esc(recipe.title)}</span>
          <span class="s" style="font-size:11.5px;color:var(--muted)">${fmt(totals.perServing.kcal)} kcal / ${esc(tr('Portion'))}</span>
        </span>
      </div>
    </div>
    <div class="field">
      <label for="plan-portions">${esc(tr('Portionen'))}</label>
      <input class="input" id="plan-portions" type="text" inputmode="decimal" value="${esc(String(portions))}">
      <div class="chips" style="margin-top:10px">
        ${[0.5, 1, 1.5, 2, 3].map((n) => `<button type="button" class="chip" data-portion="${n}">${fmt(n, n % 1 ? 1 : 0)}</button>`).join('')}
      </div>
    </div>
    <p class="tiny muted" data-plan-kcal></p>`;

  const input = body.querySelector('#plan-portions');
  const kcalEl = body.querySelector('[data-plan-kcal]');
  const paint = () => {
    const value = Math.max(0.1, Number(String(input.value).replace(',', '.')) || 1);
    portions = Math.round(value * 10) / 10;
    kcalEl.textContent = `≈ ${fmt(Math.round(totals.perServing.kcal * portions))} kcal · ${formatGrams(totals.servingGrams * portions)}`;
  };

  const sheet = openSheet({
    title: tr('Geplantes Rezept'),
    subtitle: `${tr(mealLabel(meal))} · ${dayLabel(dateKey)}`,
    body,
    footer: `
      <button class="btn btn-danger" type="button" data-del>${esc(tr('Entfernen'))}</button>
      <button class="btn btn-primary grow" type="button" data-diary>${esc(tr('Ins Tagebuch'))}</button>`,
  });

  input.addEventListener('input', paint);
  body.querySelectorAll('[data-portion]').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = button.dataset.portion;
      paint();
      haptic();
    });
  });
  paint();

  sheet.foot?.querySelector('[data-del]')?.addEventListener('click', () => {
    removePlanEntry(dateKey, meal, entryId);
    sheet.close();
    toast(tr('Aus dem Plan entfernt'));
    renderMealPlan(root);
  });

  sheet.foot?.querySelector('[data-diary]')?.addEventListener('click', () => {
    updatePlanEntry(dateKey, meal, entryId, { portions });
    addRecipeToDiary(dateKey, meal, recipe, portions);
    sheet.close();
    haptic();
    toast(tr('Ins Tagebuch übernommen'));
  });
}

/* ---------------- Einkauf ---------------- */

function shoppingMarkup(list, start) {
  const pct = list.total ? Math.round((list.done / list.total) * 100) : 0;

  return `
    <div class="card shop-summary">
      <div class="hstack" style="justify-content:space-between">
        <span class="small" style="font-weight:650">
          ${list.total ? `${list.done} ${esc(tr('von'))} ${list.total} ${esc(tr('erledigt'))}` : esc(tr('Noch nichts geplant'))}
        </span>
        <span class="tiny muted">${esc(weekLabel(start))}</span>
      </div>
      <div class="plan-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <i style="width:${pct}%"></i>
      </div>
      <div class="hstack" style="gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn btn-sm" type="button" data-add-extra>${icon('plus')} ${esc(tr('Artikel'))}</button>
        <button class="btn btn-sm" type="button" data-share>${icon('share')} ${esc(tr('Teilen'))}</button>
        ${list.done ? `<button class="btn btn-sm btn-ghost" type="button" data-clear-checks>${esc(tr('Haken löschen'))}</button>` : ''}
      </div>
    </div>

    ${list.groups.length ? list.groups.map((group) => `
      <div class="section-title">${esc(tr(group.label))}</div>
      <section class="card flush">
        ${group.items.map((item) => `
          <div class="row shop-row${item.checked ? ' done' : ''}" role="checkbox" tabindex="0"
            aria-checked="${item.checked}" data-check="${esc(item.key)}"
            ${item.extra ? `data-extra="1" data-id="${esc(item.extraId)}"` : ''}>
            <span class="shop-check" aria-hidden="true">${item.checked ? icon('check') : ''}</span>
            <span class="grow">
              <span class="t">${esc(item.name)}</span>
              ${item.amount ? `<span class="s">${esc(item.amount)}</span>` : ''}
            </span>
            ${item.extra ? `<button class="icon-btn shop-del" type="button" data-del="${esc(item.extraId)}" aria-label="${esc(tr('Entfernen'))}">${icon('trash')}</button>` : ''}
          </div>`).join('')}
      </section>`).join('') : `
      <div class="empty" style="padding:34px 20px">
        <span class="emoji">🛒</span>
        <span>${esc(tr('Einkaufsliste ist leer'))}</span>
        <span class="tiny">${esc(tr('Plane Rezepte in der Woche – die Zutaten erscheinen hier automatisch.'))}</span>
      </div>`}

    <p class="tiny muted center" style="margin:16px 10px 6px">
      ${esc(tr('Zutaten werden aus den geplanten Rezepten zusammengerechnet. Haken bleiben pro Woche gespeichert.'))}
    </p>`;
}

async function shareShopping(start, groups) {
  const text = shoppingText({ startKey: start, groups });
  try {
    if (navigator.share) {
      await navigator.share({ title: tr('Einkaufsliste'), text });
      return;
    }
    await copyText(text);
    toast(tr('Liste kopiert'));
  } catch (err) {
    if (err?.name === 'AbortError') return;
    try {
      await copyText(text);
      toast(tr('Liste kopiert'));
    } catch {
      toast(tr('Teilen nicht möglich'), 'err');
    }
  }
}

function openExtraSheet(root, start) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="extra-name">${esc(tr('Artikel'))}</label>
      <input class="input" id="extra-name" placeholder="${esc(tr('z. B. Spülmittel'))}" autocomplete="off">
    </div>
    <div class="field">
      <label for="extra-amount">${esc(tr('Menge (optional)'))}</label>
      <input class="input" id="extra-amount" placeholder="${esc(tr('z. B. 2 Packungen'))}" autocomplete="off">
    </div>`;
  const sheet = openSheet({
    title: tr('Artikel hinzufügen'),
    body,
    footer: `<button class="btn btn-primary btn-block" type="button" data-save>${esc(tr('Hinzufügen'))}</button>`,
  });
  const name = body.querySelector('#extra-name');
  const amount = body.querySelector('#extra-amount');
  setTimeout(() => name.focus(), 250);

  const add = () => {
    const item = addShoppingExtra(start, { name: name.value, amount: amount.value });
    if (!item) {
      toast(tr('Bitte einen Artikel eingeben'), 'err');
      name.focus();
      return;
    }
    sheet.close();
    toast(tr('Artikel hinzugefügt'));
    renderMealPlan(root);
  };

  sheet.foot?.querySelector('[data-save]')?.addEventListener('click', add);
  name.addEventListener('keydown', (event) => { if (event.key === 'Enter') add(); });
}
