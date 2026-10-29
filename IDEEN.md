# Kaloriq – Ideen & nächste Schritte

Stand: 28.10.2026 · App-Version 1.6.1
Diese Datei ist die Arbeitsliste für kommende Features. Erledigte Vorschläge werden
entfernt, damit sie nicht doppelt vorgeschlagen werden.

## Top 5 (offen)

### 1. App-Sperre (PIN, optional Biometrie)

- **Warum:** Die App verspricht „alle Daten bleiben auf dem Gerät“. Eine Sperre
  schützt Einträge, Gewicht und Profil, wenn jemand das entsperrte Handy in die
  Hand bekommt.
- **Umfang:** 4–6-stellige PIN, optional Face-/Fingerabdruck; Sperre beim Start
  und nach X Minuten im Hintergrund; „PIN vergessen“ nur über Zurücksetzen.
- **Technik:** PIN als Hash (PBKDF2/SHA-256 mit Salt) in den Einstellungen,
  niemals im Klartext. Biometrie in der APK über einen Capacitor-Plugin oder
  native Bridge; PWA bleibt bei PIN. Kein Server, keine Wiederherstellung.
- **Aufwand:** klein
- **Status:** offen

### 2. Barcode-Cache offline

- **Warum:** Gescannte Open-Food-Facts-Produkte gehen heute verloren, sobald kein
  Netz da ist. Ein lokaler Cache macht den Scanner offline brauchbar.
- **Umfang:** Jedes gescannte Produkt lokal speichern (Barcode, Name, Marke,
  Nährwerte pro 100 g, Portion); Suche/Scan nutzt zuerst den Cache; Cache im
  Profil löschbar; Größe begrenzen (z. B. 500 Produkte).
- **Technik:** Neuer Zustandsbereich `barcodeCache` (Migration ergänzend),
  Treffer über `barcode`; Open Food Facts nur bei Cache-Miss.
- **Aufwand:** klein
- **Status:** offen

### 3. Health Connect erweitern

- **Warum:** Health Connect liest bisher nur. Wer seine Daten dort bündelt,
  erwartet auch, dass Kaloriq Nährwerte/Wasser dorthin schreibt und Aktivitäten
  liest.
- **Umfang (opt-in):**
  - Schreiben: Kalorien/Makros und Wasser als NutritionRecord/HydrationRecord.
  - Lesen: Workouts/Aktivitäten (Dauer, Kalorien) und daraus den Verbrauch
    anzeigen bzw. das Tagesziel optional anpassen.
  - Klare Schalter und Statusanzeige im Health-Connect-Sheet; nichts automatisch.
- **Technik:** `HealthConnectBridge` um Schreib-/Workout-Rechte erweitern,
  Manifest-Permissions ergänzen, Datentypen `NutritionRecord`, `HydrationRecord`,
  `ExerciseSessionRecord`. Berechtigungsdialog und Teil-Erfolge wie bisher.
- **Aufwand:** mittel
- **Status:** offen (Lesen von Schritte/Gewicht ist seit 1.4.4 umgesetzt)

### 4. Fasten-Erinnerungen

- **Warum:** Der Timer läuft, aber niemand erfährt vom Start oder Ende, wenn die
  App geschlossen ist. Das System-Erinnerungssystem existiert bereits.
- **Umfang:** Benachrichtigung zu Fastenstart und -ende, optional 30 Min. vorher;
  Schalter im Fasten-Bildschirm; in der PWA weiterhin nur In-App.
- **Technik:** `ReminderScheduler`/`ReminderReceiver` um Fasten-Alarme erweitern
  (eigene Request-Codes, eigener Kanal oder gemeinsamer Kanal), Zeiten aus
  `day.fast.start` + `hours`.
- **Aufwand:** klein
- **Status:** offen

### 5. Rezept-Import per URL

- **Warum:** Rezepte von Websites sind mühsam abzutippen. Ein Import spart viel
  Arbeit und macht die Rezeptsammlung attraktiver.
- **Umfang:** URL einfügen → Titel, Zutaten mit Mengen, Portionen und Schritte
  übernehmen; Vorschau vor dem Speichern; Fehlerfreundlich, wenn keine
  schema.org-Daten vorhanden sind.
- **Technik:** `fetch` + JSON-LD (`Recipe`) parsen, Zutaten-Strings in
  `{ name, grams }` umwandeln (Heuristik, editierbar), dann
  `normalizeRecipe`/`saveRecipe`. Nur auf Wunsch, kein Hintergrundabruf.
- **Aufwand:** mittel
- **Status:** umgesetzt in Version 1.7.0 (inkl. nativer Fetch-Brücke in der APK)

## Bereits umgesetzt (nicht mehr Teil der Liste)

- **Rezept-Import per URL** – Version 1.7.0 (JSON-LD, Mengen-Heuristik, Vorschau)
- **Wochenplan + Einkaufsliste** – Version 1.5.0 (Plan-Tab seit 1.6.0)
- **Monatsrückblick als Bild** – Version 1.6.0

## Weitere Kandidaten (nicht in den Top 5)

- Dark-Mode-Schalter (manuell hell/dunkel)
- Allergen-/Ernährungsfilter (vegetarisch, vegan, glutenfrei)
- Kompletten Tag duplizieren / als Vorlage
- Tablet-/Desktop-Layout mit zwei Spalten
- Fasten-Timer im Android-Widget
- Verschlüsselter Sync (WebDAV/Nextcloud, opt-in)
- Mehrere Profile auf einem Gerät
- Sport & Training mit Kalorienverbrauch
- Native iOS-App mit HealthKit
- Weitere Sprachen (Spanisch/Französisch)

## Bewusst nicht

Werbung, Social-Feed, Cloud-Pflicht, Play-Store-Zwang – das widerspricht
„keine Cloud, alle Daten bei dir“.
