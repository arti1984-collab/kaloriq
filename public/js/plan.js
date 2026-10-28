/* ============================================================
   Kaloriq – Wochenplan & Einkaufsliste
   Reine Helfer: Datum, Zutaten zusammenrechnen, gruppieren.
   ============================================================ */
import { locale, tr } from './i18n.js';

export const PLAN_MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

export function mealLabel(meal) {
  return {
    breakfast: 'Frühstück',
    lunch: 'Mittagessen',
    dinner: 'Abendessen',
    snack: 'Snacks',
  }[meal] || meal;
}

/* ---------------- Datum ---------------- */

const pad = (n) => String(n).padStart(2, '0');

export function dateKeyOf(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = String(key || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDaysKey(key, days) {
  const d = parseKey(key);
  d.setDate(d.getDate() + days);
  return dateKeyOf(d);
}

/** Montag der Woche (lokale Zeit). */
export function weekStartKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return dateKeyOf(d);
}

export function weekDays(startKey) {
  return Array.from({ length: 7 }, (_, i) => addDaysKey(startKey, i));
}

export function weekLabel(startKey) {
  const a = parseKey(startKey);
  const b = parseKey(addDaysKey(startKey, 6));
  const fmtDate = (d) => d.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit' });
  return `${fmtDate(a)}–${fmtDate(b)}`;
}

export function dayLabel(key) {
  return parseKey(key).toLocaleDateString(locale(), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export function isToday(key) {
  return key === dateKeyOf();
}

/* ---------------- Kategorien ---------------- */

export const CATEGORIES = [
  { id: 'frozen', label: 'Tiefkühl' },
  { id: 'drinks', label: 'Getränke' },
  { id: 'dairy', label: 'Milchprodukte & Eier' },
  { id: 'bakery', label: 'Brot & Backwaren' },
  { id: 'protein', label: 'Fleisch & Fisch' },
  { id: 'produce', label: 'Obst & Gemüse' },
  { id: 'pantry', label: 'Vorrat & Gewürze' },
  { id: 'other', label: 'Sonstiges' },
];

const WORDS = {
  frozen: ['tiefkühl', 'tk-', 'pizza', 'pommes', 'fischstäbchen', 'eis '],
  drinks: ['wasser', 'saft', 'limo', 'cola', 'bier', 'wein', 'sekt', 'smoothie', 'sirup', 'schorle'],
  dairy: ['milch', 'joghurt', 'jogurt', 'quark', 'käse', 'butter', 'sahne', 'schmand', 'frischkäse', 'mozzarella', 'parmesan', 'gouda', 'feta', 'skyr', 'kefir', 'buttermilch', 'eier', 'eiern', 'eiweiß'],
  bakery: ['brot', 'brötchen', 'baguette', 'toast', 'croissant', 'zopf', 'laugen', 'pita', 'wrap', 'tortilla', 'kuchen', 'kekse'],
  protein: ['hähnchen', 'haehnchen', 'huhn', 'hüh', 'pute', 'rind', 'schwein', 'hack', 'steak', 'lachs', 'thunfisch', 'fisch', 'garnele', 'shrimp', 'tofu', 'tempeh', 'seitan', 'wurst', 'schinken', 'speck', 'salami', 'bacon', 'fleisch', 'lamm', 'kalb', 'sardine', 'forelle', 'kabeljau', 'makrele', 'muschel', 'krebs'],
  produce: ['apfel', 'banane', 'tomate', 'kartoffel', 'zwiebel', 'knoblauch', 'karotte', 'möhre', 'moehre', 'gurke', 'salat', 'paprika', 'brokkoli', 'blumenkohl', 'spinat', 'zucchini', 'aubergine', 'champignon', 'pilz', 'beere', 'erdbeer', 'himbeer', 'heidelbeer', 'zitrone', 'limette', 'orange', 'avocado', 'lauch', 'porree', 'sellerie', 'kohl', 'kraut', 'mais', 'erbse', 'bohne', 'kürbis', 'kuerbis', 'ingwer', 'basilikum', 'petersilie', 'koriander', 'dill', 'minze', 'obst', 'gemüse', 'gemuese', 'traube', 'birne', 'pfirsich', 'mango', 'ananas', 'melone', 'kiwi', 'granatapfel', 'olive', 'frühlingszwiebel', 'rucola', 'feldsalat', 'spargel', 'radieschen', 'rettich', 'pastinake', 'süßkartoffel', 'suesskartoffel', 'mandarine', 'nektarine', 'pflaume', 'aprikose'],
  pantry: ['mehl', 'zucker', 'salz', 'pfeffer', 'gewürz', 'gewuerz', 'öl', 'oel', 'essig', 'senf', 'ketchup', 'mayo', 'soße', 'sosse', 'sauce', 'dose', 'konserve', 'nudel', 'pasta', 'spaghetti', 'reis', 'quinoa', 'couscous', 'haferflocken', 'müsli', 'muesli', 'cornflakes', 'honig', 'marmelade', 'konfitüre', 'konfituere', 'schokolade', 'kakao', 'kaffee', 'tee', 'backpulver', 'hefe', 'vanille', 'zimt', 'curry', 'chili', 'brühe', 'bruehe', 'bouillon', 'linsen', 'kichererbsen', 'mandeln', 'nüsse', 'nuesse', 'walnuss', 'cashew', 'erdnuss', 'sesam', 'leinsamen', 'chia', 'proteinpulver', 'kokosmilch', 'tomatenmark', 'passierte'],
};

function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasWord(text, word) {
  const w = norm(word);
  if (!w) return false;
  if (w.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(w);
}

export function categoryOf(name) {
  const text = norm(name);
  // Öle, Kokosmilch und Nussbutter gehören in den Vorrat, nicht zu Obst/Gemüse.
  if (/(oliven|raps|sonnenblumen|kokos|erdnuss|nuss)(oel|ol)|kokosmilch|(erdnuss|nuss)butter/.test(text)) {
    return 'pantry';
  }
  for (const category of CATEGORIES) {
    if (category.id === 'other') continue;
    if ((WORDS[category.id] || []).some((word) => hasWord(text, word))) return category.id;
  }
  return 'other';
}

/* ---------------- Einkaufsliste ---------------- */

export function formatGrams(grams) {
  const value = Math.max(0, Number(grams) || 0);
  if (value >= 1000) {
    const kg = Math.round(value / 100) / 10;
    return `${kg.toLocaleString(locale(), { maximumFractionDigits: 1 })} kg`;
  }
  const rounded = value < 100 ? Math.round(value / 5) * 5 : Math.round(value / 10) * 10;
  return `${Math.max(5, rounded).toLocaleString(locale())} g`;
}

/**
 * Rechnet alle geplanten Rezepte der Woche zu einer Einkaufsliste zusammen.
 * days: [{ key, slots: { breakfast: [...], ... } }]
 */
export function collectShopping({ days = [], recipesById = new Map(), checked = {}, extra = [] } = {}) {
  const map = new Map();

  for (const day of days) {
    for (const meal of PLAN_MEALS) {
      for (const entry of day.slots?.[meal] || []) {
        const recipe = recipesById.get(entry.recipeId);
        if (!recipe) continue;
        const servings = Math.max(0.5, Number(recipe.servings) || 1);
        const factor = (Number(entry.portions) || 1) / servings;
        for (const ing of recipe.ingredients || []) {
          const grams = (Number(ing.grams) || 0) * factor;
          if (!ing.name || grams <= 0) continue;
          const key = `r:${norm(ing.name)}`;
          const prev = map.get(key);
          if (prev) {
            prev.grams += grams;
          } else {
            map.set(key, {
              key,
              name: String(ing.name).trim(),
              grams,
              checked: Boolean(checked[key]),
            });
          }
        }
      }
    }
  }

  const items = [...map.values()].map((item) => ({
    ...item,
    amount: formatGrams(item.grams),
    category: categoryOf(item.name),
  }));

  for (const entry of extra) {
    if (!entry?.name) continue;
    items.push({
      key: `x:${entry.id}`,
      name: entry.name,
      amount: entry.amount || '',
      checked: Boolean(entry.checked),
      category: categoryOf(entry.name),
      extra: true,
      extraId: entry.id,
    });
  }

  const groups = CATEGORIES
    .map((category) => ({
      ...category,
      items: items
        .filter((item) => item.category === category.id)
        .sort((a, b) => a.name.localeCompare(b.name, locale())),
    }))
    .filter((group) => group.items.length);

  const done = items.filter((item) => item.checked).length;
  return { items, groups, total: items.length, done, open: items.length - done };
}

export function shoppingText({ startKey, groups = [], title = 'Einkaufsliste' }) {
  const lines = [`${tr(title)} · ${weekLabel(startKey)}`, ''];
  let count = 0;
  for (const group of groups) {
    const open = group.items.filter((item) => !item.checked);
    if (!open.length) continue;
    lines.push(tr(group.label));
    for (const item of open) {
      lines.push(`- ${item.name}${item.amount ? `: ${item.amount}` : ''}`);
      count++;
    }
    lines.push('');
  }
  if (!count) {
    lines.push(tr('Alles erledigt 🎉'));
  } else {
    lines.push(tr('Erstellt mit Kaloriq'));
  }
  return lines.join('\n').trim();
}
