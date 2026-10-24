# Burnout-Vermeidung: Ideen für Kaloriq

Ein Kalorienzähler-Burnout entsteht durch ständigen Perfektionsdruck, manuelle
Eingaben, Benachrichtigungen und Schuldgefühle beim Tracking von Lebensmitteln.

Kaloriq ist offline-first und komplett privat. Gerade deshalb kann es sich
bewusst von klassischen Trackern abgrenzen: **Dranbleiben belohnen statt
Perfektion verlangen.**

> Stand: 24.10.2026 · Umgesetzt: **Minimalmodus** und **Flexbereich** (1.2.6),
> **Gnaden-Tage** (1.2.9), **Pausenmodus** (1.2.10).

---

## 1) Kleine Änderungen (sehr schnell umsetzbar)

| Idee | Nutzen | Aufwand | Bemerkung | Status |
|---|---|---|---|---|
| **Flexbereich statt „zu viel/zu wenig“** | Reduziert Schuldgefühle enorm | Gering | Statt einer harten Zielgrenze gilt ein Bereich von ±5–15 % als „im Rahmen“. Der Ring bleibt neutral statt knallrot. | **Umgesetzt (1.2.6)** |
| **Wöchentlicher Fokus statt Tagesdruck** | Weniger Druck pro Tag | Gering | Im Fortschritt oder direkt im Tagebuch den **7-Tage-Durchschnitt** prominenter anzeigen. Der Tagesring bleibt, rückt aber nicht mehr in den Mittelpunkt. | Idee |
| **Streak umdeuten („Aktive Tage“ statt „Perfekt getrackt“)** | Bricht den „Alles-oder-Nichts“-Effekt | Gering | Ein Streak wirkt schnell wie eine Pflicht. Schon **1 Eintrag** reicht, um den Tag als „aktiv“ zu zählen. | Idee |
| **Neutrale Sprache & Texte** | Psychologisch wirkungsvoll | Gering | „Du hast X kcal übrig“ oder „Überschritten“ durch neutralere Varianten ersetzen („X kcal im Rahmen“, „Spielraum“). Direkt in `public/js/i18n.js` möglich. | Teilweise umgesetzt (1.2.6) |

## 2) Mittlere Features (sehr lohnenswert)

| Idee | Nutzen | Aufwand | Bemerkung | Status |
|---|---|---|---|---|
| **Handportionen-Modus** | Weniger manuelles Suchen/Abwiegen | Mittel | Statt Gramm nur „klein/mittel/groß“ auswählen (z. B. Faust, Handfläche, Daumen). Praktisch für Restaurant, Kantine oder Faul-Tage. | Idee |
| **„Rough Log“** | Minimale Reibung | Mittel | Ein Knopf „Schnell eintragen“ pro Mahlzeit: nur Kategorie + grobe Schätzung („leicht“, „normal“, „reichhaltig“) – keine exakten Grammangaben. | Idee |
| **Grace-Days** | Entspanntes Tracking | Mittel | Erlaubt z. B. 1–2 „Gnaden-Tage“ pro Monat, die den Streak **nicht** brechen. Komplett lokal in `store.js`. | **Umgesetzt (1.2.9)** |
| **Minimalmodus („Mindful Mode“)** | Für Phasen, wo Zahlen triggern | Mittel | Schalter unter **Profil → Wohlbefinden**. Versteckt Tagesring, Kalorienziel, Makros und Wochenbilanz. Zeigt Mahlzeiten, Wasser, Schritte, Gewicht und Verlauf. | **Umgesetzt (1.2.6)** |

## 3) Größere Ideen (ambitioniert, aber einzigartig)

| Idee | Nutzen | Aufwand | Bemerkung | Status |
|---|---|---|---|---|
| **Hunger-Sättigungs-Check** | Weg von „Ziel erreichen“, hin zu Körpersignalen | Hoch | Vor/nach einer Mahlzeit kurz 1–10 abfragen (Hunger/Sättigung). Komplett optional, nichts erzwingend. Würde Kaloriq sehr einzigartig machen. | Idee |
| **„Nur heute drüber“ / Pausenmodus** | Mentale Auszeiten | Hoch | „Tracking pausieren“ für ein paar Tage. Daten bleiben erhalten, Streak wird eingefroren, kein Druck, keine Erinnerungen. | **Umgesetzt (1.2.10)** |
| **Fokus auf Nicht-Zahl-Erfolge** | Verlegt Erfolg weg von kcal | Hoch | Kleine Liste wie „Wasser getrunken“, „Spaziergang gemacht“, „bewusst gegessen“. Kein Gamification-Bingo, sondern sanftes Feedback. | Idee |

---

## Mein Favorit für den Anfang

**Minimalmodus + Flexbereich.** Beide sind minimal-invasiv, brechen keine Regeln
aus `AGENTS.md` und lösen genau die Kernpunkte: *Perfektionsdruck* und
*Schuldgefühle*. Ein Tracker, der dir aktiv vorschlägt, *weniger* zu tracken
anstatt *besser*, ist ziemlich einzigartig.

**Datei:** `BURNOUT_IDEEN.md` (im Projektordner)
