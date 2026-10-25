/* ============================================================
   Kaloriq – erlaubte Gemini-Modelle
   Nur Modelle mit kostenlosem Free-Tier. Bezahlte Modelle werden
   bewusst nicht angeboten: Jede Person nutzt ihren eigenen Key und
   bleibt damit im kostenlosen Rahmen.
   ============================================================ */

export const FREE_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
];

export const DEFAULT_MODEL = FREE_MODELS[0].id;

export function isFreeModel(id) {
  return FREE_MODELS.some((m) => m.id === id);
}

/** Unbekannte oder bezahlte Modelle fallen auf den kostenlosen Standard zurück. */
export function normalizeModel(id) {
  return isFreeModel(id) ? id : DEFAULT_MODEL;
}
