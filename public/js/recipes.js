/* ============================================================
   Kaloriq – Rezepte
   Rezepte bleiben lokal im bestehenden State. Jede Zutat speichert
   ihre Nährwerte pro 100 g als Schnappschuss, damit ein Rezept stabil
   bleibt, auch wenn sich die Lebensmitteldatenbank später ändert.
   ============================================================ */
import { store, addEntries } from './store.js';
import { round1 } from './calc.js';
import { norm } from './foods.js';

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
