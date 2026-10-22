# Kaloriq

Kalorien-, Makro- und Fasten-Tracker mit KI-Foto-Erkennung – als installierbare Web-App (PWA), optimiert für **Android** (läuft genauso auf dem iPhone).

Eigenständige Implementierung der Funktionen, die Apps wie Yazio bieten. Kein fremder Code, keine fremden Marken oder Assets, keine Cloud: **alle Daten bleiben auf dem Gerät.**

---

## Funktionen

| Bereich | Umfang |
|---|---|
| **Onboarding** | Geschlecht, Alter, Größe, Gewicht, Zielgewicht, Aktivität, Ziel (ab-/zunehmen/halten), Tempo → Kalorien- und Makroplan (Mifflin-St Jeor + PAL) |
| **Tagebuch** | Frühstück / Mittag / Abend / Snacks, Tagesring, Makro-Balken, Einträge bearbeiten & löschen, Tage blättern, Serie (Streak) |
| **Lebensmittelsuche** | ~130 lokale Lebensmittel (offline, Richtwerte pro 100 g) + Open Food Facts auf Anfrage |
| **Barcode** | Kamera-Scan (`BarcodeDetector`, Android Chrome) oder Nummer eintippen → Open Food Facts |
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
- **Keine externen Abhängigkeiten** – weder npm-Pakete noch CDNs; funktioniert auch, wenn Bibliotheken verschwinden.
- **Daten in `localStorage`** – ein JSON-Dokument, per Export/Import sicherbar.
- **Bottom-Sheets mit History-Eintrag** – die Android-Zurück-Taste schließt zuerst das offene Sheet, statt die App zu verlassen.

---

## Grenzen & nächste Schritte

- **Open Food Facts limitiert** Suchanfragen pro Minute. Deshalb: lokale DB zuerst, Online-Suche gedrosselt, Ergebnisse gecacht, 30-Sekunden-Pause nach einem Limit-Fehler.
- **Kein Account, keine Synchronisierung** zwischen Geräten (bewusst). Sync ließe sich später über einen kleinen Server oder Supabase ergänzen.
- **Barcode-Scan in der APK:** das WebView kennt `BarcodeDetector` nicht, dort wird die Nummer eingetippt (in Chrome funktioniert der Scan). Ein natives Scan-Plugin ließe sich ergänzen.
- **Schrittzähler:** In der APK liest ein natives Plugin den Hardware-Schrittzähler (`TYPE_STEP_COUNTER`). Der Sensor zählt kumulativ seit dem Geräteneustart weiter, auch wenn die App geschlossen ist – beim nächsten Öffnen wird die Differenz nachgetragen. Nach einem Tageswechsel ohne App-Kontakt werden die Schritte dem Tag des Öffnens zugerechnet; nach mehr als 20 Stunden Pause wird der Stand neu gesetzt, statt willkürlich zu verteilen. Im Browser (PWA) bleibt es beim Bewegungssensor und Zählen nur bei geöffneter App. Schritte lassen sich außerdem jederzeit manuell korrigieren.
- **Rezeptdatenbank, Fitnessarmband-Anbindung und Community** sind nicht enthalten.

## Rechtliches

Nachbau der *Funktionen* gängiger Ernährungs-Apps zu Lernzwecken. Kein Code, keine Marke, keine Gestaltung von Yazio übernommen. „Kaloriq" ist ein eigener Name. Nährwertangaben sind Näherungswerte und ersetzen keine fachliche Beratung.
