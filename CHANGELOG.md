# Changelog

Alle nennenswerten Änderungen an **Kaloriq**. Die Versionen folgen
[SemVer](https://semver.org/lang/de/): Patch für Fixes, Minor für neue
Funktionen, Major für Brüche.

> Die Stände **1.1.6 bis 1.2.1** entstanden am 22.10.2026. Ältere Versionen
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
   - `android-app/android/app/build.gradle` → `versionName` + `versionCode`
   - `dist/` → Upload-Paket wird direkt neu gebaut
3. **Testen** – Desktop (Chrome/Edge), Android-PWA und die installierte APK:
   Tagebuch, Wasser, Schritte, Fortschritt, Fasten, Profil, Offline-Start,
   Daten nach einem Update. Neue JS-Dateien zusätzlich in die `SHELL`-Liste von
   `public/sw.js` eintragen, sonst fehlen sie offline.
4. **APK bauen** – `npm run apk` erzeugt `Kaloriq-<Version>.apk`, signiert mit
   dem lokalen Schlüssel unter `android-app/keystore/`. Der Schlüssel und sein
   Passwort werden **niemals** committet.
5. **Veröffentlichen** – Commit und Push nach `main`, APK als GitHub-Release
   anhängen. Updates werden über die bestehende Installation installiert; die
   Daten bleiben erhalten.

**Datensicherheit bei jedem Schritt:** Der Zustand liegt in `localStorage`
(`kaloriq.state.v1`). `migrate()` ergänzt nur fehlende Felder und löscht keine
Tage, Gewichte oder Einträge. Vor Import und Zurücksetzen wird automatisch ein
Snapshot angelegt; zusätzlich existieren automatische Sicherungen (alle 12
Stunden, maximal drei Stände) und der JSON-Export.

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
