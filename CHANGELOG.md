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
