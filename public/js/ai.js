/* ============================================================
   Kaloriq – KI-Schätzung (Google Gemini, Vision + Text)
   Jede Person nutzt ihren eigenen API-Key. Es gibt bewusst keinen
   Server-Proxy und keine geteilten Keys. Anfragen laufen direkt an
   Google; erlaubt sind nur Modelle mit kostenlosem Free-Tier.
   ============================================================ */
import { LOCAL_FOODS, norm } from './foods.js';
import { store } from './store.js';
import { getLang } from './i18n.js';
import { FREE_MODELS, DEFAULT_MODEL, isFreeModel, normalizeModel } from './models.js';

/** Reihenfolge der erlaubten Free-Tier-Modelle. */
export const MODEL_PREFERENCE = FREE_MODELS.map((m) => m.id);

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Filtert Modelle heraus, die keine Mahlzeiten analysieren können (Bild-, Audio-, Embedding-Modelle). */
const NOT_CHAT = /(image|imagen|tts|live|transcribe|embedding|robotics|veo|lyria|deep-research|antigravity|computer-use|omni)/i;

/**
 * Fragt beim Anbieter ab, welche der erlaubten Free-Tier-Modelle dieser
 * Key tatsächlich nutzen darf. Bezahlte Modelle werden nie zurückgegeben.
 */
export async function listModels({ apiKey = '' } = {}) {
  if (!apiKey) throw new Error('Bitte zuerst den API-Key eingeben.');
  const res = await fetch(`${API_BASE}?pageSize=200`, {
    headers: { Accept: 'application/json', 'x-goog-api-key': apiKey },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(friendlyError(res.status, body?.error?.message));

  const available = (body.models || []).map((m) => ({
    id: String(m.name || '').replace(/^models\//, ''),
    label: m.displayName || '',
    description: m.description || '',
    methods: m.supportedGenerationMethods || [],
  }));

  const models = available
    .filter((m) => isFreeModel(m.id))
    .filter((m) => (Array.isArray(m.methods) ? m.methods.includes('generateContent') : true))
    .filter((m) => !NOT_CHAT.test(m.id));

  const rank = (id) => {
    const i = MODEL_PREFERENCE.indexOf(id);
    return i === -1 ? MODEL_PREFERENCE.length : i;
  };

  return models.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

/** Wählt das beste verfügbare Free-Tier-Modell (Präferenzliste, sonst erstes). */
export function pickModel(models = []) {
  if (!models.length) return null;
  for (const wanted of MODEL_PREFERENCE) {
    const hit = models.find((m) => m.id === wanted);
    if (hit) return hit.id;
  }
  return models[0].id;
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          quantity_g: { type: 'NUMBER' },
          kcal: { type: 'NUMBER' },
          protein_g: { type: 'NUMBER' },
          carbs_g: { type: 'NUMBER' },
          fat_g: { type: 'NUMBER' },
          confidence: { type: 'STRING', enum: ['hoch', 'mittel', 'niedrig'] },
        },
        required: ['name', 'quantity_g', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence'],
      },
    },
    notes: { type: 'STRING' },
  },
  required: ['items', 'notes'],
};

const SYSTEM_PROMPT = `Du bist ein erfahrener Ernährungsberater und schätzt Mahlzeiten anhand eines Fotos oder einer Beschreibung.

Regeln:
- Zerlege die Mahlzeit in einzelne Bestandteile (maximal 12 Einträge). Getrennt zählen: Brot, Aufstrich, Beilage, Getränk.
- Schätze die tatsächlich verzehrte Menge in Gramm realistisch. Nutze Teller, Besteck, Gläser und Hände im Bild als Größenreferenz. Getränke in ml = g rechnen.
- Verwende deutsche, alltagstaugliche Bezeichnungen ("Vollkornbrötchen", "Latte macchiato", "Hähnchenbrust gegrillt").
- Kalorien und Makros müssen zur Menge passen: 4 kcal/g Protein, 4 kcal/g Kohlenhydrate, 9 kcal/g Fett (Abweichung unter 10 %).
- Berücksichtige Zubereitung (gebraten -> mehr Fett, gekocht -> weniger).
- Wenn etwas nicht eindeutig erkennbar ist, nimm die wahrscheinlichste Variante und setze confidence auf "niedrig" oder "mittel".
- notes: ein kurzer deutscher Satz zu deinen Annahmen (Portionsgröße, Zubereitung).`;

const SYSTEM_PROMPT_EN = `You are an experienced nutritionist estimating meals from a photo or a description.

Rules:
- Split the meal into individual components (max. 12 items). Count bread, spread, side dish and drink separately.
- Estimate the amount actually eaten in grams realistically. Use plates, cutlery, glasses and hands in the image as a size reference. Treat drinks in ml as g.
- Use everyday English names ("wholemeal roll", "latte macchiato", "grilled chicken breast").
- Calories and macros must match the amount: 4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat (deviation below 10%).
- Account for preparation (fried -> more fat, boiled -> less).
- If something is not clearly recognisable, take the most likely option and set confidence to "niedrig" or "mittel".
- notes: one short English sentence about your assumptions (portion size, preparation).`;

function buildParts({ text, imageBase64, imageMime }) {
  const en = getLang() === 'en';
  const parts = [{ text: en ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT }];
  if (text) parts.push({ text: `${en ? 'Description / request' : 'Beschreibung / Wunsch'}: ${text}` });
  if (imageBase64) {
    parts.push({ text: en ? 'Estimate the meal in this photo.' : 'Schätze die Mahlzeit auf diesem Foto.' });
    parts.push({ inline_data: { mime_type: imageMime || 'image/jpeg', data: imageBase64 } });
  }
  return [{ role: 'user', parts }];
}

function normalizeItems(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items
    .map((it) => {
      const grams = Math.min(3000, Math.max(1, Math.round(Number(it.quantity_g) || 0)));
      const kcal = Math.max(0, Number(it.kcal) || 0);
      if (!grams || !it.name) return null;
      const f = 100 / grams;
      return {
        name: String(it.name).slice(0, 90),
        brand: '',
        grams,
        per100: {
          kcal: Math.round(kcal * f * 10) / 10,
          protein: Math.round((Number(it.protein_g) || 0) * f * 10) / 10,
          carbs: Math.round((Number(it.carbs_g) || 0) * f * 10) / 10,
          fat: Math.round((Number(it.fat_g) || 0) * f * 10) / 10,
          fiber: 0,
        },
        kcal: Math.round(kcal),
        confidence: it.confidence || 'mittel',
        source: 'ai',
      };
    })
    .filter(Boolean);
}

function friendlyError(status, message) {
  const m = String(message || '');
  if (status === 400 && /API key/i.test(m)) return 'Der API-Key ist ungültig. Bitte im Profil prüfen.';
  if (status === 403) return 'Zugriff verweigert. Bitte einen eigenen Key verwenden und ein Free-Tier-Modell wählen.';
  if (status === 404) return 'Modell nicht gefunden.';
  if (status === 429) return 'Limit erreicht. Bitte kurz warten (Free-Tier: Anfragen pro Minute).';
  if (status === 413) return 'Bild zu groß. Bitte ein kleineres Foto verwenden.';
  return m || `Fehler ${status}`;
}

/**
 * Schätzt eine Mahlzeit.
 * @returns {Promise<{items:Array, notes:string, demo?:boolean}>}
 */
export async function estimate({ text = '', imageBase64 = '', imageMime = 'image/jpeg', settings, mealHint = '' }) {
  const apiKey = (settings?.apiKey || '').trim();

  if (!apiKey) {
    return demoEstimate(text);
  }

  const payload = {
    contents: buildParts({
      text: [mealHint ? `Mahlzeit: ${mealHint}.` : '', text].filter(Boolean).join(' '),
      imageBase64,
      imageMime,
    }),
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
    },
  };

  const call = async (model) => {
    let res;
    try {
      res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new Error('Keine Verbindung zur KI. Internet prüfen.');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      const err = new Error(friendlyError(res.status, data?.error?.message || data?.error));
      err.status = res.status;
      err.detail = String(data?.error?.message || data?.error || '');
      throw err;
    }

    const block = data?.promptFeedback?.blockReason;
    if (block) throw new Error('Die Anfrage wurde vom Sicherheitsfilter blockiert. Bitte anderes Bild versuchen.');

    const raw = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (!raw) throw new Error('Die KI hat keine Antwort geliefert. Bitte erneut versuchen.');

    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
    } catch {
      throw new Error('Antwort konnte nicht gelesen werden. Bitte erneut versuchen.');
    }

    const items = normalizeItems(parsed);
    if (!items.length) throw new Error('Keine Lebensmittel erkannt. Bitte Beschreibung ergänzen.');

    return { items, notes: parsed.notes || '', demo: false, model };
  };

  const configured = normalizeModel(String(settings?.model || '').trim() || DEFAULT_MODEL);

  try {
    return await call(configured);
  } catch (err) {
    // Modell für diesen Key nicht verfügbar: die erlaubten Free-Tier-Modelle
    // abfragen und einmal mit dem besten verfügbaren wiederholen.
    const modelMissing = err.status === 404
      || (err.status === 400 && /not found|not supported|not available|does not exist|unsupported/i.test(err.detail || ''));
    if (!modelMissing) throw err;

    let models = [];
    try {
      models = await listModels({ apiKey });
    } catch { /* Liste nicht abrufbar – dann bleibt nur der Hinweis */ }

    const best = pickModel(models);
    if (best && best !== configured) {
      store.saveSettings({ model: best });
      return call(best);
    }

    throw new Error('Dieses Modell ist für deinen Key nicht freigeschaltet. Bitte im Profil unter „KI-Tracking“ ein anderes Free-Tier-Modell wählen.');
  }
}

/* ---------------- Demo-Modus (ohne API-Key) ---------------- */

const DEFAULT_GRAMS = 100;

const STOPWORDS = new Set([  'mit', 'und', 'oder', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines', 'der', 'die', 'das',
  'den', 'dem', 'des', 'von', 'vom', 'im', 'in', 'am', 'an', 'auf', 'zum', 'zur', 'fuer', 'für',
  'ca', 'etwa', 'etwas', 'auch', 'noch', 'dazu', 'sowie', 'ich', 'habe', 'hatte', 'gegessen',
  'getrunken', 'heute', 'gestern', 'morgen', 'fruehstueck', 'frühstück', 'mittag', 'abend',
  'portion', 'portionen', 'scheibe', 'scheiben', 'glas', 'glaeser', 'gläser', 'tasse', 'tassen',
  'becher', 'stueck', 'stück', 'gramm', 'kcal', 'kalorien', 'zwei', 'drei', 'vier', 'fuenf',
  'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'halb', 'halbe', 'halber', 'paar',
  'bisschen', 'gross', 'groß', 'klein', 'grosse', 'große', 'grosser', 'großer', 'normal',
  'viel', 'wenig', 'grossen', 'großen', 'dazu', 'etwa', 'circa', 'plus', 'ohne', 'nur', 'mir',
]);

function keywords(text) {
  return norm(text)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+([.,]\d+)?$/.test(t))
    .filter((t, i, arr) => arr.indexOf(t) === i);
}

function scoreFood(food, keys) {
  const words = norm(food.name).split(' ');
  let hits = 0;
  let score = 0;
  for (const k of keys) {
    if (words.includes(k)) { score += 60; hits++; }
    else if (k.length >= 4 && words.some((w) => w.startsWith(k))) { score += 30; hits++; }
    else if (words.some((w) => w.length >= 4 && k.startsWith(w))) { score += 16; hits++; }
  }
  return { score: hits ? score + hits * 20 : 0, hits };
}

/**
 * Sehr einfache Heuristik: zerlegt den Text in Bestandteile ("mit", "und", ","),
 * sucht je Bestandteil ein Lebensmittel aus der lokalen Liste und übernimmt
 * Mengenangaben wie "200 g" oder "2 Scheiben".
 * Nur für den Test der Oberfläche gedacht.
 */
export function demoEstimate(text = '') {
  const en = getLang() === 'en';
  const clean = String(text || '').trim();
  const segments = splitSegments(clean);
  const used = new Set();
  const found = [];

  for (const segment of segments) {
    const keys = keywords(segment);
    if (!keys.length) continue;

    const ranked = LOCAL_FOODS
      .map((food) => ({ food, ...scoreFood(food, keys) }))
      .filter((r) => r.score >= 50)
      .sort((a, b) => b.score - a.score);

    for (const { food } of ranked) {
      if (used.has(food.id)) continue;
      used.add(food.id);
      const grams = gramsFromText(segment, food) || food.portion?.grams || DEFAULT_GRAMS;
      found.push({
        name: food.name,
        brand: '',
        grams,
        per100: { ...food.per100 },
        kcal: Math.round((food.per100.kcal * grams) / 100),
        confidence: 'niedrig',
        source: 'demo',
        emoji: food.emoji,
      });
      break; // pro Bestandteil nur ein Treffer
    }
    if (found.length >= 6) break;
  }

  if (!found.length) {
    // Generische Schätzung, damit der Ablauf trotzdem sichtbar ist.
    found.push({
      name: clean ? clean.slice(0, 70) : (en ? 'Meal (estimate)' : 'Mahlzeit (Schätzung)'),
      grams: 250,
      per100: { kcal: 160, protein: 7, carbs: 18, fat: 6, fiber: 2 },
      kcal: 400,
      confidence: 'niedrig',
      source: 'demo',
      emoji: '🍽️',
    });
  }

  return {
    items: found,
    notes: en
      ? 'Demo mode without API key: values estimated from the local database. Add a Gemini key in the profile for real photo recognition.'
      : 'Demo-Modus ohne API-Key: Werte aus der lokalen Datenbank geschätzt. Für echte Foto-Erkennung im Profil einen Gemini-Key hinterlegen.',
    demo: true,
  };
}

function splitSegments(text) {
  const soft = String(text)
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
  return soft
    .split(/\s+und\s+|\s+mit\s+|\s+sowie\s+|\s+plus\s+|[,;+]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function gramsFromText(segment, food) {
  const n = norm(segment);
  const name = norm(food.name).split(' ')[0];
  const idx = n.indexOf(name);
  if (idx === -1) return null;
  const around = n.slice(Math.max(0, idx - 22), idx + name.length + 22);

  const gram = around.match(/(\d+(?:[.,]\d+)?)\s*(g|gramm|ml)\b/);
  if (gram) {
    const value = parseFloat(gram[1].replace(',', '.'));
    if (value > 0 && value <= 3000) return Math.round(value);
  }

  const piece = around.match(/(\d+(?:[.,]\d+)?)\s*(stuck|stueck|scheiben|scheibe|glaser|glas|tassen|tasse|becher|portionen|portion|handvoll|kugeln|kugel|el|tl)\b/);
  if (piece && food.portion) {
    const count = parseFloat(piece[1].replace(',', '.'));
    if (count > 0 && count <= 20) return Math.round((food.portion.grams || 100) * count);
  }
  return null;
}

/* ---------------- Bild verkleinern ---------------- */

/**
 * Liest ein Bild, skaliert es auf max. 1024 px und liefert JPEG-Base64.
 * So bleiben Requests klein und HEIC-Fotos vom iPhone funktionieren.
 */
export function prepareImage(file, maxDim = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';
        URL.revokeObjectURL(url);
        resolve({ base64, mime: 'image/jpeg', dataUrl, width: w, height: h });
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(new Error('Bild konnte nicht verarbeitet werden.'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bildformat wird nicht unterstützt.'));
    };
    img.src = url;
  });
}

export { LOCAL_FOODS };
