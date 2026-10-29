/* ============================================================
   Kaloriq – Rezeptverwaltung
   Liste, Detail, Editor, Zutatenauswahl, Tagebuch-Import und JSON.
   ============================================================ */
import { store, todayKey, MEALS } from '../store.js';
import {
  esc, fmt, icon, toast, openSheet, confirmDialog, downloadFile, haptic,
} from '../ui.js';
import { searchLocal, LOCAL_FOODS } from '../foods.js';
import {
  addRecipeToDiary, deleteRecipe, exportRecipesJson, getRecipe, mergeRecipes,
  parseRecipeFile, recipeTotals, saveRecipe, searchRecipes, toNumber, fetchRecipeFromUrl,
} from '../recipes.js';

let recipeQuery = '';

const COMMON_FOOD_NAMES = [
  'Vollkornbrot', 'Haferflocken', 'Nudeln, gekocht', 'Reis, gekocht',
  'Hähnchenbrust', 'Lachs', 'Ei (M)', 'Magerquark', 'Milch 3,5 %',
  'Banane', 'Apfel', 'Brokkoli', 'Tomate', 'Avocado', 'Olivenöl', 'Mandeln',
];
const COMMON_FOODS = COMMON_FOOD_NAMES
  .map((name) => LOCAL_FOODS.find((food) => food.name === name))
  .filter(Boolean);

export function renderRecipes(root) {
  const all = store.get().recipes || [];
  const countText = all.length === 1 ? '1 Rezept' : `${all.length} Rezepte`;

  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-back aria-label="Zurück zum Tagebuch">${icon('left')}</button>
      <div class="grow">
        <h1>Rezepte</h1>
        <div class="sub">${countText} · lokal gespeichert</div>
      </div>
      <button class="icon-btn" data-plan aria-label="Wochenplan">${icon('calendar')}</button>
      <button class="icon-btn" data-import-url aria-label="URL importieren">${icon('link')}</button>
      <button class="icon-btn" data-import aria-label="Rezepte importieren">${icon('upload')}</button>
      <button class="icon-btn" data-export aria-label="Alle Rezepte exportieren">${icon('download')}</button>
      <button class="icon-btn" data-new aria-label="Neues Rezept">${icon('plus')}</button>
    </header>

    <div class="search-wrap" style="margin-bottom:12px">
      ${icon('search')}
      <input class="input" data-recipe-search type="search" value="${esc(recipeQuery)}"
        placeholder="Rezept suchen…" autocomplete="off" enterkeyhint="search">
    </div>

    <div data-list></div>

    ${all.length ? `<p class="tiny muted center" style="margin:18px 10px 8px">
      Rezepte bleiben lokal auf diesem Gerät. Exportiere sie als JSON, um sie zu teilen oder zu sichern.
    </p>` : ''}
  `;

  const list = root.querySelector('[data-list]');
  const search = root.querySelector('[data-recipe-search]');

  const paintList = () => {
    const recipes = searchRecipes(recipeQuery);
    if (!all.length) {
      list.innerHTML = `
        <div class="empty" style="padding:38px 20px">
          <span class="emoji">🍲</span>
          <span>Noch keine Rezepte</span>
          <span class="tiny">Lege dein erstes Rezept an oder importiere eine JSON-Datei.</span>
          <div class="chips" style="justify-content:center;margin-top:14px">
            <button class="btn btn-primary btn-sm" data-empty-new>${icon('plus')} Rezept anlegen</button>
            <button class="btn btn-sm" data-empty-url>${icon('link')} Von URL importieren</button>
            <button class="btn btn-sm" data-empty-import>${icon('upload')} JSON importieren</button>
          </div>
        </div>`;
      bindEmptyActions(list);
      return;
    }
    if (!recipes.length) {
      list.innerHTML = `
        <div class="empty">
          <span class="emoji">🔎</span>
          <span>Keine Rezepte gefunden</span>
          <span class="tiny">Andere Suche probieren.</span>
        </div>`;
      return;
    }
    list.innerHTML = `<section class="card flush rows">${recipes.map(recipeRow).join('')}</section>`;
    list.querySelectorAll('[data-recipe]').forEach((button) => {
      button.addEventListener('click', () => {
        haptic();
        openRecipeDetail(button.dataset.recipe);
      });
    });
  };

  root.querySelector('[data-back]').addEventListener('click', () => {
    location.hash = '#/diary';
  });
  root.querySelector('[data-new]').addEventListener('click', () => openRecipeEditor());
  root.querySelector('[data-plan]')?.addEventListener('click', () => {
    location.hash = '#/plan';
  });
  root.querySelector('[data-import-url]').addEventListener('click', importFromUrl);
  root.querySelector('[data-export]').addEventListener('click', exportAll);
  root.querySelector('[data-import]').addEventListener('click', importRecipes);
  search.addEventListener('input', () => {
    recipeQuery = search.value;
    paintList();
  });
  paintList();
}

function bindEmptyActions(scope) {
  scope.querySelector('[data-empty-new]')?.addEventListener('click', () => openRecipeEditor());
  scope.querySelector('[data-empty-url]')?.addEventListener('click', importFromUrl);
  scope.querySelector('[data-empty-import]')?.addEventListener('click', importRecipes);
}

function recipeRow(recipe) {
  const totals = recipeTotals(recipe);
  return `
    <button class="row" data-recipe="${esc(recipe.id)}">
      <span class="row-thumb">${esc(recipe.emoji || '🍲')}</span>
      <span class="grow">
        <span class="t">${esc(recipe.title)}</span>
        <span class="s">${fmt(totals.perServing.kcal)} kcal / Portion · P ${fmt(totals.perServing.protein)} g · ${servingsText(recipe.servings)}</span>
      </span>
      <span class="v">${fmt(totals.perServing.kcal)}<small> kcal</small></span>
    </button>`;
}

function openRecipeDetail(id) {
  const recipe = getRecipe(id);
  if (!recipe) {
    toast('Rezept nicht gefunden', 'err');
    return;
  }
  const totals = recipeTotals(recipe);
  const tagList = (recipe.tags || []).filter(Boolean);
  const meta = [
    servingsText(recipe.servings),
    recipe.minutes ? `${recipe.minutes} Min.` : '',
  ].filter(Boolean).join(' · ');

  const ingredients = recipe.ingredients.map((ing) => {
    const kcal = Math.round((toNumber(ing.per100?.kcal) || 0) * toNumber(ing.grams) / 100);
    return `
      <div class="row static">
        <span class="grow">
          <span class="t">${esc(ing.name)}</span>
          <span class="s">${fmt(ing.grams)} g · ${fmt(kcal)} kcal</span>
        </span>
      </div>`;
  }).join('');

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="stat-grid">
      ${stat('Kalorien', fmt(totals.perServing.kcal), 'kcal')}
      ${stat('Protein', fmt(totals.perServing.protein), 'g')}
      ${stat('Kohlenhydrate', fmt(totals.perServing.carbs), 'g')}
      ${stat('Fett', fmt(totals.perServing.fat), 'g')}
    </div>
    <div class="hstack" style="justify-content:space-between;margin-top:10px">
      <span class="tiny muted">Gesamt ${fmt(totals.totalGrams)} g</span>
      <span class="tiny muted">Portion ca. ${fmt(totals.servingGrams)} g</span>
    </div>
    ${tagList.length ? `<div class="chips" style="margin-top:12px">${tagList.map((tag) => `<span class="pill neutral">${esc(tag)}</span>`).join('')}</div>` : ''}

    <div class="section-title">Zutaten</div>
    <div class="card flush rows">
      ${ingredients || '<div class="empty-line">Noch keine Zutaten</div>'}
    </div>

    <div class="section-title">Zubereitung</div>
    ${recipe.steps
      ? `<p class="small" style="white-space:pre-wrap;line-height:1.55;color:var(--text-2);margin:0 4px">${esc(recipe.steps)}</p>`
      : '<p class="small muted" style="margin:0 4px">Keine Zubereitung hinterlegt.</p>'}
  `;

  const sheet = openSheet({
    title: `${recipe.emoji || '🍲'} ${recipe.title}`,
    subtitle: meta,
    body,
    footer: `
      <button class="btn btn-danger btn-icon-only" data-delete aria-label="Löschen">${icon('trash')}</button>
      <button class="btn grow" data-edit>${icon('pencil')} Bearbeiten</button>
      <button class="btn btn-primary grow" data-add>Zum Tagebuch</button>
    `,
  });

  sheet.foot.querySelector('[data-edit]').addEventListener('click', () => {
    sheet.close();
    openRecipeEditor(recipe);
  });

  sheet.foot.querySelector('[data-add]').addEventListener('click', () => {
    openRecipeAddSheet(recipe, sheet);
  });

  sheet.foot.querySelector('[data-delete]').addEventListener('click', async () => {
    sheet.close();
    const ok = await confirmDialog({
      title: 'Rezept löschen?',
      message: `"${recipe.title}" wird dauerhaft gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (ok) {
      deleteRecipe(recipe.id);
      toast('Rezept gelöscht');
    }
  });
}

function openRecipeAddSheet(recipe, parentSheet) {
  const totals = recipeTotals(recipe);
  const hour = new Date().getHours();
  let meal = hour < 11 ? 'breakfast' : hour < 15 ? 'lunch' : hour < 19 ? 'dinner' : 'snack';

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="recipe-date">Datum</label>
      <input class="input" id="recipe-date" type="date" value="${todayKey()}">
    </div>
    <div class="field">
      <label>Mahlzeit</label>
      <div class="chips" data-meal-chips>
        ${MEALS.map((item) => `<button type="button" class="chip" data-meal="${item.id}" aria-pressed="${item.id === meal}">${item.icon} ${item.label}</button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label for="recipe-portions">Portionen</label>
      <input class="input" id="recipe-portions" type="text" inputmode="decimal" value="1">
    </div>
    <div class="chips" style="margin-top:-4px">
      ${[0.5, 1, 1.5, 2].map((n) => `<button type="button" class="chip" data-portion="${n}">${fmt(n, n % 1 ? 1 : 0)}</button>`).join('')}
    </div>
    <div class="divider"></div>
    <div class="stat-grid" data-add-stats></div>
    <p class="tiny muted" data-add-grams style="margin-top:10px"></p>
  `;

  const sheet = openSheet({
    title: 'Zum Tagebuch hinzufügen',
    subtitle: recipe.title,
    body,
    footer: '<button class="btn btn-primary btn-block" data-add>Zum Tagebuch hinzufügen</button>',
  });

  const input = body.querySelector('#recipe-portions');
  const stats = body.querySelector('[data-add-stats]');
  const grams = body.querySelector('[data-add-grams]');

  const paint = () => {
    const portions = Math.max(0.1, toNumber(input.value, 1) || 1);
    stats.innerHTML = `
      ${stat('Kalorien', fmt(totals.perServing.kcal * portions), 'kcal')}
      ${stat('Protein', fmt(totals.perServing.protein * portions), 'g')}
      ${stat('Kohlenhydrate', fmt(totals.perServing.carbs * portions), 'g')}
      ${stat('Fett', fmt(totals.perServing.fat * portions), 'g')}`;
    grams.textContent = `${fmt(totals.servingGrams * portions)} g · ${servingsText(portions)}`;
  };
  paint();

  input.addEventListener('input', paint);
  body.querySelectorAll('[data-portion]').forEach((button) => button.addEventListener('click', () => {
    input.value = button.dataset.portion;
    paint();
    haptic();
  }));
  body.querySelectorAll('[data-meal]').forEach((button) => button.addEventListener('click', () => {
    meal = button.dataset.meal;
    body.querySelectorAll('[data-meal]').forEach((item) => {
      item.setAttribute('aria-pressed', String(item.dataset.meal === meal));
    });
    haptic();
  }));

  sheet.foot.querySelector('[data-add]').addEventListener('click', () => {
    const portions = toNumber(input.value);
    if (!Number.isFinite(portions) || portions <= 0) {
      toast('Bitte eine gültige Portionszahl eingeben', 'err');
      input.focus();
      return;
    }
    const date = body.querySelector('#recipe-date').value || todayKey();
    addRecipeToDiary(date, meal, recipe, portions);
    haptic();
    toast('Rezept zum Tagebuch hinzugefügt');
    sheet.close();
    parentSheet?.close();
  });
}

function openRecipeEditor(recipe = null) {
  const editing = Boolean(recipe?.id);
  const draft = recipe
    ? JSON.parse(JSON.stringify(recipe))
    : { id: '', title: '', servings: 2, minutes: 0, tags: [], ingredients: [], steps: '', emoji: '🍲' };
  draft.tags = Array.isArray(draft.tags) ? draft.tags : [];
  draft.ingredients = Array.isArray(draft.ingredients) ? draft.ingredients : [];

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="recipe-title">Titel</label>
      <input class="input" id="recipe-title" type="text" value="${esc(draft.title || '')}" placeholder="z. B. Hähnchen-Bowl" autocomplete="off">
    </div>
    <div class="hstack" style="align-items:flex-start;gap:10px">
      <div class="field grow">
        <label for="recipe-servings">Portionen</label>
        <input class="input" id="recipe-servings" type="text" inputmode="decimal" value="${esc(draft.servings ?? 2)}">
      </div>
      <div class="field grow">
        <label for="recipe-minutes">Zeit (Min.)</label>
        <input class="input" id="recipe-minutes" type="text" inputmode="numeric" value="${esc(draft.minutes || '')}" placeholder="20">
      </div>
    </div>
    <div class="field">
      <label for="recipe-tags">Tags</label>
      <input class="input" id="recipe-tags" type="text" value="${esc((draft.tags || []).join(', '))}" placeholder="high-protein, meal-prep" autocomplete="off">
    </div>

    <div class="section-title" style="margin-top:6px">Zutaten</div>
    <div class="vstack" data-ingredients></div>
    <button type="button" class="btn btn-sm btn-block" data-add-ingredient style="margin-top:10px">
      ${icon('plus')} Zutat hinzufügen
    </button>

    <div class="section-title">Zubereitung</div>
    <div class="field">
      <textarea class="input" id="recipe-steps" rows="5" placeholder="Schritte, Tipps, Notizen…">${esc(draft.steps || '')}</textarea>
    </div>
  `;

  const sheet = openSheet({
    title: editing ? 'Rezept bearbeiten' : 'Neues Rezept',
    subtitle: editing ? 'Änderungen nur lokal' : 'Zutaten und Nährwerte pro 100 g',
    body,
    tall: true,
    footer: `
      ${editing ? `<button class="btn btn-danger btn-icon-only" data-delete aria-label="Löschen">${icon('trash')}</button>` : ''}
      <button class="btn btn-primary grow" data-save>${icon('check')} Rezept speichern</button>
    `,
  });

  const ingredientsBox = body.querySelector('[data-ingredients]');

  const paintIngredients = () => {
    if (!draft.ingredients.length) {
      ingredientsBox.innerHTML = '<div class="empty" style="padding:20px"><span class="emoji">🥕</span><span>Noch keine Zutaten</span></div>';
      return;
    }
    ingredientsBox.innerHTML = draft.ingredients.map((ing, index) => {
      const per = ing.per100 || {};
      return `
        <div class="recipe-ing">
          <div class="hstack" style="gap:8px">
            <input class="input grow" data-ing-name="${index}" type="text" value="${esc(ing.name || '')}" placeholder="Zutat" autocomplete="off">
            <input class="input" style="width:74px" data-ing-grams="${index}" type="text" inputmode="decimal" value="${esc(ing.grams ?? '')}" placeholder="g" aria-label="Menge (g)">
            <button type="button" class="icon-btn" data-ing-pick="${index}" aria-label="Aus Datenbank wählen">${icon('search')}</button>
          </div>
          <div class="recipe-ing-macros">
            <label>kcal<input class="input" data-ing-kcal="${index}" type="text" inputmode="decimal" value="${esc(per.kcal ?? 0)}"></label>
            <label>P<input class="input" data-ing-protein="${index}" type="text" inputmode="decimal" value="${esc(per.protein ?? 0)}"></label>
            <label>KH<input class="input" data-ing-carbs="${index}" type="text" inputmode="decimal" value="${esc(per.carbs ?? 0)}"></label>
            <label>F<input class="input" data-ing-fat="${index}" type="text" inputmode="decimal" value="${esc(per.fat ?? 0)}"></label>
          </div>
          <div class="hstack" style="justify-content:space-between">
            <span class="tiny muted">Nährwerte pro 100 g</span>
            <button type="button" class="btn btn-sm btn-ghost" data-ing-del="${index}">${icon('trash')} Entfernen</button>
          </div>
        </div>`;
    }).join('');

    ingredientsBox.querySelectorAll('[data-ing-name]').forEach((input) => {
      input.addEventListener('input', () => {
        draft.ingredients[Number(input.dataset.ingName)].name = input.value;
      });
    });
    ingredientsBox.querySelectorAll('[data-ing-grams]').forEach((input) => {
      input.addEventListener('input', () => {
        draft.ingredients[Number(input.dataset.ingGrams)].grams = toNumber(input.value);
      });
    });
    ['kcal', 'protein', 'carbs', 'fat'].forEach((field) => {
      ingredientsBox.querySelectorAll(`[data-ing-${field}]`).forEach((input) => {
        input.addEventListener('input', () => {
          const ing = draft.ingredients[Number(input.dataset[`ing${field[0].toUpperCase()}${field.slice(1)}`])];
          if (!ing) return;
          ing.per100 = ing.per100 || {};
          ing.per100[field] = toNumber(input.value);
        });
      });
    });
    ingredientsBox.querySelectorAll('[data-ing-pick]').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number(button.dataset.ingPick);
        openIngredientPicker((pick) => {
          draft.ingredients[index] = { ...draft.ingredients[index], ...pick, per100: { ...pick.per100 } };
          paintIngredients();
        });
      });
    });
    ingredientsBox.querySelectorAll('[data-ing-del]').forEach((button) => {
      button.addEventListener('click', () => {
        draft.ingredients.splice(Number(button.dataset.ingDel), 1);
        paintIngredients();
        haptic();
      });
    });
  };
  paintIngredients();

  body.querySelector('#recipe-title').addEventListener('input', (event) => {
    draft.title = event.target.value;
  });
  body.querySelector('#recipe-servings').addEventListener('input', (event) => {
    draft.servings = toNumber(event.target.value);
  });
  body.querySelector('#recipe-minutes').addEventListener('input', (event) => {
    draft.minutes = toNumber(event.target.value);
  });
  body.querySelector('#recipe-tags').addEventListener('input', (event) => {
    draft.tags = event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean);
  });
  body.querySelector('#recipe-steps').addEventListener('input', (event) => {
    draft.steps = event.target.value;
  });
  body.querySelector('[data-add-ingredient]').addEventListener('click', () => {
    openIngredientPicker((pick) => {
      draft.ingredients.push(pick);
      paintIngredients();
    });
  });

  sheet.foot.querySelector('[data-save]').addEventListener('click', () => {
    try {
      saveRecipe(draft);
      if (!editing) recipeQuery = '';
      sheet.close();
      toast(editing ? 'Rezept aktualisiert' : 'Rezept gespeichert');
    } catch (error) {
      toast(error.message || 'Bitte Angaben prüfen', 'err');
    }
  });

  sheet.foot.querySelector('[data-delete]')?.addEventListener('click', async () => {
    sheet.close();
    const ok = await confirmDialog({
      title: 'Rezept löschen?',
      message: `"${draft.title}" wird dauerhaft gelöscht.`,
      confirmLabel: 'Löschen',
      danger: true,
    });
    if (ok) {
      deleteRecipe(draft.id);
      toast('Rezept gelöscht');
    }
  });
}

function openIngredientPicker(onPick) {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="search-wrap" style="margin-bottom:12px">
      ${icon('search')}
      <input class="input" id="ingredient-q" type="search" placeholder="Lebensmittel suchen…" autocomplete="off" enterkeyhint="search">
    </div>
    <div class="tiny muted" style="margin:0 4px 8px">Lokale Datenbank</div>
    <div data-ingredient-results></div>
    <button type="button" class="btn btn-sm btn-block" data-manual style="margin-top:14px">
      ${icon('pencil')} Manuell eingeben
    </button>
  `;

  const sheet = openSheet({ title: 'Zutat hinzufügen', body, tall: true });
  const input = body.querySelector('#ingredient-q');
  const results = body.querySelector('[data-ingredient-results]');
  let foods = [];

  const paint = () => {
    const query = input.value.trim();
    foods = query ? searchLocal(query, 30) : COMMON_FOODS;
    if (!foods.length) {
      results.innerHTML = '<div class="empty"><span class="emoji">🔎</span><span>Nichts gefunden.</span></div>';
      return;
    }
    results.innerHTML = `<div class="card flush rows">${foods.map((food, index) => `
      <button type="button" class="row" data-pick-food="${index}">
        <span class="row-thumb">${food.emoji || '🍽️'}</span>
        <span class="grow">
          <span class="t">${esc(food.name)}</span>
          <span class="s">${fmt(food.per100.kcal, 1)} kcal · P ${fmt(food.per100.protein, 1)} · KH ${fmt(food.per100.carbs, 1)} · F ${fmt(food.per100.fat, 1)} pro 100 g</span>
        </span>
        ${icon('plus', 'chev')}
      </button>`).join('')}</div>`;

    results.querySelectorAll('[data-pick-food]').forEach((button) => {
      button.addEventListener('click', () => {
        const food = foods[Number(button.dataset.pickFood)];
        if (!food) return;
        onPick({
          name: food.name,
          grams: food.portion?.grams || 100,
          per100: { ...food.per100 },
        });
        sheet.close();
        haptic();
      });
    });
  };

  input.addEventListener('input', paint);
  paint();

  body.querySelector('[data-manual]').addEventListener('click', () => {
    onPick({
      name: '',
      grams: 100,
      per100: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    });
    sheet.close();
  });
}

function exportAll() {
  const recipes = store.get().recipes || [];
  if (!recipes.length) {
    toast('Keine Rezepte zum Exportieren', 'err');
    return;
  }
  downloadFile(`kaloriq-rezepte-${todayKey()}.json`, exportRecipesJson(recipes));
  toast('Rezepte exportiert');
}

function importRecipes() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Rezeptdatei ist zu groß.');
      const recipes = parseRecipeFile(await file.text());
      const ok = await confirmDialog({
        title: 'Rezepte importieren?',
        message: recipes.length === 1
          ? '1 Rezept wird hinzugefügt. Vorhandene Rezepte mit gleicher ID werden aktualisiert.'
          : `${recipes.length} Rezepte werden hinzugefügt. Vorhandene Rezepte mit gleicher ID werden aktualisiert.`,
        confirmLabel: 'Importieren',
      });
      if (!ok) return;
      const result = mergeRecipes(recipes);
      const count = result.added + result.updated;
      recipeQuery = '';
      toast(count === 1 ? '1 Rezept importiert' : `${count} Rezepte importiert`);
    } catch (error) {
      toast(error.message || 'Import fehlgeschlagen', 'err');
    }
  });
  input.click();
}

async function importFromUrl() {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label for="recipe-url">Rezept-URL (z. B. von einer Kochseite)</label>
      <input class="input" id="recipe-url" type="url" inputmode="url" placeholder="https://..." autocomplete="off" enterkeyhint="go">
    </div>
    <p class="tiny muted" style="margin:-4px 4px 0">Titel, Zutaten, Mengen und Schritte werden aus den Rezeptdaten der Seite gelesen. Vor dem Speichern siehst du eine Vorschau.</p>
    <div data-preview style="margin-top:16px"></div>
  `;

  const sheet = openSheet({
    title: 'Von URL importieren',
    subtitle: 'Rezeptdaten der Seite übernehmen',
    body,
    footer: '<button class="btn btn-primary btn-block" data-action>Rezept laden</button>',
  });

  const action = sheet.foot.querySelector('[data-action]');
  const input = body.querySelector('#recipe-url');
  const preview = body.querySelector('[data-preview]');
  let fetched = null;
  let busy = false;

  const paintPreview = () => {
    const known = fetched.ingredients.filter((ing) => (ing.per100?.kcal || 0) > 0).length;
    const total = recipeTotals(fetched);
    preview.innerHTML = `
      <div class="card flush rows">
        <div class="row static">
          <span class="row-thumb">🍲</span>
          <span class="grow">
            <span class="t">${esc(fetched.title)}</span>
            <span class="s">${fetched.ingredients.length} Zutaten · ${servingsText(fetched.servings)}${fetched.minutes ? ` · ${fetched.minutes} Min.` : ''}</span>
          </span>
        </div>
      </div>
      ${known ? `<div class="stat-grid" style="margin-top:10px">
        ${stat('Kalorien', fmt(total.perServing.kcal), 'kcal')}
        ${stat('Protein', fmt(total.perServing.protein), 'g')}
        ${stat('Kohlenhydrate', fmt(total.perServing.carbs), 'g')}
        ${stat('Fett', fmt(total.perServing.fat), 'g')}
      </div>` : ''}
      <p class="tiny muted" style="margin-top:10px">
        ${known
    ? `${known} von ${fetched.ingredients.length} Zutaten wurden mit Nährwerten aus deiner Datenbank ergänzt. Restliche Werte kannst du über „Anpassen“ nachtragen.`
    : 'Für diese Zutaten wurden keine Nährwerte gefunden. Über „Anpassen“ kannst du sie ergänzen.'}
      </p>
    `;
  };

  action.addEventListener('click', async () => {
    if (busy) return;
    if (fetched) {
      try {
        saveRecipe(fetched);
        sheet.close();
        toast('Rezept importiert');
      } catch (error) {
        toast(error.message, 'err');
      }
      return;
    }

    const url = input.value.trim();
    if (!url) {
      toast('Bitte eine URL eingeben', 'err');
      input.focus();
      return;
    }

    busy = true;
    action.disabled = true;
    action.textContent = 'Lade …';
    try {
      fetched = await fetchRecipeFromUrl(url);
      paintPreview();
      sheet.foot.innerHTML = `
        <button class="btn grow" data-adjust>${icon('pencil')} Anpassen</button>
        <button class="btn btn-primary grow" data-save>${icon('check')} Speichern</button>
      `;
      sheet.foot.querySelector('[data-save]').addEventListener('click', () => {
        try {
          saveRecipe(fetched);
          sheet.close();
          toast('Rezept importiert');
        } catch (error) {
          toast(error.message, 'err');
        }
      });
      sheet.foot.querySelector('[data-adjust]').addEventListener('click', () => {
        sheet.close();
        openRecipeEditor(fetched);
      });
    } catch (error) {
      toast(error.message || 'Import fehlgeschlagen', 'err', 4200);
      action.textContent = 'Rezept laden';
    } finally {
      busy = false;
      action.disabled = false;
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      action.click();
    }
  });
}

function servingsText(value) {
  const n = toNumber(value, 1) || 1;
  return `${fmt(n, n % 1 ? 1 : 0)} ${n === 1 ? 'Portion' : 'Portionen'}`;
}

function stat(label, value, unit = '') {
  return `<div class="stat"><div class="lbl">${esc(label)}</div><div class="val">${value}${unit ? `<small> ${esc(unit)}</small>` : ''}</div></div>`;
}
