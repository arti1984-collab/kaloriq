# Kaloriq

Kalorien-, Makro- und Fasten-Tracker mit KI-Foto-Erkennung – als installierbare Web-App (PWA), optimiert für **Android** (läuft genauso auf dem iPhone).

Eigenständige Implementierung der Funktionen bekannter Kalorien-Tracker. Keine fremden Marken oder Assets, keine Cloud: **alle Daten bleiben auf dem Gerät.** Für den nativen Barcode-Scanner der Android-APK wird ZXing (Apache-2.0) verwendet – siehe [Drittanbieter-Hinweise](THIRD_PARTY_NOTICES.md).

**Aktuelle Version: 1.2.1** · [Android-APK herunterladen](https://github.com/arti1984-collab/kaloriq/releases/tag/v1.2.1) · [Changelog](CHANGELOG.md)

![Kaloriq – Tagebuch, Fortschritt, Fasten und Profil](docs/screenshots/uebersicht.png)

> Screenshots mit Demo-Daten im hellen Design. Die App folgt automatisch dem Systemdesign (hell/dunkel).

---

## Screenshots

| Tagebuch | Fortschritt |
|---|---|
| [![Tagebuch](docs/screenshots/tagebuch.png)](docs/screenshots/tagebuch.png) | [![Fortschritt](docs/screenshots/fortschritt.png)](docs/screenshots/fortschritt.png) |

| Fasten | Profil |
|---|---|
| [![Fasten](docs/screenshots/fasten.png)](docs/screenshots/fasten.png) | [![Profil](docs/screenshots/profil.png)](docs/screenshots/profil.png) |

Alle Bilder liegen unter [`docs/screenshots/`](docs/screenshots/) – als Einzelansicht und
als 2×2-Montage (`uebersicht.png`).

---

## Funktionen

| Bereich | Umfang |
|---|---|
| **Onboarding** | Geschlecht, Alter, Größe, Gewicht, Zielgewicht, Aktivität, Ziel (ab-/zunehmen/halten), Tempo → Kalorien- und Makroplan (Mifflin-St Jeor + PAL) |
| **Tagebuch** | Frühstück / Mittag / Abend / Snacks, Tagesring, Makro-Balken, Einträge bearbeiten & löschen, Tage blättern, Serie (Streak) |
| **Lebensmittelsuche** | ~130 lokale Lebensmittel (offline, Richtwerte pro 100 g) + Open Food Facts auf Anfrage |
| **Barcode** | Kamera-Scan in der APK (nativer ZXing-Scanner) und in Chrome (`BarcodeDetector`) oder Nummer eintippen → Open Food Facts |
| **KI-Tracking** | Foto **oder** Text → Gemini schätzt Bestandteile, Gramm, Kalorien & Makros. Jede Position editierbar, einzelne Positionen abwählbar |
| **Eigene Lebensmittel** | Mit Nährwerten pro 100 g + optionaler Portion, dauerhaft gespeichert |
| **Wasser** | Freie Eingabe in **ml oder Litern**, Schnellwerte (+250 ml … +1 l), Tagesfortschritt, Ziel aus Gewicht |
| **Schritte** | Schrittzähler über den Gerätesensor (APK: zählt auch bei geschlossener App nach), Tagesziel, manuelle Korrektur, Speicherung pro Tag |
| **Gewicht** | Eingabe, Verlaufskurve, Zielgewicht, BMI, Prognose bis zum Ziel |
| **Woche** | Ø Kalorien, Balkendiagramm pro Tag, Makro-Durchschnitt, Tageshistorie |
| **Fasten** | 14:10 / 16:8 / 18:6 / 20:4 / 24 h, Live-Timer, Verlauf der letzten 7 Tage |
| **Daten** | JSON-Export/-Import, Zurücksetzen |
| **Sprache** | Deutsch / English – Umschaltung unter **Profil → Sprache**, alle Screens sofort übersetzt |
| **APK** | Eigene Android-App, komplett offline (`npm run apk`) – siehe [ANDROID.md](ANDROID.md) |

### Tagebuch & KI-Tracking

- Tagesring mit **verbleibenden Kalorien**, Prozentanzeige und Makro-Balken
  (Protein / Kohlenhydrate / Fett) – alles aus dem persönlichen Plan.
- Vier Mahlzeiten (Frühstück, Mittag, Abend, Snacks), Einträge **bearbeiten,
  verschieben und löschen**, Tage vor- und zurückblättern, Tagesnotiz.
- **Streak**: zählt Tage in Folge mit mindestens einem Eintrag.
- Lebensmittel hinzufügen über die lokale Datenbank (~130 Lebensmittel,
  offline), Open-Food-Facts-Suche, **Barcode** (Kamera-Scan in APK und Chrome,
  Nummer überall eintippbar), eigene Lebensmittel und Favoriten.
- **KI-Foto oder -Text**: Gemini schätzt Bestandteile, Gramm, Kalorien und
  Makros; jede Position ist vor dem Speichern editierbar und einzeln
  abwählbar. Ohne API-Key läuft ein klar markierter Demo-Modus.

### Wasser

- Freie Eingabe in **ml oder Litern** (z. B. `250`, `0,5`, `1 l`) plus
  Schnellwerte (+250 ml, +500 ml, +750 ml, +1 l) und Minus-Taste.
- Fortschrittsbalken und Tagesziel aus dem Gewicht (35 ml pro kg, 1,5–4 l).
- Wird pro Tag gespeichert und erscheint in der Wochenhistorie.

### Schritte

- **Android-APK:** nativer Schrittzähler über `TYPE_STEP_COUNTER`. Der Sensor
  zählt auch bei geschlossener App weiter; beim nächsten Öffnen trägt Kaloriq
  die Differenz nach.
- Tageswechsel, Neustart des Geräts und lange Pausen (> 20 h) werden
  abgefangen; **veraltete Sensorwerte** (älter als 5 Minuten) werden ignoriert,
  damit keine falschen Schritte entstehen.
- Tagesziel, manuelle Korrektur und Speicherung pro Tag. In der PWA zählt der
  Bewegungssensor nur, solange die App geöffnet ist.

### Fortschritt & Gewicht

- Gewichtseingabe, Verlaufskurve, Zielgewicht, **BMI** und Prognose bis zum
  Ziel auf Basis des eingestellten Tempos.
- Grundumsatz (Mifflin-St Jeor), Gesamtumsatz (PAL) und Tagesziel auf einen
  Blick.
- Wochenauswertung: Ø Kalorien, Balken pro Tag, Makro-Durchschnitt und
  Tageshistorie mit Einträgen und Wasser.

### Fasten

- Pläne **14:10, 16:8, 18:6, 20:4 und 24 h**.
- Live-Timer mit verbleibender Zeit, Fortschrittsring, Start/Stop und
  Verlauf der letzten sieben Tage.
- Ein laufendes Fasten bleibt beim Schließen der App erhalten und wird beim
  nächsten Öffnen weitergezählt.

### Profil, Sprache & Daten

- Körperdaten, Ziel und Tempo ändern → Kalorien- und Makroplan werden sofort
  neu berechnet; Makro-Verteilung, Wasser- und Schrittziel einstellbar.
- **Deutsch / English** sofort umschaltbar (inkl. Datums- und Zahlenformat);
  Einträge und Profil bleiben unverändert.
- **JSON-Export/-Import**, automatische Sicherungen (alle 12 Stunden, maximal
  drei Stände) und ein Zurücksetzen, das vorher automatisch sichert.
- Gemini-Key lokal oder über den Server-Proxy; Modellliste direkt aus der
  Google-API laden.

---

## Starten

```bash
npm start
```

Der Server braucht **keine** Abhängigkeiten (reines Node ≥ 18). Er zeigt beim Start zwei Adressen an:

```
Lokal:   http://localhost:4173
Handy:   http://192.168.x.x:4173   (gleiches WLAN)
```

## Auf dem Android-Handy installieren

**Wichtig:** Chrome installiert eine Web-App nur über **https://** (oder `localhost`). Über `http://192.168.x.x:4173` fehlt der Menüpunkt „App installieren" deshalb – das ist eine Browser-Regel, kein Fehler der App.

### Weg 1 – mit HTTPS-Tunnel (empfohlen, volle App inkl. Offline)

```bash
npm start          # Terminal 1: Server
npm run tunnel     # Terminal 2: HTTPS-Adresse erzeugen
```

`npm run tunnel` startet einen Cloudflare-Quick-Tunnel und gibt eine Adresse wie
`https://humanities-grande-wiring-instruments.trycloudflare.com` aus.

1. Diese **https://**-Adresse am Handy in Chrome öffnen.
2. Menü **⋮ → „App installieren"**.
3. Fertig: eigenes Icon, Vollbild, offline nutzbar.

Beim ersten Start lädt das Skript `cloudflared` nicht selbst herunter – falls es fehlt, zeigt es den Einzeiler zum Installieren an.

> Die Adresse ist bei jedem Neustart des Tunnels neu. Nach einem PC-Neustart also `npm run tunnel` erneut ausführen und die App einmal neu installieren. Für eine **feste Adresse** siehe [DEPLOY.md](DEPLOY.md) – dort bleibt die Adresse (und damit dein Speicher) dauerhaft gleich.

### Weg 3 – feste Adresse, Updates ohne Datenverlust (empfohlen)

```bash
npm run build:static     # erzeugt dist\ mit allen Dateien fürs Hosting
```

Den Inhalt von `dist\` einmal bei **Cloudflare Pages** (Upload assets) oder
**Netlify Drop** hochladen → feste `https://…`-Adresse. Updates später:
`npm run build:static` und erneut hochladen – **gleiche Adresse, gleiche Daten**.

Details: [DEPLOY.md](DEPLOY.md)

### Weg 4 – eigene APK (komplett offline)

```powershell
npm run apk
```

Erzeugt `Kaloriq-<Version>.apk` im Projektordner: eine eigenständige Android-App
mit allen Dateien an Bord, ohne Server und ohne Browser. Aufs Handy kopieren,
antippen, „Unbekannte Quellen" erlauben, installieren.

Updates später: `npm run bump` + `npm run apk`, neue APK drüber installieren –
**Daten bleiben erhalten** (gleicher Paketname + Signaturschlüssel).
Details: [ANDROID.md](ANDROID.md)

### Weg 2 – nur im WLAN, ohne Installation

`http://192.168.x.x:4173` am Handy öffnen. Die App funktioniert vollständig, aber:
- kein Installations-Menüpunkt,
- kein Offline-Cache,
- Chrome zeigt ggf. „Nicht sicher".

Als Übergangslösung erlaubt Chrome **⋮ → „Zum Startbildschirm hinzufügen"** – das ist allerdings nur eine Verknüpfung, keine installierte App.

Danach startet Kaloriq im Vollbild mit eigenem Icon, ohne Browserleiste.

> **Warum überhaupt HTTPS?** Service Worker (Offline-Cache) und der Install-Prompt laufen nur in einem „sicheren Kontext" – also `localhost` oder `https://`. Statisches Hosting geht auch: `npm run build:static` und den Inhalt von `dist\` z. B. bei Netlify Drop oder Cloudflare Pages hochladen (kein Build, kein Server nötig).

## KI einrichten (Google Gemini)

1. Key erstellen: <https://aistudio.google.com/apikey> (Free-Tier reicht zum Testen).
2. In der App: **Profil → Gemini verbinden** → Key einfügen → speichern.
3. Modell: Standard ist `gemini-3.8-flash`. Über **„Laden“** neben dem Modellfeld fragt die App bei Google ab, welche Modelle dein Key tatsächlich nutzen darf, und trägt das beste verfügbare ein.

> **Wichtig:** Modellnamen veralten. Ältere Modelle wie `gemini-2.5-flash` sind für **neue** API-Keys gesperrt („Modell nicht gefunden“). Die App wechselt in diesem Fall automatisch auf ein freigeschaltetes Modell; alternativ in den Einstellungen „Laden“ tippen und ein Modell aus der Liste wählen.

Ohne Key läuft die KI-Schätzung im **Demo-Modus**: Sie sucht die genannten Lebensmittel in der lokalen Datenbank und markiert das Ergebnis sichtbar als Demo. Das ist nur zum Ausprobieren der Oberfläche gedacht.

**Key geheim halten?** Wenn der Server mit Key gestartet wird, bleibt er auf dem Rechner und die App nutzt ihn über einen Proxy:

```powershell
$env:GEMINI_API_KEY="AIza…"; npm start
```

Die App erkennt das automatisch (Profil → „Server-Proxy: verfügbar"). Auf dem Handy ohne laufenden Server wird der Key lokal gespeichert – das ist für den Privatgebrauch okay, aber jedes Gerät mit Zugriff kann ihn auslesen.

---

## Sprache (Deutsch / English)

**Profil → Sprache** → Deutsch oder English. Die Auswahl gilt sofort für die
ganze App (auch Datums- und Zahlenformat: `2.240` ↔ `2,240`) und wird in den
Einstellungen gespeichert. **Einträge, Gewichte, Profil und API-Key bleiben
unverändert** – die Sprache ist nur eine Anzeige-Ebene.

Technisch: `public/js/i18n.js` enthält das Wörterbuch (deutsche Quelltexte →
englische Texte), Muster für dynamische Texte (Zahlen, Datumsangaben) und
`applyI18n()`, das nach jedem Rendern die sichtbaren Texte übersetzt. Fehlt ein
Eintrag, bleibt der deutsche Text stehen – die App funktioniert also immer.

---

## Entwicklungsablauf

Kaloriq ist bewusst **ohne Bundler und ohne npm-Abhängigkeiten** gebaut: reine
ES-Module, die der Browser direkt lädt. Dadurch ist jede Änderung sofort
sichtbar, und die APK wird aus demselben Quellstand gebaut wie die PWA.

### Regeln für jede Änderung

1. **Version erhöhen:** Nach jeder Änderung an `public/` (Code, Styles, Texte,
   Manifest, Icons) steigt die Version – siehe [Versionierung](#versionierung).
2. **Daten nie löschen:** `localStorage` (`kaloriq.state.v1`) bleibt erhalten.
   `migrate()` ergänzt nur fehlende Felder; vor Import und Zurücksetzen wird
   automatisch gesichert.
3. **Testen:** Desktop-Browser (Chrome/Edge) und Android – PWA im Browser
   **und** die installierte APK. Neue JS-Dateien zusätzlich in die
   `SHELL`-Liste von `public/sw.js` eintragen, sonst fehlen sie offline.
4. **APK bauen:** `npm run apk` erzeugt eine signierte
   `Kaloriq-<Version>.apk`. Der Signaturschlüssel liegt nur lokal unter
   `android-app/keystore/` und ist **nicht** im Repository.
5. **Veröffentlichen:** Commit und Push nach `main`; die APK als
   GitHub-Release anhängen.

### Versionen

| Version | Schwerpunkt |
|---|---|
| **1.2.1** | Nativer Barcode-Scanner in der APK (ZXing), englische Scan-Beschriftung |
| **1.1.9** | Schutz vor veralteten Sensorwerten; Release-APK |
| **1.1.8** | Import setzt den nativen Schritt-Zählerstand zurück |
| **1.1.7** | Nativer Android-Schrittzähler (auch bei geschlossener App) |
| **1.1.6** | Schnellzugriff repariert, Wasser frei in ml/l, erster Schrittzähler |
| **≤ 1.1.5** | Basisversion (nicht einzeln dokumentiert) |

Der ausführliche Verlauf mit allen Änderungen, Behobenem und technischen
Notizen steht in **[CHANGELOG.md](CHANGELOG.md)**.

---

## Versionierung

Bei jeder Änderung wird die Version erhöht – ein Befehl, vier Stellen:

```powershell
npm run bump          # 1.1.1 → 1.1.2
npm run bump 1.2.0    # feste Version
```

Aktualisiert `package.json`, `public/js/version.js` (Anzeige unter Profil),
`public/sw.js` (Cache-Name) und baut `dist\` neu. Ist das Android-Projekt
vorhanden, werden auch `versionName`/`versionCode` der APK mitgesetzt.

---

## Updates & Datensicherung

**Ein Update löscht keine Daten.** App-Daten liegen im Browser-Speicher
(`localStorage`, Schlüssel `kaloriq.state.v1`); neue JS-Dateien überschreiben den
nie. Beim Laden ergänzt `migrate()` in `public/js/store.js` nur fehlende Felder –
vorhandene Werte, Tage, Gewichte und der API-Key bleiben unverändert.

Zusätzlich:

- **Automatische Sicherungen:** alle 12 Stunden, maximal 3 Stände.
  Zurückholen unter **Profil → Sicherungen**.
- Vor **Daten importieren** und **Alles zurücksetzen** wird der aktuelle Stand
  automatisch gesichert – beides ist rückholbar.
- **Manuelles Backup:** Profil → Daten exportieren (JSON).

> Der einzige Fall, in dem Daten „fehlen", ist eine **neue Web-Adresse**
> (z. B. neuer Quick-Tunnel). Der Browser trennt den Speicher pro Adresse.
> Deshalb: einmal auf eine feste Adresse umziehen (siehe [DEPLOY.md](DEPLOY.md)),
> dann passiert das nie wieder.

---

## Rechenwege

- **Grundumsatz:** Mifflin-St Jeor
  `10 × kg + 6,25 × cm − 5 × Alter + (m: +5 | w: −161)`
- **Gesamtumsatz:** Grundumsatz × PAL (1,2 / 1,375 / 1,55 / 1,725 / 1,9)
- **Kalorienziel:** Gesamtumsatz ± Tempo × 1.100 kcal/Tag (1 kg Körperfett ≈ 7.700 kcal), nie unter Grundumsatz bzw. 1.200 (w) / 1.500 (m) kcal
- **Makros:** Presets 25/45/30, 35/35/30, 30/20/50 (Protein/KH/Fett in % der Kalorien)
- **Wasser:** 35 ml pro kg, gerundet, 1,5–4 l
- **BMI:** kg / m², Kategorien nach WHO

Alles Richtwerte – **kein medizinisches Gerät**, keine Diagnose, keine Therapie.

---

## Projektstruktur

```
server.mjs              Zero-Dependency-Server + optionaler Gemini-Proxy
CHANGELOG.md            Versionsverlauf und Entwicklungsregeln
AGENTS.md               Arbeitsregeln für Änderungen an der App
THIRD_PARTY_NOTICES.md  Drittanbieter-Hinweise (ZXing, Apache-2.0)
LICENSES/               Apache-2.0-Lizenztext
ANDROID.md              APK-Bau, Signatur, nativer Scanner und Schrittzähler
DEPLOY.md               Feste Web-Adresse (Cloudflare Pages / Netlify)
docs/screenshots/       Screenshots für README und GitHub
public/
  index.html            App-Shell
  manifest.webmanifest  PWA-Manifest (Icons, Shortcuts)
  sw.js                 Service Worker (offline, network-first)
  css/app.css           Design System (hell/dunkel, Safe-Areas)
  js/
    app.js              Bootstrap, Router, Tabs, Install-Prompt
    store.js            State + localStorage, Tage, Statistik
    calc.js             BMR/TDEE/Ziele, Makros, Fasten-Pläne
    foods.js            Lokale DB (~130 Lebensmittel) + Open Food Facts
    i18n.js             Sprachumschaltung (Wörterbuch, Muster, DOM-Übersetzung)
    ai.js               Gemini-Aufrufe, Bildverkleinerung, Demo-Modus
    ui.js               Sheets (mit Zurück-Taste), Toasts, Charts, Icons
    views/              onboarding · diary · add (Suche/Barcode/KI) · progress · fasting · profile
android-app/            Capacitor-Projekt für die APK (siehe ANDROID.md)
scripts/build-apk.mjs   APK bauen (npm run apk)
scripts/make-icons.mjs  Erzeugt die PNG-Icons (npm run icons)
scripts/tunnel.mjs      HTTPS-Tunnel für die Installation (npm run tunnel)
```

### Technische Entscheidungen

- **Kein Build-Schritt, keine Frameworks** – ES-Module, die direkt im Browser laufen. Änderungen sind sofort sichtbar, die App bleibt über Jahre wartbar.
- **Keine externen Abhängigkeiten in der App** – weder npm-Pakete noch CDNs; funktioniert auch, wenn Bibliotheken verschwinden. Nur die APK-Hülle bindet ZXing für den nativen Barcode-Scanner ein.
- **Daten in `localStorage`** – ein JSON-Dokument, per Export/Import sicherbar.
- **Bottom-Sheets mit History-Eintrag** – die Android-Zurück-Taste schließt zuerst das offene Sheet, statt die App zu verlassen.

---

## Grenzen & nächste Schritte

- **Open Food Facts limitiert** Suchanfragen pro Minute. Deshalb: lokale DB zuerst, Online-Suche gedrosselt, Ergebnisse gecacht, 30-Sekunden-Pause nach einem Limit-Fehler.
- **Kein Account, keine Synchronisierung** zwischen Geräten (bewusst). Sync ließe sich später über einen kleinen Server oder Supabase ergänzen.
- **Barcode-Scan:** In der APK öffnet sich der native Scanner (ZXing, offline, ohne Google Play-Dienste); in Chrome nutzt die PWA den `BarcodeDetector`. In beiden Fällen bleibt die manuelle Eingabe der Nummer möglich.
- **Schrittzähler:** In der APK liest ein natives Plugin den Hardware-Schrittzähler (`TYPE_STEP_COUNTER`). Der Sensor zählt kumulativ seit dem Geräteneustart weiter, auch wenn die App geschlossen ist – beim nächsten Öffnen wird die Differenz nachgetragen. Nach einem Tageswechsel ohne App-Kontakt werden die Schritte dem Tag des Öffnens zugerechnet; nach mehr als 20 Stunden Pause wird der Stand neu gesetzt, statt willkürlich zu verteilen. Im Browser (PWA) bleibt es beim Bewegungssensor und Zählen nur bei geöffneter App. Schritte lassen sich außerdem jederzeit manuell korrigieren.
- **Rezeptdatenbank, Fitnessarmband-Anbindung und Community** sind nicht enthalten.

## Rechtliches

Nachbau der *Funktionen* gängiger Ernährungs-Apps zu Lernzwecken. Der App-Code ist eigenständig; für den nativen Barcode-Scanner wird die Open-Source-Bibliothek ZXing verwendet (Apache-2.0, siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)). Keine fremden Marken und keine fremde Gestaltung übernommen. „Kaloriq" ist ein eigener Name. Nährwertangaben sind Näherungswerte und ersetzen keine fachliche Beratung.
