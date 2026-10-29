/* ============================================================
   Kaloriq – Rezepte
   Rezepte bleiben lokal im bestehenden State. Jede Zutat speichert
   ihre Nährwerte pro 100 g als Schnappschuss, damit ein Rezept stabil
   bleibt, auch wenn sich die Lebensmitteldatenbank später ändert.
   ============================================================ */
import { store, addEntries } from './store.js';
import { round1 } from './calc.js';
import { norm, searchLocal, LOCAL_FOODS } from './foods.js';

export const RECIPE_FILE_FORMAT = 'kaloriq-recipes';
export const RECIPE_FILE_VERSION = 1;

const EMPTY_MACROS = () => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

/** Zahl aus Eingaben lesen – akzeptiert auch deutsche Dezimalkommas. */
export function toNumber(value, fallback = 0) {
  const n = typeof value === 'string'
    ? Number(value.trim().replace(',', '.'))
    : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function timestamp(value, fallback = Date.now()) {
  if (value == null || value === '') return fallback;
  const n = typeof value === 'string' && !/^\d+(\.\d+)?$/.test(value)
    ? Date.parse(value)
    : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function per100Of(raw = {}) {
  return {
    kcal: round1(toNumber(raw.kcal)),
    protein: round1(toNumber(raw.protein)),
    carbs: round1(toNumber(raw.carbs)),
    fat: round1(toNumber(raw.fat)),
    fiber: round1(toNumber(raw.fiber)),
  };
}

function tagsOf(raw) {
  const list = Array.isArray(raw) ? raw : String(raw || '').split(',');
  const tags = [];
  for (const item of list) {
    const tag = String(item || '').trim().slice(0, 28);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, 8);
}

export function newRecipeId() {
  return 'r_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function normalizeIngredient(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    name: String(source.name || '').trim().slice(0, 120),
    grams: round1(Math.max(0, toNumber(source.grams ?? source.amount))),
    per100: per100Of(source.per100 || source),
  };
}

/**
 * Macht aus einer beliebigen (z. B. importierten) Struktur ein gültiges Rezept.
 * Gibt null zurück, wenn Titel oder Zutaten fehlen.
 */
export function normalizeRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title || raw.name || '').trim().slice(0, 120);
  if (!title) return null;

  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map(normalizeIngredient)
    .filter((ing) => ing.name && ing.grams > 0);
  if (!ingredients.length) return null;

  const servings = Math.min(99, Math.max(0.5, toNumber(raw.servings, 1) || 1));
  const servingGramsRaw = toNumber(raw.servingGrams);
  const createdAt = timestamp(raw.createdAt);
  const updatedAt = timestamp(raw.updatedAt, createdAt);

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim().slice(0, 80) : newRecipeId(),
    title,
    servings: round1(servings),
    servingGrams: servingGramsRaw > 0 ? round1(servingGramsRaw) : 0,
    minutes: Math.min(9999, Math.max(0, Math.round(toNumber(raw.minutes)))),
    tags: tagsOf(raw.tags),
    ingredients,
    steps: String(raw.steps || '').trim().slice(0, 5000),
    emoji: String(raw.emoji || '🍲').trim().slice(0, 12) || '🍲',
    createdAt,
    updatedAt,
  };
}

export function validateRecipeDraft(draft) {
  if (!String(draft?.title || '').trim()) return 'Bitte einen Titel eingeben';
  const ingredients = Array.isArray(draft?.ingredients) ? draft.ingredients : [];
  if (!ingredients.length) return 'Bitte mindestens eine Zutat mit Menge hinzufügen';
  for (const ing of ingredients) {
    if (!String(ing?.name || '').trim() || toNumber(ing?.grams) <= 0) {
      return 'Bitte alle Zutaten mit Name und Menge ergänzen';
    }
  }
  return '';
}

export function getRecipe(id) {
  return (store.get().recipes || []).find((recipe) => recipe.id === id) || null;
}

export function saveRecipe(draft) {
  const error = validateRecipeDraft(draft);
  if (error) throw new Error(error);
  const normalized = normalizeRecipe(draft);
  if (!normalized) throw new Error('Bitte einen Titel eingeben');

  normalized.updatedAt = Date.now();
  store.set((state) => {
    if (!Array.isArray(state.recipes)) state.recipes = [];
    const index = state.recipes.findIndex((recipe) => recipe?.id === normalized.id);
    if (index >= 0) {
      normalized.createdAt = state.recipes[index].createdAt || normalized.createdAt;
      state.recipes[index] = normalized;
    } else {
      state.recipes.unshift(normalized);
    }
    state.recipes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, 'recipes');
  return normalized;
}

export function deleteRecipe(id) {
  store.set((state) => {
    if (Array.isArray(state.recipes)) state.recipes = state.recipes.filter((recipe) => recipe.id !== id);
    // Geplante Einträge dieses Rezepts entfernen, damit keine Leichen bleiben.
    if (state.mealPlan && typeof state.mealPlan === 'object') {
      for (const meals of Object.values(state.mealPlan)) {
        if (!meals || typeof meals !== 'object') continue;
        for (const meal of Object.keys(meals)) {
          if (!Array.isArray(meals[meal])) continue;
          meals[meal] = meals[meal].filter((entry) => entry?.recipeId !== id);
        }
      }
    }
  }, 'recipes');
}

/** Gesamt-, Portions- und 100-g-Nährwerte eines Rezepts. */
export function recipeTotals(recipe) {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const total = EMPTY_MACROS();
  let totalGrams = 0;

  for (const ing of ingredients) {
    const grams = Math.max(0, toNumber(ing?.grams));
    const per = ing?.per100 || {};
    const factor = grams / 100;
    totalGrams += grams;
    total.kcal += toNumber(per.kcal) * factor;
    total.protein += toNumber(per.protein) * factor;
    total.carbs += toNumber(per.carbs) * factor;
    total.fat += toNumber(per.fat) * factor;
    total.fiber += toNumber(per.fiber) * factor;
  }

  const servings = Math.max(0.5, toNumber(recipe?.servings, 1) || 1);
  const servingGramsRaw = toNumber(recipe?.servingGrams);
  const servingGrams = servingGramsRaw > 0 ? servingGramsRaw : totalGrams / servings;

  const perServing = {
    kcal: Math.round(total.kcal / servings),
    protein: round1(total.protein / servings),
    carbs: round1(total.carbs / servings),
    fat: round1(total.fat / servings),
    fiber: round1(total.fiber / servings),
  };
  const per100 = totalGrams > 0
    ? {
      kcal: round1(total.kcal / totalGrams * 100),
      protein: round1(total.protein / totalGrams * 100),
      carbs: round1(total.carbs / totalGrams * 100),
      fat: round1(total.fat / totalGrams * 100),
      fiber: round1(total.fiber / totalGrams * 100),
    }
    : EMPTY_MACROS();

  return {
    ingredients,
    totalGrams: round1(totalGrams),
    servings: round1(servings),
    servingGrams: round1(servingGrams),
    total: {
      kcal: Math.round(total.kcal),
      protein: round1(total.protein),
      carbs: round1(total.carbs),
      fat: round1(total.fat),
      fiber: round1(total.fiber),
    },
    perServing,
    per100,
  };
}

/** Tagebuch-Eintrag für eine Portionszahl (1 = eine Rezeptportion). */
export function recipeEntry(recipe, portions = 1) {
  const totals = recipeTotals(recipe);
  const count = Math.max(0.1, toNumber(portions, 1) || 1);
  return {
    name: String(recipe?.title || 'Rezept'),
    grams: round1(totals.servingGrams * count),
    per100: totals.per100,
    source: 'recipe',
    emoji: recipe?.emoji || '🍲',
    recipeId: recipe?.id || '',
  };
}

export function addRecipeToDiary(dateKey, meal, recipe, portions = 1) {
  return addEntries(dateKey, meal, [recipeEntry(recipe, portions)]);
}

export function exportRecipesJson(recipes = store.get().recipes || []) {
  return JSON.stringify({
    format: RECIPE_FILE_FORMAT,
    version: RECIPE_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    recipes,
  }, null, 2);
}

export function parseRecipeFile(text) {
  let data;
  try {
    data = JSON.parse(String(text || ''));
  } catch {
    throw new Error('Ungültige Rezeptdatei.');
  }
  const list = Array.isArray(data)
    ? data
    : (data && Array.isArray(data.recipes) ? data.recipes : null);
  if (!list) throw new Error('Ungültige Rezeptdatei.');

  const recipes = list.map(normalizeRecipe).filter(Boolean);
  if (!recipes.length) throw new Error('Keine gültigen Rezepte gefunden.');
  return recipes;
}

/**
 * Mengen-Heuristik für Zutatenzeilen aus Rezeptseiten:
 * "500 g Mehl", "250ml Milch", "1 EL Öl", "2 Eier", "½ TL Salz", "1 1/2 Tassen Reis".
 */
const UNIT_GRAMS = {
  g: 1, gr: 1, gramm: 1, kg: 1000, mg: 0.001,
  ml: 1, l: 1000, liter: 1000,
  el: 15, esslöffel: 15, tbsp: 15,
  tl: 5, teelöffel: 5, tsp: 5,
  prise: 0.5, prisen: 0.5,
  zehe: 5, zehen: 5,
  scheibe: 30, scheiben: 30,
  blatt: 1, blätter: 1,
  bund: 50, dose: 400, dosen: 400,
  packung: 200, pck: 200, becher: 150, glas: 200, tasse: 200, tassen: 200,
};
const PIECE_UNITS = new Set(['stück', 'stk', 'stck', 'st', 'stueck', 'stücke', 'stücke.']);
/** Grobe Gramm-Annahme pro Stück, wenn keine Einheit angegeben ist. */
const PIECE_GRAMS = 100;

function parseAmount(raw) {
  const text = String(raw || '').trim().replace(',', '.');
  const mixed = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const [, whole, a, b] = mixed.map(Number);
    return b ? whole + a / b : whole;
  }
  const fraction = text.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const [, a, b] = fraction.map(Number);
    return b ? a / b : a;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

export function parseIngredientString(text) {
  const source = String(text || '').trim();
  if (!source) return null;

  const s = source
    .replace(/½/g, ' 1/2 ').replace(/¼/g, ' 1/4 ').replace(/¾/g, ' 3/4 ')
    .replace(/⅓/g, ' 1/3 ').replace(/⅔/g, ' 2/3 ')
    .replace(/\s+/g, ' ')
    .trim();

  const match = s.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?)\s*(.*)$/);
  if (!match) return { name: s, grams: PIECE_GRAMS };

  const amount = parseAmount(match[1]);
  const rest = match[2].replace(/^[-–—:]\s*/, '').trim();
  if (!rest) return null;

  let unit = '';
  let name = rest;
  const unitMatch = rest.match(/^([A-Za-zÄÖÜäöüß.]+)\.?\s+(.+)$/);
  if (unitMatch) {
    const candidate = unitMatch[1].toLowerCase().replace(/\.$/, '');
    if (UNIT_GRAMS[candidate] != null) {
      unit = candidate;
      name = unitMatch[2].trim();
    } else if (PIECE_UNITS.has(candidate)) {
      unit = 'stück';
      name = unitMatch[2].trim();
    }
  }

  let grams;
  if (!unit) {
    // Ohne bekannte Einheit: Stück-Annahme ("2 Eier", "3 Zwiebeln").
    grams = Math.max(amount, 0.1) * PIECE_GRAMS;
  } else if (unit === 'stück') {
    grams = Math.max(amount, 0.1) * PIECE_GRAMS;
  } else {
    grams = amount * UNIT_GRAMS[unit];
  }

  return {
    name: name || rest,
    grams: round1(Math.max(0, grams)),
    pieces: !unit || unit === 'stück' ? Math.max(amount, 0.1) : 0,
  };
}

/** Nährwerte aus der lokalen Datenbank, wenn der Name eindeutig passt. */
let localIndex = null;

function foodIndex() {
  if (localIndex) return localIndex;
  localIndex = new Map();
  for (const food of LOCAL_FOODS || []) {
    const key = norm(food.name);
    if (key && !localIndex.has(key)) localIndex.set(key, food);
  }
  return localIndex;
}

const singularOf = (value) => value.replace(/[ns]$/, '');

function matchLocalFood(name) {
  const needle = norm(name);
  if (!needle) return null;
  const index = foodIndex();

  const direct = index.get(needle);
  if (direct) return direct;

  // Plural/Grundform: "Tomaten" → "Tomate", "Zwiebeln" → "Zwiebel".
  const base = singularOf(needle);
  if (base.length >= 4) {
    for (const [key, food] of index) {
      if (key === base || singularOf(key) === base) return food;
    }
  }

  // Zusammengesetzte Namen nur an Wortgrenzen: "Reis" → "Reis, gekocht".
  if (needle.length >= 4) {
    for (const [key, food] of index) {
      if (key.startsWith(needle + ' ') || key.startsWith(needle + ',')
        || needle.startsWith(key + ' ') || needle.startsWith(key + ',')) return food;
    }
  }

  const fallback = searchLocal(name, 1)[0];
  return fallback && norm(fallback.name) === needle ? fallback : null;
}

const pendingFetches = new Map();

if (typeof window !== 'undefined') {
  window.__kaloriqFetchResult = (id, json) => {
    const entry = pendingFetches.get(String(id));
    if (!entry) return;
    pendingFetches.delete(String(id));
    try {
      const data = JSON.parse(String(json || '{}'));
      if (data.ok) entry.resolve(String(data.html || ''));
      else entry.reject(new Error(data.error || `Seite antwortet mit HTTP ${data.status || 0}.`));
    } catch {
      entry.reject(new Error('Antwort der Seite konnte nicht gelesen werden.'));
    }
  };
}

/** In der Android-App holt die native Brücke das HTML (kein CORS-Problem). */
function nativeHtmlFetch(url) {
  const bridge = typeof window !== 'undefined' ? window.AndroidFetch : null;
  if (!bridge || typeof bridge.html !== 'function') return null;
  return new Promise((resolve, reject) => {
    const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const timer = setTimeout(() => {
      pendingFetches.delete(id);
      reject(new Error('Zeitüberschreitung beim Laden der Seite.'));
    }, 25000);
    pendingFetches.set(id, {
      resolve: (html) => { clearTimeout(timer); resolve(html); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
    try {
      bridge.html(url, id);
    } catch {
      clearTimeout(timer);
      pendingFetches.delete(id);
      reject(new Error('Seite konnte nicht geladen werden.'));
    }
  });
}

async function loadRecipeHtml(url) {
  let target = String(url || '').trim();
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  const native = nativeHtmlFetch(target);
  if (native) return native;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
  try {
    const res = await fetch(target, {
      signal: controller?.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    if (!res.ok) throw new Error(`Seite antwortet mit HTTP ${res.status}.`);
    return await res.text();
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Zeitüberschreitung beim Laden der Seite.');
    if (String(error?.message || '').startsWith('Seite antwortet mit')) throw error;
    throw new Error('Diese Seite erlaubt den direkten Abruf nicht (CORS). In der Android-App klappt der Import; am Rechner hilft nur manuelles Anlegen.');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function isoMinutes(value) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(String(value || ''));
  if (!match) return 0;
  const [, d, h, m] = match;
  return (Number(d) || 0) * 1440 + (Number(h) || 0) * 60 + (Number(m) || 0);
}

function findRecipeNode(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((entry) => String(entry).toLowerCase() === 'recipe')) return node;
  if (node['@graph']) return findRecipeNode(node['@graph']);
  return null;
}

/**
 * Holt ein Rezept von einer URL und liest die schema.org-Daten (JSON-LD).
 * Zutaten werden in Gramm geschätzt und – wenn möglich – mit Nährwerten
 * aus der lokalen Datenbank ergänzt.
 */
export async function fetchRecipeFromUrl(url) {
  const html = await loadRecipeHtml(url);
  const doc = new DOMParser().parseFromString(html, 'text/html');

  let ld = null;
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      ld = findRecipeNode(JSON.parse(script.textContent || ''));
    } catch {
      ld = null;
    }
    if (ld) break;
  }
  if (!ld) throw new Error('Auf dieser Seite wurden keine Rezeptdaten (JSON-LD) gefunden.');

  const title = String(ld.name || doc.querySelector('h1')?.textContent || doc.title || '').trim();
  if (!title) throw new Error('Das Rezept hat keinen Titel.');

  const rawIngredients = Array.isArray(ld.recipeIngredient)
    ? ld.recipeIngredient
    : (typeof ld.recipeIngredient === 'string' ? [ld.recipeIngredient] : []);

  const ingredients = rawIngredients
    .map((line) => parseIngredientString(line))
    .filter((ing) => ing && ing.name && ing.grams > 0)
    .map((ing) => {
      const food = matchLocalFood(ing.name);
      if (!food) return { name: ing.name, grams: ing.grams };
      // Bei Stück-Angaben die haushaltsübliche Portionsgröße nutzen.
      const pieceGrams = Number(food.portion?.grams) || 0;
      const grams = ing.pieces && pieceGrams > 0
        ? round1(ing.pieces * pieceGrams)
        : ing.grams;
      return { name: ing.name, grams, per100: { ...food.per100 } };
    });

  if (!ingredients.length) throw new Error('Auf dieser Seite wurden keine Zutaten gefunden.');

  let steps = '';
  const instructions = ld.recipeInstructions;
  if (Array.isArray(instructions)) {
    steps = instructions
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if (Array.isArray(item.itemListElement)) {
            return item.itemListElement
              .map((sub) => (typeof sub === 'string' ? sub : sub?.text || sub?.name || ''))
              .filter(Boolean)
              .join('\n');
          }
          return item.text || item.name || '';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  } else if (typeof instructions === 'string') {
    steps = instructions;
  }

  let servings = 1;
  const yieldRaw = Array.isArray(ld.recipeYield) ? ld.recipeYield[0] : ld.recipeYield;
  if (yieldRaw != null) {
    const match = String(yieldRaw).match(/\d+(?:[.,]\d+)?/);
    if (match) servings = Math.max(0.5, Number(match[0].replace(',', '.')) || 1);
  }

  const tagSource = [ld.recipeCategory, ld.keywords]
    .flat()
    .filter(Boolean)
    .join(',')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return normalizeRecipe({
    title,
    servings,
    minutes: isoMinutes(ld.totalTime || ld.cookTime || ld.prepTime),
    tags: tagSource,
    ingredients,
    steps,
    sourceUrl: url,
  }) || {
    title,
    servings,
    ingredients,
    steps,
    tags: tagSource,
    minutes: isoMinutes(ld.totalTime || ld.cookTime || ld.prepTime),
    sourceUrl: url,
  };
}

/** Importierte Rezepte zusammenführen; gleiche IDs aktualisieren den Stand. */
export function mergeRecipes(recipes) {
  let added = 0;
  let updated = 0;
  store.set((state) => {
    if (!Array.isArray(state.recipes)) state.recipes = [];
    const map = new Map(state.recipes.map((recipe) => [recipe.id, recipe]));
    const seen = new Set();
    for (const recipe of recipes) {
      if (map.has(recipe.id) || seen.has(recipe.id)) updated++;
      else added++;
      seen.add(recipe.id);
      map.set(recipe.id, recipe);
    }
    state.recipes = Array.from(map.values())
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, 'recipes');
  return { added, updated };
}

export function searchRecipes(query) {
  const all = [...(store.get().recipes || [])]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const needle = norm(query);
  if (!needle) return all;
  return all.filter((recipe) => {
    const hay = norm([
      recipe.title,
      ...(recipe.tags || []),
      ...(recipe.ingredients || []).map((ing) => ing.name),
    ].join(' '));
    return hay.includes(needle);
  });
}
