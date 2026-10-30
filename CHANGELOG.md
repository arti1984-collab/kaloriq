# Changelog

Alle nennenswerten Änderungen an **Kaloriq**. Die Versionen folgen
[SemVer](https://semver.org/lang/de/): Patch für Fixes, Minor für neue
Funktionen, Major für Brüche.

> Die Stände **1.1.6 bis 1.2.5** entstanden am 22.10.2026. Ältere Versionen
> wurden nicht einzeln dokumentiert; ihre Funktionen sind unter
> [Basisversion](#basisversion-vor-116) zusammengefasst.

---

## Entwicklungsablauf

Kaloriq ist eine **PWA ohne Bundler und ohne npm-Abhängigkeiten**: reine
ES-Module, die der Browser direkt lädt. Die Android-App wird mit Capacitor aus
demselben Quellstand gebaut. Jede Änderung durchläuft denselben Ablauf:

1. **Änderung in `public/`** – Code, Styles, Texte, Manifest oder Icons.
2. **Version erhöhen** – `npm run bump` (oder `npm run bump 1.2.0`). Das Skript
   aktualisiert gemeinsam:
   - `package.json` → `version`
   - `public/js/version.js` → `APP_VERSION` (Anzeige unter **Profil**)
   - `public/sw.js` → Cache-Name (`kaloriq-vN`), damit die App-Shell frisch lädt
   - `public/version.json` → Version + Datum für den Update-Hinweis
   - `android-app/android/app/build.gradle` → `versionName` + `versionCode`
   - `dist/` → Upload-Paket wird direkt neu gebaut
3. **Testen** – Desktop (Chrome/Edge/Safari), Android-PWA und die installierte
   APK: Tagebuch, Wasser, Schritte, Fortschritt, Fasten, Profil, Offline-Start,
   Daten nach einem Update; den Browser-Barcode-Scanner zusätzlich in Safari
   bzw. auf dem iPhone. Neue JS-Dateien zusätzlich in die `SHELL`-Liste von
   `public/sw.js` eintragen, sonst fehlen sie offline.
4. **APK bauen** – `npm run apk` erzeugt `Kaloriq-<Version>.apk`, signiert mit
   dem lokalen Schlüssel unter `android-app/keystore/`. Der Schlüssel und sein
   Passwort werden **niemals** committet.
5. **Veröffentlichen** – Commit und Push nach `main`, APK als GitHub-Release
   anhängen. Updates werden über die bestehende Installation installiert; die
   Daten bleiben erhalten.

**Datensicherheit bei jedem Schritt:** Der Zustand liegt in `localStorage`
(`kaloriq.state.v1`) und wird zusätzlich in IndexedDB (`kaloriq.storage.v1`)
gespiegelt. `migrate()` ergänzt nur fehlende Felder und löscht keine Tage,
Gewichte oder Einträge. Beim Start stellt die App die Zweitkopie wieder her,
falls `localStorage` fehlt, beschädigt oder älter ist. Vor Import und
Zurücksetzen wird automatisch ein Snapshot angelegt; zusätzlich existieren
automatische Sicherungen (alle 12 Stunden, maximal drei Stände, ebenfalls in
IndexedDB gespiegelt) und der JSON-Export.

---

## [1.9.6] – 30.10.2026

### Geändert

- **Englische Texte vervollständigt:** App-Sperre (Sperrbildschirm, Sheet,
  PIN-vergessen, Pausen-Auswahl), Barcode-Cache, Health Connect (Import-Button,
  Abschnitt „Nährwerte & Wasser“, Aktivitäten-Hinweise) und die
  Fasten-Erinnerung sind im englischen Modus vollständig übersetzt.
- Fasten-Ansicht: Status („Heute abgeschlossen“), die Pille „✅ Ziel erreicht“,
  Wochentage und „… h gefastet“ folgen jetzt der Sprache; Wochentage kommen aus
  `toLocaleDateString(locale())` statt aus einer deutschen Tabelle.
- Neue Übersetzungen als Wörterbuch-Einträge und Muster in `i18n.js` – keine
  Änderung an Logik oder Daten.

### Getestet

- Englischer Modus im Browser: Sperrbildschirm inkl. „PIN vergessen“, App-Sperre-Sheet,
  Barcode-Cache-Sheet, Health-Connect-Sheet (mit nachgebildeter Brücke) und
  Fasten-Tab enthalten keine deutschen Reste mehr; deutscher Modus unverändert.
- `npm run bump`, `npm run build:static` und `npm run apk` laufen durch.

---

## [1.9.4] – 30.10.2026

### Hinzugefügt

- **Fasten-Erinnerung:** Im Fasten-Tab zwei Schalter – „Erinnerung ans
  Fasten-Ende“ und optional „30 Minuten vorher“. Die Einstellungen liegen unter
  `settings.fastReminders` und `settings.fastReminderBefore` (0 oder 30).
- **System-Alarme (APK):** `ReminderScheduler.scheduleFast()` plant zwei
  separate Alarme (Ende + Vorab-Hinweis) mit eigenen Request-Codes und
  `setAndAllowWhileIdle` (kein Sonderrecht für exakte Alarme nötig).
  `cancelFast()` räumt beide ab, `rescheduleFast()` stellt sie nach einem
  Geräteneustart wieder her (`BootReceiver`).
- **Eigene Benachrichtigungen:** `ReminderReceiver` unterscheidet jetzt
  `fast_end` und `fast_soon`; Texte in `strings.xml` („Fasten-Ziel erreicht“,
  „Noch 30 Minuten“). Ein Tipp öffnet den Fasten-Tab.
- **In-App-Fallback (PWA):** Ohne System-Erinnerungen meldet die App beim
  Erreichen des Ziels einen ruhigen Toast, solange sie offen ist.

### Geändert

- `ReminderBridge` hat `scheduleFast`, `cancelFast` und `isFastEnabled`;
  die Benachrichtigungs-Berechtigung wird auch für Fasten-Alarme angefragt und
  ein verweigertes Recht schaltet die Erinnerung sauber ab.
- `widget.js` versteht die Aktion `fasting` (Öffnen des Fasten-Tabs aus der
  Benachrichtigung).

### Getestet

- `gradlew :app:compileDebugKotlin :app:compileDebugJavaWithJavac` läuft ohne
  Fehler (nur eine Deprecation-Notiz für `startActivityForResult`).
- Browser-Test mit nachgebildeter Reminder-Brücke: Schalter an → Schalter
  „30 Minuten vorher“ erscheint, Fastenstart plant `end` exakt 16 h später mit
  `before = 30`, Fasten beenden ruft `cancelFast` auf.
- Auf echter Hardware noch nicht geprüft: Benachrichtigung kommt erst zur
  Zielzeit; dafür APK installieren und einen kurzen Plan (14:10) nutzen.

---

## [1.9.3] – 30.10.2026

### Hinzugefügt

- **Health Connect – Aktivitäten lesen:** `readWorkouts()` liefert die
  Trainingseinheiten der letzten sieben Tage mit Titel, Datum, Dauer und – falls
  erlaubt – dem Verbrauch aus `TotalCaloriesBurnedRecord`. Das Sheet zeigt die
  Liste und den Verbrauch von heute; das Tagesziel bleibt unverändert.
- **Health Connect – schreiben (opt-in):** `writeDay()` schreibt die
  Tageswerte als `NutritionRecord` (kcal, Protein, KH, Fett) und
  `HydrationRecord` (Wasser). Eigene Einträge des Tages werden vorher gelöscht,
  damit mehrfaches Schreiben keine Kalorien doppelt zählt. Schalter:
  `settings.healthWriteNutrition` und `settings.healthWriteHydration`
  (Standard aus), Schreiben nur über „Heutige Werte schreiben“.
- **Getrennte Berechtigungen:** `requestExtras('exercise'|'write')` fragt
  Aktivitäten bzw. Schreiben separat an; `status()` meldet jetzt `exercise`,
  `nutrition` und `hydration`.
- Manifest: `READ_EXERCISE`, `READ_TOTAL_CALORIES_BURNED`, `WRITE_NUTRITION`,
  `WRITE_HYDRATION`.

### Geändert

- Das Health-Connect-Sheet zeigt fünf Berechtigungszeilen, drei
  Berechtigungs-Buttons, die Aktivitätenliste und die zwei Schreib-Schalter.
- Ohne erfasste Werte verweigert „Heutige Werte schreiben“ mit Hinweis, statt
  einen 0-kcal-Eintrag anzulegen.

### Getestet

- Kotlin kompiliert (`gradlew :app:compileDebugKotlin`).
- Browser-Test mit nachgebildeter Brücke: Statuszeilen, Aktivitätenliste
  („Laufen · Heute · 32 Min · 280 kcal“, Verbrauch heute 280 kcal), Schalter
  schreiben in die Einstellungen, „Heutige Werte schreiben“ sendet
  `{date, kcal, protein, carbs, fat, water, nutrition, hydration}` und meldet
  „Nach Health Connect geschrieben · Nährwerte, Wasser“.
- Auf echter Hardware (Health-Connect-App) noch nicht geprüft – dafür APK
  installieren und Berechtigungsdialoge einmal durchgehen.

---

## [1.9.2] – 30.10.2026

### Hinzugefügt

- **Barcode-Cache als Teil des App-Zustands:** Gescannte Produkte liegen jetzt
  unter `barcodeCache` im gespeicherten Zustand (bis 500 Einträge) und werden
  damit automatisch in Backup, Export, IndexedDB-Zweitkopie und Sicherungen
  mitgeführt. Der frühere `localStorage`-Stand (`kaloriq.barcode.v1`) wird
  einmalig übernommen (`settings.barcodeMigrated`), damit ein geleerter Cache
  leer bleibt.
- **Suche nutzt den Cache:** `searchBarcodeCache()` ergänzt die lokale
  Lebensmittelliste um gescannte Produkte (Name, Marke oder Barcode).
- **Profil → Barcode-Cache:** zeigt Anzahl und die neuesten Produkte, mit
  „Cache leeren“ nach Rückfrage.
- **Offline-Hinweis beim Scannen:** Ohne Netz und ohne Cache erklärt die App,
  warum das Produkt fehlt, statt eine generische Fehlermeldung zu zeigen.

### Geändert

- `store.set(..., 'barcode')` löst kein Neu-Rendern der Ansicht aus, damit das
  offene Hinzufügen-Sheet beim Cachen nicht springt.

### Getestet

- Scan mit nachgebildeter Open-Food-Facts-Antwort: Produkt landet unter
  `barcodeCache`, ein zweiter Aufruf löst keinen Netzaufruf mehr aus.
- Suche nach „müsli“ findet das gescannte Produkt; Alter Stand aus
  `kaloriq.barcode.v1` wird beim Start einmalig übernommen (1 Produkt).
- Cache leeren: Rückfrage, danach 0 Produkte, Zeile im Profil zeigt „Noch
  keine gescannten Produkte gespeichert“; nach Neuladen bleibt der Cache leer.

---

## [1.9.1] – 30.10.2026

### Hinzugefügt

- **App-Sperre:** Neuer Eintrag unter **Profil → App-Sperre**. Ein 4- bis
  6-stelliger PIN sperrt die App beim Start und – je nach Einstellung – nach
  1, 5 oder 30 Minuten im Hintergrund. Bei „Sofort“ ist die App nach jedem
  Wechsel wieder zu.
- **`lock.js`:** PIN wird per PBKDF2/SHA-256 (210.000 Runden, zufälliges Salt)
  gehasht; ohne `crypto.subtle` (unverschlüsseltes LAN) greift eine
  SHA-256-Kette. Kein Klartext-PIN im Speicher, keine Wiederherstellung.
- **Gerätesperre (APK):** `LockBridge.java` fragt über `KeyguardManager` den
  Fingerabdruck, das Gesicht oder das Entsperrmuster des Handys ab. In der PWA
  bleibt es beim PIN.
- **PIN vergessen:** eigener Hinweis im Sperrbildschirm – ohne PIN bleibt nur
  das Zurücksetzen (mit ausdrücklicher Bestätigung und Sicherung vorher).
- Einstellungen unter `settings.appLock` (`salt`, `hash`, `iterations`,
  `after`, `biometric`); `migrate()` ergänzt das Feld bei alten Ständen.

### Geändert

- `app.js` sperrt vor dem ersten Rendern, damit keine Daten aufblitzen.
- Neues Schloss-Symbol in `ui.js`, Sperrbildschirm-Styles in `app.css`,
  `/js/lock.js` in der `SHELL`-Liste des Service Workers.

### Getestet

- PIN gesetzt (1234): `settings.appLock` enthält Salt und Hash, keinen PIN.
- Neustart: Sperrbildschirm erscheint, `.app` bleibt verdeckt; falscher PIN
  meldet „PIN stimmt nicht“, der richtige entsperrt ohne Konsolenfehler.
- Einstellungen: Pause, PIN ändern und „Sperre entfernen“ schreiben sofort in
  den Zustand; bestehende Einträge bleiben unverändert.

---

## [1.9.0] – 29.10.2026

### Hinzugefügt

- **Tag als Vorlage:** Im Tagebuch öffnet das neue Kopier-Symbol oben ein Sheet
  mit den letzten Tagen, die Einträge haben – neueste zuerst, mit Anzahl und
  Kalorien. Ein anderes Datum lässt sich über ein Datumsfeld wählen.
  „Wasser mitnehmen“ übernimmt die Trinkmenge, aber nur wenn der Zieltag noch
  keine hat (keine Doppelzählung).
- **`copyDayFrom()` in `store.js`:** legt alle Einträge des Quelltags mit neuen
  IDs und `copiedFrom` an; Mahlzeit, Menge und Nährwerte bleiben gleich.
  Die Kopien sind eigenständig – Änderungen am Zieltag berühren die Vorlage
  nicht.
- **Sicherheitsnetz:** Hat der Zieltag schon Einträge, fragt die App vor dem
  Einfügen nach; leere oder unbekannte Quellen werden mit einem Hinweis
  abgefangen, das Sheet bleibt dann offen.
- Neues Kopier-Symbol in `ui.js`.

### Geändert

- `app.css`: `.topbar .sub` bleibt einzeilig (`nowrap` + Ellipsis), damit die
  Kopfzeile mit vier Aktionen auf schmalen Geräten nicht umbricht.

### Getestet

- Vorlage von gestern nach heute: 3 Einträge (Frühstück + Mittag) landen mit
  identischen Mengen und Nährwerten im Tagebuch, Kalorien und Makros im Ring
  stimmen (1.786 kcal), Wasser wird auf 1.500 ml übernommen.
- Zweites Kopieren auf denselben Tag: Rückfrage „Tag enthält schon Einträge“,
  danach 6 Einträge; Wasser bleibt bei 1.500 ml und meldet „Wasser nicht
  übernommen – hier schon erfasst“.
- Leerer Verlauf: keine Vorschläge, Kopieren meldet „Dieser Tag hat keine
  Einträge“; gleicher Tag meldet „Das ist bereits der angezeigte Tag“.
- Keine Konsolenfehler, Sheets schließen sauber, bestehende Daten unverändert.

---

## [1.8.0] – 29.10.2026

### Hinzugefügt

- **Darstellung wählbar:** Profil → Darstellung mit drei Optionen – **Hell**,
  **Dunkel** und **Automatisch** (folgt der Systemeinstellung). Die Wahl liegt
  in `settings.theme`, gilt sofort für alle Ansichten und bleibt nach einem
  Neustart erhalten.
- **Neues Modul `public/js/theme.js`:** setzt `data-theme` am `<html>`, pflegt
  `color-scheme` und die Farbe der Statusleiste (`meta[name=theme-color]`) und
  horcht bei „Automatisch“ auf Systemwechsel.
- **Kein Aufblitzen:** Ein kurzes Inline-Skript in `index.html` liest die
  gespeicherte Wahl vor dem Laden des CSS und setzt die Darstellung, bevor die
  Oberfläche zum ersten Mal gezeichnet wird.

### Geändert

- `app.css`: Die dunklen Farben hängen nicht mehr an
  `@media (prefers-color-scheme: dark)`, sondern an `:root[data-theme="dark"]`.
  Zwei Sonderregeln (`.card`, `.ai-note`) wurden mit umgestellt.
- `app.js` wendet die Darstellung beim Start und nach Sicherung/Import/Zurück-
  setzen an (`hydrate`, `settings`, `replace`, `reset`).
- Profilzeile „Darstellung“ zeigt die aktuelle Wahl mit passendem Symbol
  (Sonne, Mond, Kontrast) und öffnet ein Auswahl-Sheet.
- Neue Wörterbuch-Einträge für Deutsch und Englisch.

### Getestet

- Wechsel Hell → Dunkel → Automatisch: Hintergrund, Karten, Text und
  Statusleistenfarbe ändern sich sofort; Profilzeile aktualisiert sich.
- Nach Reload bleibt die Wahl erhalten (`settings.theme`), Start ohne
  helles Aufblitzen im Dunkelmodus.
- „Automatisch“ folgt der Systemeinstellung und reagiert auf deren Wechsel.
- Keine Konsolenfehler; vorhandene Daten und Einstellungen unverändert.

---

## [1.7.0] – 29.10.2026

### Hinzugefügt

- **Rezept-Import per URL:** Im Rezept-Kopf gibt es jetzt ein Link-Symbol. URL
  einer Rezeptseite einfügen, und Kaloriq liest die hinterlegten Rezeptdaten
  (JSON-LD/schema.org): Titel, Zutaten, Portionen, Zeit, Tags und Schritte.
  Vor dem Speichern erscheint eine Vorschau mit geschätzten Kalorien und Makros.
- **Mengen-Heuristik:** Angaben wie `500 g`, `250 ml`, `1 EL`, `½ TL`,
  `1 1/2 Tassen`, `2 Zehen`, `3 Scheiben` werden in Gramm übersetzt; bei Stück-
  Angaben („2 Tomaten“) nutzt Kaloriq die haushaltsübliche Portionsgröße.
- **Nährwerte aus der lokalen Datenbank:** Passende Zutaten werden automatisch
  mit ihren Werten pro 100 g ergänzt (auch Pluralformen wie „Tomaten“ →
  „Tomate“). Nicht erkannte Zutaten bleiben bei 0 und lassen sich über
  **Anpassen** im Editor nachtragen.
- **Native Fetch-Brücke (APK):** `FetchBridge.java` lädt die Seite am CORS-
  Schutz des WebViews vorbei. Nur öffentliche Seiten, nur Lesen, nichts wird
  gesendet oder gespeichert.

### Geändert

- Rezept-Kopf: neues Link-Symbol für den URL-Import; die JSON-Datei bleibt
  über das Upload-Symbol erreichbar.
- `recipes.js`: `parseIngredientString`, `matchLocalFood` und
  `fetchRecipeFromUrl` sind exportiert und einzeln testbar.
- Neue UI-Texte im Wörterbuch (Deutsch/Englisch), u. a. „Von URL importieren“,
  „Anpassen“, „Speichern“.

### Getestet

- Import einer Testseite mit `@graph`: Titel, 6 Zutaten mit Gramm und Makros,
  Portionen (2), Zeit (35 Min.), Tags und Schritte korrekt übernommen.
- Mengen-Heuristik: `½ TL Salz` → 2,5 g, `1 1/2 Tassen Reis` → 300 g,
  `0,5 l Milch` → 500 g, `2 Dosen Tomaten` → 800 g.
- Fehlerfälle: Seite ohne JSON-LD, ungültige Domain, CORS-Block im Browser –
  jeweils verständliche Meldung, kein Konsolenfehler.
- „Anpassen“ öffnet den Editor mit allen Zutaten und Mengen; „Speichern“ legt
  das Rezept lokal ab und zeigt es in der Liste.

---

## [1.6.1] – 28.10.2026

### Geändert

- **Update-Prüfung viel früher:** statt nach 2,4 Sekunden jetzt **250 ms nach
  dem Start**. Zusätzlich bei jeder Rückkehr in die App (max. alle zwei
  Minuten), alle zwölf Minuten im Vordergrund und sofort nach dem Wieder-
  verbinden. Die alte sechsstündige Sperre entfällt.
- **Service Worker wird mitgeprüft:** Jede Prüfung stößt `registration.update()`
  an; ein wartender Worker wird per `SKIP_WAITING` sofort aktiviert. Der
  Service Worker versteht dafür jetzt die Nachricht.
- **Punkt am Profil-Tab:** Ein kleiner grüner Punkt zeigt ein verfügbares
  Update, auch wenn der Banner weggetippt wurde. Das Profil zeigt weiterhin
  „Version X · Y verfügbar“ und „Neu“.
- **Banner überdeckt keine Sheets mehr** (z-index unter dem Backdrop).
- **Onboarding:** Nach dem Abschluss wird die Prüfung direkt gestartet, nicht
  erst beim nächsten App-Start.

### Getestet

- Banner erscheint ca. **0,5 s** nach dem Start bei simulierter neuer Version.
- Wegtippen bleibt pro Version gespeichert; der Punkt bleibt als Erinnerung.
- Reload innerhalb der Sperrzeit zeigt die bekannte Version sofort, ohne
  erneuten Netzaufruf.
- Manuelle Prüfung im Profil, „aktuell“-Fall, Deutsch/Englisch, keine
  Konsolenfehler.

> **Hinweis:** Schneller wird es ab 1.6.1. Bereits installierte 1.6.0-Versionen
> prüfen noch mit dem alten Rhythmus – einmal aktualisieren, danach greift das
> neue Verhalten.

---

## [1.6.0] – 28.10.2026

### Hinzugefügt

- **Wochenplan als Tab:** Der Plan ist jetzt der fünfte Eintrag in der
  Tabbar (Tagebuch, Fortschritt, Plan, Fasten, Profil). Der Foto-Button
  (KI-Tracking) sitzt dafür unten rechts über der Tabbar.
- **Monatsrückblick als Bild:** Im Fortschritt öffnet das Teilen-Symbol eine
  Karte (1080×1350) mit Tagen, Ø Kalorien, Wasser-Tagen, kleinen Erfolgen,
  längster Serie des Monats, Gewicht inkl. Veränderung und dem Kalorienverlauf.
  Monate lassen sich durchblättern; die Karte wird gespeichert oder über die
  Systemfreigabe geteilt.
- **Datenschutz der Karte:** Sie enthält nur zusammengefasste Zahlen – keine
  Lebensmittelnamen, Notizen oder Profildaten.

### Geändert

- Tabbar ohne Lücken-Spacer; fünf gleichmäßige Tabs. Der FAB ist von der Mitte
  nach unten rechts gewandert, damit „Plan“ frei bleibt.
- Neues Modul `public/js/sharecard.js` (Statistik + Canvas) im SW-Cache.
- Fortschritt-Kopf hat jetzt ein Teilen-Symbol.

### Getestet

- Tab-Wechsel inklusive Plan; FAB-Position auf dem Tagebuch.
- Monatskarte mit Daten und ohne Daten, Monatswechsel, Speichern und
  Teilen-Fallback, Deutsch und Englisch, keine Konsolenfehler.

---

## [1.5.0] – 28.10.2026

### Hinzugefügt

- **Wochenplan:** Rezepte lassen sich pro Tag und Mahlzeit (Frühstück, Mittag,
  Abend, Snacks) einplanen. Portionen sind pro Eintrag einstellbar; die
  geplanten Kalorien stehen pro Tag in der Kopfzeile.
- **Ins Tagebuch:** Ein geplantes Rezept wird mit einem Tipp als Eintrag in den
  Tag übernommen – mit der gewählten Portionszahl.
- **Einkaufsliste:** Alle Zutaten der Woche werden automatisch
  zusammengerechnet (gleiche Namen addiert, Gramm zu Kilogramm), nach
  Kategorien gruppiert und pro Woche abhakbar gespeichert. Eigene Artikel wie
  „Spülmittel“ lassen sich ergänzen und löschen.
- **Teilen:** Die offene Einkaufsliste geht als Text über die Systemfreigabe
  oder in die Zwischenablage.
- **Einstiege:** Profil → „Wochenplan & Einkauf“, das Kalender-Symbol im
  Tagebuch und der Kopf der Rezeptansicht.

### Geändert

- Neue Module `public/js/plan.js` (Datum, Kategorien, Summierung) und
  `public/js/views/mealplan.js`; beide stehen im Service-Worker-Cache.
- Beim Löschen eines Rezepts werden auch seine geplanten Einträge entfernt,
  damit keine unsichtbaren Leichen bleiben.
- Eigene Artikel und Häkchen liegen pro Woche im Zustand
  (`shopping['YYYY-MM-DD']`), der Plan in `mealPlan`; Migration ergänzt nur
  fehlende Felder.

### Getestet

- Planen, Portionen ändern, Entfernen und „Ins Tagebuch“ inklusive
  Nährwertübernahme.
- Einkaufsliste mit mehreren Rezepten: Summierung, Kategorien, Häkchen,
  Fortschritt, eigene Artikel, Haken zurücksetzen, Teilen-Text.
- Deutsch und Englisch, keine Konsolenfehler.

---

## [1.4.4] – 27.10.2026

### Behoben

- **Health Connect ist jetzt immer sichtbar (APK):** Bisher wurde die Zeile
  ausgeblendet, wenn Health Connect fehlte oder ein Update brauchte – das wirkte
  wie „funktioniert nicht“. Jetzt zeigt sie den Status und bietet direkt
  „Health Connect installieren/öffnen“ an.
- **Status und Rechte einzeln:** Das Sheet zeigt, ob Health Connect verfügbar
  ist und ob Schritte und Gewicht gelesen werden dürfen. Fehlermeldungen werden
  als Detailzeile angezeigt.
- **Teilweise Rechte blockieren nichts mehr:** Schritte und Gewicht werden
  getrennt gelesen und importiert. Fehlt eine Berechtigung, bleibt der andere
  Wert nutzbar.
- **Leere Daten werden erklärt:** Health Connect enthält nur Werte, die andere
  Apps (z. B. Google Fit oder Samsung Health) hineinschreiben. Kaloriq sagt das
  jetzt deutlich und verweist auf den eingebauten Schrittzähler, der unabhängig
  davon direkt am Gerät zählt.

### Geändert

- Neue Brückenfunktionen `status()` und `openSettings()`; `readToday()` liefert
  Schritte und Gewicht samt Fehlerliste getrennt.
- Health-Connect-Zeile im Profil zeigt „verbinden“, wenn noch keine
  Berechtigung erteilt ist.

### Getestet

- Zustände „verfügbar“, „Update nötig“ und „nicht installiert“ in Deutsch und
  Englisch; teilweise erteilte Berechtigungen; Import mit Daten und ohne Daten;
  Öffnen/Installieren-Button.
- **Hinweis:** Die echte Verbindung zu Health Connect und die Berechtigungs-
  dialoge lassen sich nur auf einem Android-Gerät abschließend prüfen.

---

## [1.4.3] – 25.10.2026

### Geändert

- **Nur Free-Tier-Modelle:** Die Modellauswahl ist fest auf kostenlose
  Gemini-Modelle begrenzt (`gemini-3.8-flash`, `gemini-3.6-flash`,
  `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`). Bezahlte Modelle werden
  nicht mehr angeboten oder geladen.
- **Kein geteilter Key:** Der Server-Proxy und die Option „Server-Proxy" sind
  entfernt. Jede Person trägt ihren eigenen Key ein; Anfragen gehen direkt von
  ihrem Gerät an Google. `server.mjs` liefert nur noch die statische App.
- **Modelle laden entfällt:** Statt aller Key-Modelle zeigt die App eine feste,
  kostenlose Auswahl. Die automatische Modell-Ermittlung bei einem gesperrten
  Modell bleibt – sie wählt jetzt ausschließlich Free-Tier-Modelle.
- **Migration:** Gespeicherte, nicht freie Modellnamen (z. B. `gemini-2.5-flash`)
  werden beim Start auf `gemini-3.8-flash` zurückgesetzt. Alte Proxy-Flags
  werden entfernt; Key, Einträge und Einstellungen bleiben erhalten.

### Getestet

- Modellauswahl zeigt nur die vier Free-Tier-Modelle, ohne „Laden" und ohne
  manuelles Eingabefeld; kein Proxy-Aufruf mehr.
- Direkter Aufruf mit eigenem Key (Header `x-goog-api-key`), Demo-Modus ohne Key.
- Fallback bei gesperrtem Modell wählt aus einer Liste mit bezahlten Modellen
  nur ein kostenloses; Deutsch und Englisch vollständig.

---

## [1.4.2] – 25.10.2026

### Behoben

- **GitHub Pages:** Der Service Worker wurde im Unterpfad `/kaloriq/` nicht
  mehr registriert, weil die Registrierung mit zusätzlichen Optionen am
  Pages-Build vorbeilief. Jetzt wird `./sw.js` relativ registriert (funktioniert
  an der Domain-Wurzel und im Unterpfad).
- **Versionsdatei im Unterpfad:** `version.json` wurde als `/version.json`
  geladen und lief auf GitHub Pages ins Leere. Die Adresse wird jetzt relativ
  zur App aufgelöst; die APK nutzt weiterhin die feste Web-Adresse.
- **Service Worker:** Die Ausnahme für `version.json` erkennt den Pfad jetzt
  unabhängig vom Unterpfad (der Pages-Build schreibt Pfadliterale um).

> 1.4.1 war nur kurz als Web-Stand online und wurde nicht als APK
> veröffentlicht. Release-Stand ist 1.4.2.

---

## [1.4.1] – 25.10.2026

### Hinzugefügt

- **Update-Hinweis:** Die App prüft beim Start und alle sechs Stunden
  `version.json` und meldet sich mit einem ruhigen Banner über der Navigation,
  sobald eine neue Version bereitsteht. Das Banner nennt die Neuerungen und
  lässt sich wegtippen.
- **Was ist neu:** Ein Tipp auf den Hinweis öffnet ein Sheet mit den
  Neuerungen der neuen Version (aus `public/version.json`) und dem Hinweis,
  dass Einträge und Einstellungen erhalten bleiben.
- **PWA-Update per Tipp:** „Jetzt aktualisieren“ lädt die neue Version über
  eine cachefreie Adresse; danach räumt die App den Parameter wieder aus der
  URL. In der APK führt der Hinweis direkt zur neuen APK.
- **Manuelle Prüfung im Profil:** Neue Zeile „App-Update“ mit installierter
  Version, verfügbarer Version und Status „aktuell“ bzw. „Neu“.

### Geändert

- **Service Worker:** Shell-Dateien werden mit `cache: 'no-cache'`
  revalidiert, damit Updates sofort ankommen; `version.json` wird nie
  gecacht. Registrierung mit `updateViaCache: 'none'`.
- **Update-Status bleibt erhalten:** Die zuletzt gemeldete Version liegt in den
  Einstellungen (`updateKnown`), damit der Hinweis einen Neustart übersteht,
  bis er weggetippt oder installiert wurde.
- **Versionierung:** `npm run bump` pflegt jetzt auch `public/version.json`
  (Version + Datum); die Neuerungen werden vor dem Release eingetragen.

### Getestet

- Banner, Details-Sheet, „Später“ (bleibt weg), manuelle Prüfung und der
  „aktuell“-Fall in Deutsch und Englisch; APK-Variante mit Release-Link.
- Keine Konsolenfehler; `?v=…` wird nach dem Update-Reload entfernt.
- **Hinweis:** Der Update-Hinweis greift ab 1.4.1. Bereits installierte
  1.4.0-APKs müssen einmal manuell aktualisiert werden.

---

## [1.4.0] – 25.10.2026

### Hinzugefügt

- **Health Connect (APK):** Liest auf Wunsch die heutigen Schritte und das
  zuletzt eingetragene Gewicht aus Android Health und übernimmt sie nach
  Bestätigung in Kaloriq. Es werden **keine** Gesundheitsdaten geschrieben.
  Die Berechtigungen laufen über den offiziellen Health-Connect-Dialog.
- **Android-Widget (APK):** Zeigt Kalorien, Wasser und Schritte auf dem
  Home-Bildschirm. „+ Wasser“ und „Schnell“ öffnen die App direkt im passenden
  Flow; die Werte werden bei Änderungen aus der App aktualisiert.
- **System-Erinnerung (APK):** Tägliche Android-Benachrichtigung zur gewählten
  Uhrzeit über AlarmManager, standardmäßig aus. Sie wird nach einem
  Geräteneustart wiederhergestellt; in der PWA bleibt die In-App-Erinnerung
  der Fallback.
- **Apple-Health-Hinweis:** In der Health-Connect-Ansicht und in der Doku steht
  klar, dass Apple Health aus PWA/Android nicht erreichbar ist und eine native
  iOS-App mit HealthKit voraussetzen würde.

### Geändert

- **Android minSdk auf 26** (Android 8.0) angehoben – Voraussetzung der
  Health-Connect-Bibliothek.
- Neue native Brücken: `HealthConnectBridge.kt`, `WidgetBridge.java`,
  `ReminderBridge.java`, `ReminderScheduler.java`, `ReminderReceiver.java`,
  `BootReceiver.java`, `KaloriqWidgetProvider.java`.
- Berechtigungen ergänzt: `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`,
  `health.READ_STEPS`, `health.READ_WEIGHT`.
- Health-Connect-Abhängigkeit und Kotlin/Koroutinen in den Android-Build
  aufgenommen. Die Web-App bleibt weiterhin ohne npm-Abhängigkeiten.

### Getestet

- Kotlin/Java kompilieren, Release-APK wird signiert gebaut; Manifest enthält
  Widget-Empfänger, Erinnerungs-Empfänger sowie Health- und
  Benachrichtigungsrechte.
- APK-Signatur und Version geprüft; Web-UI ohne native Brücken (PWA) lädt
  fehlerfrei und nutzt die In-App-Erinnerung.
- **Hinweis:** Das tatsächliche Health-Connect-Lesen, die Widget-Aktualisierung
  und die Benachrichtigung müssen auf einem echten Android-Gerät getestet
  werden; im Build-Umfeld ist kein Gerät angeschlossen.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v33`, Android `versionName 1.4.0` /
  `versionCode 10400`; signierte APK als GitHub-Release `v1.4.0`.

---

## [1.3.0] – 25.10.2026

### Hinzugefügt

- **Schnellzugriff im Tagebuch:** Zuletzt verwendete und favorisierte
  Lebensmittel stehen oben in der Suche. Favoriten lassen sich direkt im
  Mengen-Sheet markieren.
- **Gestern kopieren:** Eine leere Mahlzeit übernimmt mit einem Tipp alle
  Einträge derselben Mahlzeit vom Vortag.
- **Einträge bearbeiten:** Duplizieren, in eine andere Mahlzeit verschieben
  und nach dem Löschen per **„Rückgängig“** wiederherstellen.
- **Trackingsstil:** Genau, Grob oder Überblick – auswählbar im Onboarding
  und später unter **Profil → Wohlbefinden → Trackingsstil**. Der Stil setzt
  passende Voreinstellungen (z. B. Handportionen bei „Grob“, Minimalmodus bei
  „Überblick“), sperrt aber nichts.
- **Wochenrückblick ohne Druck:** Tage mit Einträgen, kleine Erfolge,
  Check-ins und Wasser-Tage im Fortschritt – ohne Kalorienbewertung.
- **Backup-Status und sanfte Erinnerung:** Die letzte Sicherung ist sichtbar;
  nach 14 Tagen erinnert Kaloriq einmal täglich ans Sichern.
- **Globaler Startfehler-Bildschirm:** Statt einer leeren Seite gibt es
  „Neu laden“ und „Daten als JSON sichern“.
- **Update-Hinweis:** Eine neue App-Version kann direkt neu geladen werden.
- **Feedback & Hilfe:** Problem oder Idee über GitHub melden; Version, Gerät
  und Sprache werden als Diagnose mitgegeben. Die Diagnose lässt sich auch
  kopieren.
- **CSV-Export:** Alle Einträge oder Tageswerte als CSV für Excel, Numbers
  oder Google Sheets.
- **Sanfte Erinnerung:** Standardmäßig aus. Wenn aktiviert, erscheint einmal
  beim nächsten Öffnen ein ruhiger Check-in-Hinweis – kein Push, keine
  Streak-Drohung.
- **PWA-Schnellaktionen:** „Schnell eintragen“ und „Wasser +250 ml“ als
  Startmenü-Shortcuts; Barcode-Produkte werden lokal zwischengespeichert und
  sind offline wiederverwendbar.
- **Barrierefreiheit:** sichtbarer Tastaturfokus, reduzierte Bewegung und
  klarere Beschriftungen für die neuen Aktionen.

### Geändert

- Der Trackingsstil beeinflusst die Standard-Mengeneingabe: „Grob“ startet
  mit Handportionen, „Genau“ mit Gramm.
- Einträge mit Quelle `rough` bleiben als grobe Schätzung markiert und lassen
  sich im Eintrag nur löschen; für eine andere Portionsgröße wird neu
  eingetragen.
- Die lokale Lebensmitteldatenbank umfasst 212 Einträge (siehe 1.2.14).

### Nicht enthalten

- **Health Connect / Apple Health**, ein echtes **Android-Widget** und
  **System-Push-Erinnerungen** bleiben native Folgearbeit. Die sanfte
  Erinnerung erscheint beim Öffnen der App; PWA-Schnellaktionen sind
  vorhanden. **Play-Store-Präsenz** ist weiterhin nicht Teil dieses Stands.

### Getestet

- Zuletzt/Favoriten, Gestern kopieren, Duplizieren, Verschieben und
  Rückgängig; Anzeige und Persistenz nach Reload.
- Trackingsstil Genau/Grob/Überblick inkl. Handportionen als Standard bei
  „Grob“; Onboarding-Auswahl und spätere Änderung.
- Wochenrückblick, Backup-Status, Feedback-Sheet, CSV-Export und
  PWA-Shortcuts (`quick`, `water`).
- Sanfte Erinnerung: Anzeige, Ausblenden und „Heute nicht“.
- Deutsch/Englisch, keine Konsolenfehler.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v32`, Android `versionName 1.3.0` /
  `versionCode 10300`; signierte APK als GitHub-Release `v1.3.0`.

---

## [1.2.14] – 24.10.2026

### Geändert

- **Lokale Lebensmitteldatenbank erweitert:** von rund 130 auf **212
  Einträge**. Neu sind unter anderem Roggenbrot, Vollkorntoast, Ciabatta,
  Bagel, Basmati- und Vollkornreis, Bulgur, Hirse, Gnocchi, Buttermilch,
  Kefir, Sojajoghurt, Parmesan, Cheddar, Hähnchenschenkel, Putenhack,
  Rindersteak, Forelle, Kabeljau, Seitan, Edamame, weiße Bohnen, Blumenkohl,
  Rosenkohl, Aubergine, Kürbis, Lauch, Rote Bete, Rucola, Pfirsich,
  Nektarine, Ananas, Kirschen, Pflaumen, Himbeeren, Johannisbeeren, Datteln,
  Cashewkerne, Pistazien, Haselnüsse, Sonnenblumen- und Kürbiskerne,
  Mandelmus, Popcorn, Salzstangen, Reiswaffeln, Müsliriegel, Apfelkuchen,
  Donut, grüner Tee, Espresso, Kakao, Apfelschorle, Limonade, Sekt,
  Kokoswasser, Bratwurst, Käsespätzle, Maultaschen, Chili con Carne,
  Gemüsecurry, Kartoffel- und Linsensuppe, Toast Hawaii, Flammkuchen,
  Porridge, Overnight Oats, Sandwich und Gyros.
- **Ballaststoffe:** Neue Einträge enthalten, wo sinnvoll, einen
  Ballaststoffwert. Das Datenmodell unterstützt dafür ein optionales neuntes
  Feld; bestehende Einträge bleiben unverändert.
- **Englische Suche:** Alle 212 lokalen Lebensmittel haben englische Namen
  und sind damit auch über englische Begriffe auffindbar.

### Getestet

- 212 Einträge, keine doppelten Namen, alle mit englischer Übersetzung.
- Suche auf Deutsch und Englisch (z. B. „Roggen“, „cauliflower“, „Edamame“,
  „Flammkuchen“, „tarte flambee“), Anzeige und Nährwerte.
- Build und APK; keine Konsolenfehler.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v31`, Android `versionName 1.2.14` /
  `versionCode 10214`; signierte APK als GitHub-Release `v1.2.14`.

---

## [1.2.13] – 24.10.2026

### Hinzugefügt

- **Handportionen-Modus:** In der Mengenauswahl lässt sich zwischen
  **Gramm** und **Handportion** umschalten. Klein/Mittel/Groß schätzen die
  Menge anhand der hinterlegten Portion (oder 100 g) – ganz ohne Waage.
  Die Grammzahl und die Nährwerte werden dabei weiterhin angezeigt.
- **„Schnell eintragen“ (Rough Log):** Pro Mahlzeit ein Knopf für eine grobe
  Schätzung: **Leicht**, **Normal** oder **Reichhaltig**. Die Kalorien und
  Makros richten sich nach dem Tagesziel (20/30/40 %), ein Name ist optional.
- Schnell-Einträge werden als **„grobe Schätzung“** markiert und können
  später wie jeder andere Eintrag bearbeitet oder gelöscht werden.

### Geändert

- Einträge mit `source: 'rough'` zeigen in der Tagebuchzeile „grobe
  Schätzung“ statt einer Grammangabe; die Quelle heißt „Schnell“.

### Getestet

- Handportionen: Umschalten, Klein/Mittel/Groß (bei 50-g-Portion →
  35/50/75 g), aktualisierte Nährwerte und Speichern.
- Schnell-Eintrag: Leicht/Normal/Reichhaltig (360/540/720 kcal bei
  1.800 kcal Tagesziel), Makros, optionaler Name, Mahlzeitwechsel und
  Anzeige im Tagebuch.
- Deutsch/Englisch inkl. dynamischer Labels und grober Schätzung; keine
  Konsolenfehler.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v30`, Android `versionName 1.2.13` /
  `versionCode 10213`; signierte APK als GitHub-Release `v1.2.13`.

---

## [1.2.12] – 24.10.2026

### Hinzugefügt

- **Kleine Erfolge / Fokus auf Nicht-Zahl-Erfolge:** Eine sanfte Karte im
  Tagebuch mit vier Erfolgen zum Antippen – **Wasser getrunken**,
  **Spaziergang gemacht**, **Bewusst gegessen** und **Mir Zeit genommen**.
- Kein Punktesystem, keine Serien, keine Belohnungen: ausgewählte Erfolge
  bekommen nur einen ruhigen Haken und den Satz „Das zählt auch – ohne Zahl.“
- Unter **Profil → Wohlbefinden → Kleine Erfolge** lässt sich die Karte
  ein- oder ausblenden. Standard: an.

### Geändert

- Tagesdaten haben ein zusätzliches Feld `wins`. `migrate()` ergänzt es bei
  bestehenden Tagen; Einträge, Check-ins und andere Daten bleiben unverändert.
  Die Erfolge werden mit Export, Import und Sicherungen gespeichert.

### Getestet

- Erfolge an- und abwählen, Persistenz nach Reload, Haken und sanfter Hinweis.
- Karte über den Profil-Schalter ausblenden; Tagebuch zeigt sie danach nicht
  mehr an.
- Deutsch/Englisch, bestehende Tage ohne `wins`, keine Konsolenfehler.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v29`, Android `versionName 1.2.12` /
  `versionCode 10212`; signierte APK als GitHub-Release `v1.2.12`.

---

## [1.2.11] – 24.10.2026

### Hinzugefügt

- **Hunger-Sättigungs-Check:** Pro Mahlzeit lässt sich optional ein
  Check-in mit zwei 1–10-Skalen erfassen – **Hunger vor dem Essen** und
  **Sättigung nach dem Essen**. Beide Angaben sind freiwillig; eine reicht
  auch.
- Der Check-in erscheint als dezente Zeile an jeder Mahlzeit im Tagebuch
  („Hunger & Sättigung“) und lässt sich dort öffnen, ändern oder löschen.
  Eine gewählte Zahl wird durch erneutes Antippen wieder entfernt.
- Unter **Profil → Wohlbefinden → Hunger & Sättigung** lässt sich die
  Funktion komplett ein- oder ausblenden. Standard: an.

### Geändert

- Die Tagesdaten haben ein zusätzliches Feld `checkins` pro Mahlzeit.
  `migrate()` ergänzt es bei bestehenden Tagen; vorhandene Einträge bleiben
  unverändert. Check-ins werden mit Export, Import und Sicherungen gespeichert.

### Getestet

- Check-in mit beiden Werten, nur einem Wert, Toggle zum Entfernen und
  Löschen; Anzeige in der Mahlzeitenzeile.
- Ausblenden über den Profil-Schalter; Tagebuch zeigt danach keine
  Check-in-Zeilen.
- Deutsch/Englisch, Sheet-Untertitel, 1–10-Skalen und bestehende Tage ohne
  `checkins`; keine Konsolenfehler.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v28`, Android `versionName 1.2.11` /
  `versionCode 10211`; signierte APK als GitHub-Release `v1.2.11`.

---

## [1.2.10] – 24.10.2026

### Hinzugefügt

- **Pausenmodus:** „Nur heute drüber“, 3 Tage, 1 Woche, 2 Wochen oder ein
  offenes Ende. Erreichbar unter **Profil → Wohlbefinden → Pausenmodus**
  sowie direkt im Tagebuch („Nur heute drüber“ bzw. „Pause machen“).
- Während der Pause sind Kalorienziel, Tagesring, Makros und Wochenbilanz
  ausgeblendet. Die Serie ist eingefroren, Einträge bleiben freiwillig und
  werden nicht bewertet.
- Pausenzeiträume werden lokal in `settings.pauses` gespeichert. Vergangene
  Pausentage bleiben auch nach dem Beenden eingefroren; Gnaden-Tage werden
  während einer Pause nicht verbraucht.
- Eine laufende Pause lässt sich verlängern oder verkürzen; ein offenes Ende
  ist ebenfalls möglich.

### Geändert

- Die bisherige Gentle-Pause (`gentlePaused`) wird beim Laden einmalig in
  einen offenen Pausenzeitraum übernommen. Die Pause ist jetzt unabhängig
  vom Sanften Modus und in Tagebuch, Fortschritt und Profil verfügbar.

### Getestet

- Pause für heute, 3/7/14 Tage und offenes Ende; Verlängern, Verkürzen und
  Beenden. Serie bleibt über pausierte Lücken erhalten, ohne Gnaden-Tage zu
  verbrauchen; Einträge während der Pause zählen normal weiter.
- Tagebuch- und Fortschrittskarte, Profil-Zeile und Sheet in Deutsch und
  Englisch; Migration der alten Gentle-Pause; keine Konsolenfehler.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v27`, Android `versionName 1.2.10` /
  `versionCode 10210`; signierte APK als GitHub-Release `v1.2.10`.

---

## [1.2.9] – 24.10.2026

### Hinzugefügt

- **Gnaden-Tage:** Pro Kalendermonat lassen sich **0–3** leere Tage
  festlegen, die die Serie nicht brechen. Standard sind 2. Die Einstellung
  liegt unter **Profil → Wohlbefinden** und zeigt, wie viele Gnaden-Tage
  diesen Monat genutzt wurden und wie viele noch übrig sind.
- Gnaden-Tage werden **automatisch** verbraucht, aber nur wenn sie
  tatsächlich eine Lücke zwischen zwei Einträgen überbrücken. Eine Phase
  ohne jegliche Einträge verbraucht keine Gnaden-Tage.
- Alles bleibt lokal in `store.js`; die Tagesdaten selbst werden nicht
  verändert. Es gibt keine Punkte, keine Benachrichtigungen und keine Strafe.
  Die Einstellung wirkt sofort auf bestehende Daten und kann einzelne Lücken
  in der aktuellen Serie bis zur Monatsgrenze überbrücken.

### Geändert

- `streak()` basiert jetzt auf `streakInfo()`. Tagebuch, Fortschritt und
  Profil zeigen die Serie inklusive Gnaden-Tagen; die Monatsgrenze wird
  berücksichtigt.

### Getestet

- Serie mit Lücken: Mit 2 Gnaden-Tagen bleibt die Serie über zwei leere Tage
  erhalten; der dritte leere Tag bricht sie. Mit 1 bzw. 0 Gnaden-Tagen
  verkürzt sich die Serie entsprechend.
- Ohne jegliche Einträge werden keine Gnaden-Tage verbraucht.
- Profil-Zeile und Auswahl-Sheet (de/en), Speichern, Neuladen und
  Bestandsdaten geprüft; keine Konsolenfehler.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v26`, Android `versionName 1.2.9` /
  `versionCode 10209`; signierte APK als GitHub-Release `v1.2.9`.

---

## [1.2.8] – 24.10.2026

### Hinzugefügt

- **Live-Schrittanzeige:** Die APK registriert zusätzlich den
  `TYPE_STEP_DETECTOR` (ein Ereignis pro Schritt) und zeigt neue Schritte
  sofort in der App an. Gespeichert wird weiterhin ausschließlich der
  kumulative `TYPE_STEP_COUNTER`; der Live-Puffer wird beim nächsten
  Zähler-Update verrechnet, damit nichts doppelt gezählt wird.

### Geändert

- Der Detektor wird im Hintergrund abgemeldet und beim Zurückkehren neu
  registriert. Das spart Energie und verhindert veraltete Live-Werte.
- Beim Stoppen oder bei fehlender Berechtigung wird der Live-Puffer
  zurückgesetzt; die bereits gespeicherten Schritte bleiben unverändert.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v25`, Android `versionName 1.2.8` /
  `versionCode 10208`; signierte APK als GitHub-Release `v1.2.8`.

---

## [1.2.7] – 24.10.2026

### Behoben

- **Schrittzähler (APK) reagiert schneller:** Der native Sensor meldet neue
  Werte jetzt höchstens alle **500 ms** statt alle 2 Sekunden an die App.
  Schritte, die innerhalb dieses Fensters eintreffen, gehen nicht mehr
  verloren – ein nachlaufendes Update zeigt immer den neuesten Stand.
- **Sofortiger Stand nach dem Zurückkehren:** Beim Wechsel aus dem
  Hintergrund wird der Sensor neu registriert. Android liefert dabei direkt
  den aktuellen Zählerstand, statt auf den nächsten Schrittschub zu warten.
- **Sensorrate:** Registrierung mit `SENSOR_DELAY_UI` statt
  `SENSOR_DELAY_NORMAL`, damit Werte zeitnaher ankommen.
- **Weniger Re-Renders:** Die App baut die Tagebuch-Ansicht nicht mehr bei
  jedem Sensor-Update komplett neu auf. Die Schritt-Anzeige wird über das
  Live-Event aktualisiert, was die Oberfläche flüssiger hält.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v24`, Android `versionName 1.2.7` /
  `versionCode 10207`; signierte APK als GitHub-Release `v1.2.7`.

---

## [1.2.6] – 24.10.2026

### Hinzugefügt

- **Minimalmodus:** Unter **Profil → Wohlbefinden** lässt sich der
  Minimalmodus einschalten. Er blendet Tagesring, Kalorienziel, Makros,
  Wochenbilanz und die Kalorien-Statistiken aus. Sichtbar bleiben Mahlzeiten,
  Wasser, Schritte, Gewicht und der Verlauf. Im Tagebuch und Fortschritt führt
  ein Knopf „Zahlen einblenden“ direkt zurück.
- **Flexbereich:** Ebenfalls unter **Profil → Wohlbefinden**. Statt einer
  harten Zielgrenze gilt ein Spielraum von **±5 %, ±10 % oder ±15 %** um den
  Richtwert. Innerhalb des Bereichs bleibt alles neutral („im Rahmen“), auch
  wenn einzelne Tage über dem Ziel liegen. Rote Zahlen, rote Makro-Balken und
  rote Wochenbalken entfallen in diesem Modus. Standard: ±10 %, abschaltbar.

### Geändert

- Der **Sanfte Modus** nutzt jetzt den Flexbereich (Standard ±5 %, bzw. die
  gewählte Toleranz) statt einer festen 5-%-Grenze. Der Wochenstatus und die
  Makro-Balken richten sich nach derselben Toleranz.
- Das Profil zeigt bei aktivem Flexbereich **„Richtwert“** und den Spielraum
  statt des Defizits. Das Tagebuch nennt den Wert entsprechend „Richtwert“.
- Bei „heute noch unter dem Richtwert“ steht neutral **„noch darunter“** –
  der Tag ist ja noch nicht vorbei.

### Getestet

- Minimalmodus in Tagebuch und Fortschritt (de/en): Ring, Ziel, Makros und
  Wochenbilanz verschwinden, Mahlzeiten/Wasser/Schritte/Gewicht bleiben.
- Flexbereich mit ±5/10/15 %: exakte Grenzen (z. B. 1.620–1.980 kcal bei
  1.800 kcal und ±10 %), „im Rahmen“ auch bei leichter Überschreitung,
  „etwas darüber“ oberhalb des Bereichs, keine roten Elemente.
- Flexbereich aus: klassische Anzeige mit Prozent-Pille und roter Warnung
  oberhalb des Ziels funktioniert unverändert.
- Kombination mit Sanftem Modus und Pause; Sprachumschaltung de/en;
  vorhandene Daten und Einstellungen bleiben bei allen Umschaltungen erhalten.

### Veröffentlicht

- Service-Worker-Cache `kaloriq-v23`, Android `versionName 1.2.6` /
  `versionCode 10206`. Signierte APK gebaut (`de.kaloriq.app`, gleicher
  Signaturschlüssel) und als GitHub-Release `v1.2.6` veröffentlicht.

---

## [1.2.5] – 22.10.2026

### Hinzugefügt

- **TikTok-Link:** Im Profil unter **App** und auf der GitHub-Projektseite
  verlinkt Kaloriq jetzt den Account
  [@kaloriq](https://www.tiktok.com/@kaloriq).

### Geändert

- Service-Worker-Cache auf `kaloriq-v22` erhöht; Android-`versionName` 1.2.5,
  `versionCode` 10205. `dist\` wurde neu gebaut.

### Getestet

- Profil-Link geprüft: öffnet `https://www.tiktok.com/@kaloriq` in einem neuen
  Tab (`target="_blank"`, `rel="noopener noreferrer"`).
- Signierte APK (`de.kaloriq.app`, `versionName 1.2.5`, `versionCode 10205`)
  gebaut, Signatur und Version geprüft und als GitHub-Release `v1.2.5`
  veröffentlicht.

---

## [1.2.4] – 22.10.2026

### Hinzugefügt

- **Lokale Rezepte:** Rezepte mit Titel, Portionen, Tags, Zutaten und
  Zubereitung anlegen, bearbeiten und löschen. Zutaten lassen sich aus der
  lokalen Datenbank übernehmen oder mit eigenen Nährwerten pro 100 g erfassen.
- **Nährwertberechnung:** Kalorien, Protein, Kohlenhydrate und Fett werden pro
  Portion und pro 100 g berechnet. Jede Zutat speichert einen Nährwert-
  Schnappschuss, damit Rezepte stabil bleiben.
- **Tagebuch-Übernahme:** Eine Rezeptportion wird als **ein** Eintrag mit
  Quelle „Rezept“ hinzugefügt; Datum, Mahlzeit und Portionszahl sind wählbar.
- **JSON-Austausch:** Alle Rezepte als `kaloriq-recipes`-Datei exportieren und
  wieder importieren. Importierte Rezepte werden über ihre ID zusammengeführt;
  vorhandene IDs werden aktualisiert.
- **Zugänge:** Rezept-Button im Tagebuch, eigener Eintrag unter **Profil →
  App** und die Route `#/recipes`. Deutsch und Englisch vollständig übersetzt.

### Geändert

- `state.recipes` ist Teil des bestehenden lokalen Zustands und damit in
  localStorage, IndexedDB-Zweitkopie, automatischen Sicherungen und im
  vollständigen JSON-Backup enthalten. Die Migration ergänzt nur das Feld.
- Tagebuch-Einträge behalten optional `recipeId`; die Eintragsanzeige markiert
  Rezepte mit einem Badge und die Detailansicht nennt die Quelle „Rezept“.
- Service-Worker-Cache auf `kaloriq-v21` erhöht; Android-`versionName` 1.2.4,
  `versionCode` 10204. `dist\` wurde neu gebaut.

### Getestet

- Rezept anlegen, Zutat aus der lokalen Datenbank übernehmen, Nährwerte
  bearbeiten, speichern, wieder öffnen und löschen.
- Portion (auch 0,5 / 1,5 / 2) ins Tagebuch übernehmen, Eintrag anzeigen und
  wieder entfernen.
- JSON-Import mit gültigen Rezepten sowie deutsche und englische Oberfläche.
- Signierte APK (`de.kaloriq.app`, `versionName 1.2.4`, `versionCode 10204`)
  gebaut, Signatur und Version geprüft und als GitHub-Release `v1.2.4` mit
  APK-Asset veröffentlicht.

---

## [1.2.3] – 22.10.2026

### Hinzugefügt

- **Schutz vor iOS-Speicherbereinigung:** Kaloriq fordert persistenten Speicher
  über `navigator.storage.persist()` an (Safari ab iOS 15.2) und versucht es
  beim ersten Tippen erneut, falls der Browser eine Nutzergeste verlangt.
- **IndexedDB-Zweitkopie:** Zustand, automatische Sicherungen und deren
  Zeitstempel werden zusätzlich in `kaloriq.storage.v1` gespeichert. Beim Start
  stellt `hydrateFromDurable()` die Kopie automatisch wieder her, wenn
  `localStorage` fehlt, beschädigt oder älter ist. Das Zurücksetzen der App
  bleibt Vorrang vor einer alten Sicherung.
- Lokal getestet: `localStorage` gelöscht und beschädigt → Zustand und
  Sicherungen wurden aus IndexedDB wiederhergestellt; leerer Erststart zeigt
  weiterhin das Onboarding.

### Geändert

- Der Start wartet höchstens 1,2 Sekunden auf die IndexedDB-Prüfung und rendert
  danach; eine späte Wiederherstellung löst automatisch ein Neu-Rendern aus.
- `saveSettings()` und `recalc()` aktualisieren `updatedAt`, damit die
  Wiederherstellung den neueren Stand erkennt.
- Der iOS-Speicherhinweis wurde aus README, README.en und INSTALL-IPHONE
  entfernt und durch die Beschreibung der persistenten Zweitkopie ersetzt.
  AGENTS.md, DEPLOY.md und ANDROID.md nennen das neue Speicherverhalten.
- Service-Worker-Cache auf `kaloriq-v20` erhöht; Android-`versionName` 1.2.3,
  `versionCode` 10203.

### Veröffentlicht

- GitHub Pages mit der IndexedDB-Wiederherstellung und signierte
  `Kaloriq-1.2.3.apk` als GitHub-Release `v1.2.3`.

---

## [1.2.2] – 22.10.2026

### Hinzugefügt

- **Barcode-Scanner für Safari und Firefox:** In Browsern ohne
  `BarcodeDetector` lädt Kaloriq beim ersten Scan die lokal mitgelieferte
  ZXing-JS-Bibliothek. Der Button **Scannen** öffnet die Kamera direkt im
  Bottom-Sheet; der erkannte EAN-/UPC-/Code-128-Code wird wie bisher an Open
  Food Facts übergeben.
- Chrome und Edge nutzen weiterhin den schnelleren nativen `BarcodeDetector`;
  die Android-APK weiterhin die native ZXing-Bridge. Die manuelle Eingabe der
  Nummer bleibt überall als Fallback verfügbar.
- Deutsche und englische Meldungen für Scanner-Laden, verweigerte
  Kamera-Berechtigung, fehlende Kamera und bereits verwendete Kamera.
- Der Scanner wurde lokal mit einer simulierten Kameraquelle und einem gültigen
  EAN-13 (`4008400403922`) bis zur Open-Food-Facts-Anzeige getestet.

### Geändert

- `@zxing/library` 0.21.3 als `public/vendor/zxing.min.js` mitgeliefert
  (Apache-2.0). Lizenz und Hinweis liegen unter `public/vendor/`; der
  Service-Worker-Cache enthält die Datei für den Offline-Start.
- Der Kamera-Stream wird bei **Abbrechen**, Moduswechsel, manueller Suche und
  Schließen des Sheets zuverlässig beendet.
- Service-Worker-Cache auf `kaloriq-v19` erhöht; Android-`versionName` 1.2.2,
  `versionCode` 10202.
- README, README.en, INSTALL-IPHONE und ANDROID.md beschreiben den
  Browser-Scanner. Die veralteten Hinweise zur fehlenden iPhone-Kamera und zur
  ausschließlich manuellen Eingabe wurden entfernt.
- Drittanbieter-Hinweise um ZXing JS ergänzt.

### Veröffentlicht

- GitHub Pages mit dem Safari-Scanner und signierte `Kaloriq-1.2.2.apk` als
  GitHub-Release `v1.2.2`.

---

## [1.2.1] – 22.10.2026

### Hinzugefügt

- **Nativer Barcode-Scanner in der APK:** Der Button **Scannen** öffnet die
  Kamera direkt in der App (ZXing, offline, ohne Google Play-Dienste). Der
  erkannte Code wird ins Barcode-Feld übernommen und über Open Food Facts
  gesucht. Die PWA nutzt weiterhin den `BarcodeDetector`; die manuelle Eingabe
  der Nummer bleibt überall möglich.
- Eigene Scanner-Activity im Hochformat. Die Web-App bleibt beim Zurückkehren
  erhalten; die Kamera-Berechtigung wird beim ersten Scan abgefragt.
- Klare Fehlercodes (`open_failed`, `no_code`, `read_failed`) mit deutschen und
  englischen Meldungen; Abbruch und Zeitüberschreitung werden abgefangen.

### Geändert

- Die APK-Hülle bindet `com.journeyapps:zxing-android-embedded:4.3.0` ein. Die
  Web-App selbst bleibt weiterhin ohne npm-Abhängigkeiten und Bundler.
- Service-Worker-Cache auf `kaloriq-v18` erhöht; Android-`versionName` 1.2.1,
  `versionCode` 10201.
- README, ANDROID.md und dieser Changelog beschreiben den nativen Scanner.
- Drittanbieter-Hinweise für ZXing (Apache-2.0) ergänzt.

### Behoben

- Englische Beschriftung des Scan-Buttons (`Scannen` → `Scan`).

### Veröffentlicht

- Signierte `Kaloriq-1.2.1.apk` als GitHub-Release `v1.2.1`.

> 1.2.0 war ein interner Build mit dem Scanner und wurde nicht veröffentlicht.

---

## [1.1.9] – 22.10.2026

### Behoben

- **Veraltete Sensorwerte:** Schritt-Ereignisse, die älter als fünf Minuten
  sind, werden verworfen. Dadurch entstehen nach langen Pausen oder einem
  späten App-Start keine falschen Tageswerte mehr.
- Der native Zähler und die manuell korrigierten Tageswerte bleiben auch nach
  einem Tageswechsel konsistent.

### Geändert

- Service-Worker-Cache auf `kaloriq-v16` erhöht; die App-Shell wird nach dem
  Update frisch geladen.
- Android-`versionName` 1.1.9, `versionCode` 10109.

### Veröffentlicht

- Signierte `Kaloriq-1.1.9.apk` als GitHub-Release.
- Screenshots, Funktionsbeschreibung und dieser Changelog ergänzt.

---

## [1.1.8] – 22.10.2026

### Behoben

- **Import und Schrittzähler:** Nach einem JSON-Import wird der gespeicherte
  Sensor-Zählerstand (`settings.stepCounter`) zurückgesetzt. Sonst hätte die
  Differenz aus importierten Tageswerten und dem kumulativen Hardware-Zähler
  zu falschen Schritten geführt.

### Technisch

- Import-Pfad setzt den Zählerstand auf `null`; der nächste Sensorwert dient
  als neue Basis.
- Interne APK-Testversion.

---

## [1.1.7] – 22.10.2026

### Hinzugefügt

- **Nativer Android-Schrittzähler** über `TYPE_STEP_COUNTER`:
  - `StepCounterBridge.java` liest den kumulativen Sensor, prüft die
    Berechtigung und übergibt die Werte an JavaScript.
  - `MainActivity.java` registriert die Brücke und den Lifecycle.
  - Manifest: `ACTIVITY_RECOGNITION` und optionales Step-Counter-Feature.
- Der Sensor zählt **auch bei geschlossener App** weiter. Beim nächsten Öffnen
  wird die Differenz zum letzten Stand dem aktuellen Tag gutgeschrieben.
- Umgang mit **Tageswechsel, Geräteneustart und langen Pausen**: Nach einem
  Reboot beginnt der Zähler neu; nach mehr als 20 Stunden ohne App-Kontakt wird
  der Stand neu gesetzt, statt eine willkürliche Differenz zu verteilen.
- Hinweise, Berechtigungs-Toasts und Texte auf Deutsch/Englisch.

### Geändert

- Der bisherige Bewegungssensor-Modus bleibt als PWA-Fallback erhalten; in der
  APK wird automatisch der native Sensor verwendet.
- Manuelle Korrektur und Tagesziel gelten in beiden Modi.

### Technisch

- `settings.stepCounter = { date, value, ts }` als Sync-Punkt.
- Interne APK-Testversion.

---

## [1.1.6] – 22.10.2026

### Hinzugefügt

- **Wasserzähler mit freier Eingabe:** Menge in `ml` oder `l` eintippen
  (z. B. `250`, `0,5`, `1 l`), dazu Schnellwerte (+250 ml, +500 ml, +750 ml,
  +1 l) und eine Minus-Taste.
- **Schrittzähler im Browser** über den Bewegungssensor (`DeviceMotion`):
  Tagesziel, Live-Anzeige, manuelle Korrektur und Speicherung pro Tag.
- Schritt-/Wasser-Texte und Statusmeldungen auf Deutsch und Englisch.

### Behoben

- **Schnellzugriff** auf dem Tagebuch repariert (Aktionen öffnen wieder die
  richtigen Sheets und übernehmen die Eingaben).

### Geändert

- Wasser- und Schritte-Karten im Tagebuch neu aufgebaut, inklusive
  Fortschrittsbalken und Tageswerten.

---

## Basisversion (vor 1.1.6)

Die ersten Stände wurden nicht einzeln dokumentiert. Sie umfassen die
Grundfunktionen, auf denen die späteren Versionen aufbauen:

- Onboarding mit Mifflin-St-Jeor-/PAL-Berechnung, Ziel und Tempo
- Tagebuch mit vier Mahlzeiten, Tagesring, Makros, Bearbeiten/Löschen,
  Tagesnavigation und Streak
- Lokale Lebensmitteldatenbank (~130 Einträge), Open-Food-Facts-Suche,
  Barcode-Eingabe/Scan, eigene Lebensmittel und Favoriten
- KI-Tracking per Foto oder Text (Gemini), inklusive Demo-Modus ohne Key
- Gewicht, BMI, Verlaufskurve, Prognose und Wochenauswertung
- Fasten-Pläne 14:10 bis 24 h mit Live-Timer
- Profil, Makro-Presets, Wasser-/Schrittziel, Deutsch/Englisch
- JSON-Export/-Import, automatische Sicherungen und Zurücksetzen
- PWA mit Offline-Cache, Install-Prompt und Service Worker
- Android-APK über Capacitor, signiert mit lokalem Keystore
- Optionaler Gemini-Proxy im Zero-Dependency-Server

---

## Dokumentation

- **README:** Screenshots aller vier Bereiche, ausführliche
  Funktionsbeschreibung, Entwicklungsablauf und Versionstabelle.
- **`docs/screenshots/`:** Einzelansichten (`tagebuch.png`, `fortschritt.png`,
  `fasten.png`, `profil.png`) und die 2×2-Montage `uebersicht.png`.
- **`ANDROID.md`:** APK-Bau, Signatur, nativer Schrittzähler und Grenzen.
- **`DEPLOY.md`:** feste Web-Adresse für Updates ohne Datenverlust.
