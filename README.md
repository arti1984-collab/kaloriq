# Kaloriq

**Sprache:** [Deutsch](README.md) · [English](README.en.md)

Kalorien-, Makro- und Fasten-Tracker mit KI-Foto-Erkennung – als installierbare Web-App (PWA), optimiert für **Android** (läuft genauso auf dem iPhone).

Eigenständige Implementierung der Funktionen bekannter Kalorien-Tracker. Keine fremden Marken oder Assets, keine Cloud: **alle Daten bleiben auf dem Gerät.** Für den Barcode-Scanner wird ZXing (Apache-2.0) verwendet – nativ in der Android-APK und als lokal mitgelieferte JavaScript-Bibliothek in Safari/Firefox – siehe [Drittanbieter-Hinweise](THIRD_PARTY_NOTICES.md).

**Aktuelle Version: 1.3.0** · [Auf dem iPhone installieren](https://arti1984-collab.github.io/kaloriq/) · [Android-APK herunterladen](https://github.com/arti1984-collab/kaloriq/releases/tag/v1.3.0) · [Changelog](CHANGELOG.md)

Folge Kaloriq auf [TikTok: @kaloriq](https://www.tiktok.com/@kaloriq).

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
| **Lebensmittelsuche** | Über 200 lokale Lebensmittel (offline, Richtwerte pro 100 g) + Open Food Facts auf Anfrage |
| **Barcode** | Kamera-Scan in der APK (nativer ZXing-Scanner), in Chrome (`BarcodeDetector`) und in Safari/Firefox (ZXing JS) oder Nummer eintippen → Open Food Facts |
| **KI-Tracking** | Foto **oder** Text → Gemini schätzt Bestandteile, Gramm, Kalorien & Makros. Jede Position editierbar, einzelne Positionen abwählbar |
| **Eigene Lebensmittel** | Mit Nährwerten pro 100 g + optionaler Portion, dauerhaft gespeichert |
| **Rezepte** | Eigene Rezepte mit Zutaten und Nährwerten pro 100 g, Portionen, Tags und Zubereitung; Portion ins Tagebuch, JSON-Import/-Export |
| **Wasser** | Freie Eingabe in **ml oder Litern**, Schnellwerte (+250 ml … +1 l), Tagesfortschritt, Ziel aus Gewicht |
| **Schritte** | Schrittzähler über den Gerätesensor (APK: zählt auch bei geschlossener App nach), Tagesziel, manuelle Korrektur, Speicherung pro Tag |
| **Gewicht** | Eingabe, Verlaufskurve, Zielgewicht, BMI, Prognose bis zum Ziel |
| **Woche** | Ø Kalorien, Balkendiagramm pro Tag, Makro-Durchschnitt, Tageshistorie |
| **Fasten** | 14:10 / 16:8 / 18:6 / 20:4 / 24 h, Live-Timer, Verlauf der letzten 7 Tage |
| **Daten** | JSON-Export/-Import, automatische Sicherungen, IndexedDB-Zweitkopie, Zurücksetzen |
| **Wohlbefinden** | Sanfter Modus mit Pause, **Minimalmodus** (ohne Ring, Ziel und Makros) und **Flexbereich** ±5–15 % – weniger Perfektionsdruck, keine roten Zahlen |
| **Gnaden-Tage** | 0–3 leere Tage pro Monat brechen die Serie nicht – automatisch, lokal, ohne Punkte |
| **Pausenmodus** | „Nur heute drüber“ oder 3/7/14 Tage/offen – Serie eingefroren, kein Kaloriendruck |
| **Hunger & Sättigung** | Optionaler 1–10-Check-in pro Mahlzeit, vor und nach dem Essen – ohne Pflicht, ohne Bewertung |
| **Kleine Erfolge** | Wasser, Spaziergang, bewusst gegessen, Zeit für mich – Nicht-Zahl-Erfolge zum Antippen, ohne Punkte |
| **Schnellzugriff** | Zuletzt/Favoriten, Gestern kopieren, Duplizieren, Mahlzeit verschieben, Löschen rückgängig |
| **Trackingsstil** | Genau / Grob / Überblick – passend zu Alltag und Drucklevel |
| **Wochenrückblick** | Tage, kleine Erfolge, Check-ins und Wasser – ohne Kaloriendruck |
| **CSV & Feedback** | CSV-Export, In-App-Feedback, Backup-Erinnerung und Update-Hinweis |
| **Handportionen** | Klein/Mittel/Groß statt Gramm – mit grober Gramm-Orientierung, ohne Waage |
| **Schnell eintragen** | Leicht/Normal/Reichhaltig pro Mahlzeit – grobe Schätzung ohne Grammangaben |
| **Sprache** | Deutsch / English – Umschaltung unter **Profil → Sprache**, alle Screens sofort übersetzt |
| **APK** | Eigene Android-App, komplett offline (`npm run apk`) – siehe [ANDROID.md](ANDROID.md) |

### Tagebuch & KI-Tracking

- Tagesring mit **verbleibenden Kalorien**, Prozentanzeige und Makro-Balken
  (Protein / Kohlenhydrate / Fett) – alles aus dem persönlichen Plan.
- Vier Mahlzeiten (Frühstück, Mittag, Abend, Snacks), Einträge **bearbeiten,
  verschieben und löschen**, Tage vor- und zurückblättern, Tagesnotiz.
- **Streak**: zählt Tage in Folge mit mindestens einem Eintrag.
- Lebensmittel hinzufügen über die lokale Datenbank (über 200 Lebensmittel,
  offline), Open-Food-Facts-Suche, **Barcode** (Kamera-Scan in APK, Chrome,
  Safari und Firefox; Nummer überall eintippbar), eigene Lebensmittel und
  Favoriten.
- **KI-Foto oder -Text**: Gemini schätzt Bestandteile, Gramm, Kalorien und
  Makros; jede Position ist vor dem Speichern editierbar und einzeln
  abwählbar. Ohne API-Key läuft ein klar markierter Demo-Modus.
- **Handportionen:** In der Mengenauswahl zwischen Gramm und Handportion
  umschalten. Klein/Mittel/Groß schätzen die Menge anhand der Portion oder
  100 g – ohne Waage, mit sichtbarer Gramm-Orientierung.
- **Schnell eintragen:** Pro Mahlzeit eine grobe Schätzung als Leicht,
  Normal oder Reichhaltig (20/30/40 % des Tagesziels) – optional mit Name.
  Der Eintrag ist als „grobe Schätzung“ markiert und später editierbar.
- **Schnellzugriff:** Zuletzt verwendete und favorisierte Lebensmittel stehen
  oben in der Suche. „Gestern kopieren“ übernimmt eine Mahlzeit vom Vortag,
  Einträge lassen sich duplizieren, in eine andere Mahlzeit verschieben und
  nach dem Löschen mit einem Tipp wiederherstellen.
- **Trackingsstil:** Genau (Gramm/Makros), Grob (Handportionen und
  Schnell-Eintrag) oder Überblick (ohne Zahlen, Fokus auf Erfolge). Der Stil
  lässt sich im Onboarding und später unter Profil ändern.

### Rezepte

- Eigene Rezepte anlegen, bearbeiten und löschen. Zutaten aus der lokalen
  Datenbank übernehmen oder Nährwerte manuell pro 100 g eintragen; Portionen,
  Tags und Zubereitung ergänzen.
- Kalorien und Makros werden pro Portion und pro 100 g berechnet. Eine Portion
  lässt sich direkt als **ein** Eintrag ins Tagebuch übernehmen.
- Rezepte bleiben lokal und werden mit den automatischen Sicherungen
  gespeichert. Export und Import als `kaloriq-recipes`-JSON zum Sichern oder
  Teilen; eine Community-Datenbank oder Cloud-Synchronisierung gibt es nicht.

### Wasser

- Freie Eingabe in **ml oder Litern** (z. B. `250`, `0,5`, `1 l`) plus
  Schnellwerte (+250 ml, +500 ml, +750 ml, +1 l) und Minus-Taste.
- Fortschrittsbalken und Tagesziel aus dem Gewicht (35 ml pro kg, 1,5–4 l).
- Wird pro Tag gespeichert und erscheint in der Wochenhistorie.

### Schritte

- **Android-APK:** nativer Schrittzähler über `TYPE_STEP_COUNTER`. Der Sensor
  zählt auch bei geschlossener App weiter; beim nächsten Öffnen trägt Kaloriq
  die Differenz nach. Die Anzeige aktualisiert sich mindestens alle
  0,5 Sekunden, beim Zurückkehren aus dem Hintergrund sofort mit dem
  aktuellen Stand. Für die Live-Anzeige wird zusätzlich
  `TYPE_STEP_DETECTOR` genutzt (ein Ereignis pro Schritt); gespeichert wird
  weiterhin der kumulative Zähler, damit nichts doppelt zählt.
- Tageswechsel, Neustart des Geräts und lange Pausen (> 20 h) werden
  abgefangen; **veraltete Sensorwerte** (älter als 5 Minuten) werden ignoriert,
  damit keine falschen Schritte entstehen.
- Tagesziel, manuelle Korrektur und Speicherung pro Tag. In der PWA zählt der
  Bewegungssensor nur bei geöffneter App; Apple Health ist für Web-Apps nicht
  zugänglich. Schritte lassen sich jederzeit manuell eintragen.

### Fortschritt & Gewicht

- Gewichtseingabe, Verlaufskurve, Zielgewicht, **BMI** und Prognose bis zum
  Ziel auf Basis des eingestellten Tempos.
- Grundumsatz (Mifflin-St Jeor), Gesamtumsatz (PAL) und Tagesziel auf einen
  Blick.
- Wochenauswertung: Ø Kalorien, Balken pro Tag, Makro-Durchschnitt und
  Tageshistorie mit Einträgen und Wasser.
- **Wochenrückblick ohne Druck:** Tage mit Einträgen, kleine Erfolge,
  Check-ins und Wasser-Tage auf einen Blick – ohne Kalorienbewertung.

### Fasten

- Pläne **14:10, 16:8, 18:6, 20:4 und 24 h**.
- Live-Timer mit verbleibender Zeit, Fortschrittsring, Start/Stop und
  Verlauf der letzten sieben Tage.
- Ein laufendes Fasten bleibt beim Schließen der App erhalten und wird beim
  nächsten Öffnen weitergezählt.

### Wohlbefinden (Anti-Burnout)

- **Sanfter Modus:** Wochenrahmen statt Tagesdruck, keine roten Zahlen und eine
  Pause, die das Kalorienziel im Tagebuch ausblendet – ohne Daten zu löschen.
- **Minimalmodus:** Blendet Tagesring, Kalorienziel, Makros und Wochenbilanz
  aus. Mahlzeiten, Wasser, Schritte, Gewicht und Verlauf bleiben sichtbar.
- **Flexbereich:** ±5 %, ±10 % oder ±15 % um den Richtwert gelten als
  „im Rahmen“. Innerhalb dieses Bereichs bleibt alles neutral, auch wenn ein
  Tag leicht über dem Ziel liegt. Abschaltbar; Standard ist ±10 %.
- **Gnaden-Tage:** 0–3 leere Tage pro Kalendermonat brechen die Serie nicht.
  Sie werden automatisch verbraucht, aber nur wenn sie eine Lücke zwischen
  zwei Einträgen überbrücken. Standard sind 2; die Einstellung zeigt genutzte
  und verbleibende Gnaden-Tage für den aktuellen Monat.
- **Pausenmodus:** „Nur heute drüber“, 3 Tage, 1 Woche, 2 Wochen oder ein
  offenes Ende. Kalorienziel, Ring, Makros und Wochenbilanz sind währenddessen
  ausgeblendet, die Serie ist eingefroren. Einträge bleiben freiwillig; die
  Pause lässt sich jederzeit verlängern, verkürzen oder beenden.
- **Hunger & Sättigung:** Optionaler Check-in pro Mahlzeit mit zwei
  1–10-Skalen (Hunger vor dem Essen, Sättigung danach). Eine Angabe reicht;
  eine gewählte Zahl lässt sich durch erneutes Antippen entfernen. Die
  Funktion ist unter **Profil → Wohlbefinden** ein- und ausblendbar und
  speichert nur lokal.
- **Kleine Erfolge:** Vier Nicht-Zahl-Erfolge pro Tag zum Antippen – Wasser
  getrunken, Spaziergang gemacht, bewusst gegessen, mir Zeit genommen. Kein
  Punktesystem, keine Serien, keine Bewertung; ausgewählte Erfolge bekommen
  nur einen ruhigen Haken. Über **Profil → Wohlbefinden** ausblendbar.
- **Sanfte Erinnerung:** Standardmäßig aus. Wenn aktiviert, erscheint einmal
  beim nächsten Öffnen ein ruhiger Check-in-Hinweis – nicht per Push, ohne
  Streak-Drohung.

### Profil, Sprache & Daten

- Körperdaten, Ziel und Tempo ändern → Kalorien- und Makroplan werden sofort
  neu berechnet; Makro-Verteilung, Wasser- und Schrittziel einstellbar.
- **Deutsch / English** sofort umschaltbar (inkl. Datums- und Zahlenformat);
  Einträge und Profil bleiben unverändert.
- **JSON-Export/-Import**, automatische Sicherungen (alle 12 Stunden, maximal
  drei Stände) und ein Zurücksetzen, das vorher automatisch sichert.
- **CSV-Export** für Excel, Numbers oder Sheets – wahlweise alle Einträge oder
  die Tageswerte.
- **Backup-Status und sanfte Erinnerung:** Die letzte Sicherung ist sichtbar;
  nach 14 Tagen erinnert Kaloriq einmal täglich ans Sichern.
- **Feedback & Hilfe** direkt im Profil: Problem oder Idee über GitHub melden,
  inklusive Version, Gerät und Sprache. Dazu ein Update-Hinweis, wenn eine neue
  App-Version bereitsteht.
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

### Weg 2 – feste Adresse, Updates ohne Datenverlust (empfohlen)

```bash
npm run build:static     # erzeugt dist\ mit allen Dateien fürs Hosting
```

Den Inhalt von `dist\` einmal bei **Cloudflare Pages** (Upload assets) oder
**Netlify Drop** hochladen → feste `https://…`-Adresse. Updates später:
`npm run build:static` und erneut hochladen – **gleiche Adresse, gleiche Daten**.

Details: [DEPLOY.md](DEPLOY.md)

### Weg 3 – eigene APK (komplett offline)

```powershell
npm run apk
```

Erzeugt `Kaloriq-<Version>.apk` im Projektordner: eine eigenständige Android-App
mit allen Dateien an Bord, ohne Server und ohne Browser. Aufs Handy kopieren,
antippen, „Unbekannte Quellen" erlauben, installieren.

Updates später: `npm run bump` + `npm run apk`, neue APK drüber installieren –
**Daten bleiben erhalten** (gleicher Paketname + Signaturschlüssel).
Details: [ANDROID.md](ANDROID.md)

### Weg 4 – nur im WLAN, ohne Installation

`http://192.168.x.x:4173` am Handy öffnen. Die App funktioniert vollständig, aber:
- kein Installations-Menüpunkt,
- kein Offline-Cache,
- Chrome zeigt ggf. „Nicht sicher".

Als Übergangslösung erlaubt Chrome **⋮ → „Zum Startbildschirm hinzufügen"** – das ist allerdings nur eine Verknüpfung, keine installierte App.

Danach startet Kaloriq im Vollbild mit eigenem Icon, ohne Browserleiste.

> **Warum überhaupt HTTPS?** Service Worker (Offline-Cache) und der Install-Prompt laufen nur in einem „sicheren Kontext" – also `localhost` oder `https://`. Statisches Hosting geht auch: `npm run build:static` und den Inhalt von `dist\` z. B. bei Netlify Drop oder Cloudflare Pages hochladen (kein Build, kein Server nötig).

## Auf dem iPhone installieren (PWA)

Wenn die App für alle kostenlos sein soll, ist die PWA der direkte Weg: kein App Store, kein Apple-Entwicklerkonto und keine 99 US-Dollar pro Jahr. Die App ist direkt über **GitHub Pages** erreichbar:

**https://arti1984-collab.github.io/kaloriq/**

> Ausführliche Schritt-für-Schritt-Anleitung auf Deutsch und Englisch: [INSTALL-IPHONE.md](INSTALL-IPHONE.md)

1. Diese Adresse in **Safari** öffnen.
2. **Teilen** antippen → **Zum Home-Bildschirm** → **Hinzufügen**.
3. Kaloriq erscheint mit eigenem Icon und startet im Vollbild; die Daten bleiben lokal auf dem Gerät.

> **Wichtig:** Immer dieselbe feste Adresse verwenden. Eine neue Adresse bedeutet auf dem iPhone einen neuen, leeren Speicher. Deshalb nicht die wechselnden Quick-Tunnel-Adressen zum Installieren nutzen.

> **Warum keine native iOS-App von GitHub?** Apple signiert iOS-Apps. Eine IPA aus einem GitHub-Release lässt sich nicht einfach antippen und installieren – dafür bräuchte man einen Mac, ein Apple-Entwicklerkonto und Sideloading bzw. TestFlight. Die PWA ist der einzige Weg, der ohne Apple-Konto und ohne App Store funktioniert.

**Barcode-Scan:** Funktioniert auch in Safari direkt aus der App. Beim ersten Scan fragt iOS nach der Kamera-Berechtigung.

**Was auf dem iPhone anders ist:**

- **Schritte:** Die PWA zählt nur bei geöffneter App, da Safari keinen Zugriff auf Apple Health hat und Web-Apps im Hintergrund pausiert. Schritte lassen sich manuell eintragen; die Android-APK zählt auch im Hintergrund.
- **Speicher:** Kaloriq fordert persistenten Speicher an und hält zusätzlich eine automatische Zweitkopie in IndexedDB. Ein JSON-Export über **Profil → Daten exportieren** bleibt als freiwillige Zusatzsicherung möglich.
- **App Store:** Dort wäre die App für Nutzer ebenfalls kostenlos, aber für dich fallen **99 US-Dollar pro Jahr** plus Mac/Xcode an. Die PWA kostet weder dich noch die Nutzer etwas.

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
2. **Daten nie löschen:** `localStorage` (`kaloriq.state.v1`) und die
   IndexedDB-Zweitkopie (`kaloriq.storage.v1`) bleiben erhalten. `migrate()`
   ergänzt nur fehlende Felder; vor Import und Zurücksetzen wird automatisch
   gesichert.
3. **Testen:** Desktop-Browser (Chrome/Edge/Safari) und Android – PWA im
   Browser **und** die installierte APK; den Barcode-Scanner zusätzlich in
   Safari bzw. auf dem iPhone. Neue JS-Dateien zusätzlich in die `SHELL`-Liste
   von `public/sw.js` eintragen, sonst fehlen sie offline.
4. **APK bauen:** `npm run apk` erzeugt eine signierte
   `Kaloriq-<Version>.apk`. Der Signaturschlüssel liegt nur lokal unter
   `android-app/keystore/` und ist **nicht** im Repository.
5. **Veröffentlichen:** Commit und Push nach `main`; die APK als
   GitHub-Release anhängen.

### Versionen

| Version | Schwerpunkt |
|---|---|
| **1.3.0** | Schnellzugriff, Trackingsstil, Wochenrückblick, CSV/Feedback und Vertrauens-UX |
| **1.2.14** | Lokale Lebensmittel-Datenbank auf 212 Einträge erweitert |
| **1.2.13** | Handportionen und „Schnell eintragen“ (Rough Log) |
| **1.2.12** | Kleine Nicht-Zahl-Erfolge im Tagebuch (ohne Punkte oder Serien) |
| **1.2.11** | Hunger-Sättigungs-Check pro Mahlzeit (optional, 1–10) |
| **1.2.10** | Pausenmodus: „Nur heute drüber“ oder mehrere Tage mit eingefrorener Serie |
| **1.2.9** | Gnaden-Tage: 0–3 leere Tage pro Monat brechen die Serie nicht |
| **1.2.8** | Live-Schritte über `TYPE_STEP_DETECTOR`, Zählung bleibt kumulativ |
| **1.2.7** | Schrittzähler reagiert schneller (500 ms, Sofortwert nach Resume) |
| **1.2.6** | Minimalmodus und Flexbereich gegen Perfektionsdruck |
| **1.2.5** | TikTok-Link im Profil und auf der GitHub-Projektseite |
| **1.2.4** | Lokale Rezepte mit Zutaten, Nährwerten, Portionen, Tagebuch-Übernahme und JSON-Austausch |
| **1.2.3** | Persistenter Speicher und IndexedDB-Zweitkopie gegen iOS-Speicherbereinigung |
| **1.2.2** | Barcode-Scanner für Safari/Firefox (ZXing JS), Kamera-Aufräumen, iPhone-Doku |
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

**Ein Update löscht keine Daten.** App-Daten liegen im Browser-Speicher: `localStorage`
(`kaloriq.state.v1`) als schnelle Hauptkopie und IndexedDB (`kaloriq.storage.v1`)
als automatische Zweitkopie. Beim Start stellt die App die Zweitkopie wieder her,
falls iOS `localStorage` unter Speicherdruck geräumt hat. Zusätzlich fordert sie
persistenten Speicher an (`navigator.storage.persist()`), damit der Browser die
Daten seltener aufräumt. Neue JS-Dateien überschreiben diese Kopien nie. Beim
Laden ergänzt `migrate()` in `public/js/store.js` nur fehlende Felder –
vorhandene Werte, Tage, Gewichte und der API-Key bleiben unverändert.

Zusätzlich:

- **Automatische Sicherungen:** alle 12 Stunden, maximal 3 Stände – gespiegelt
  in IndexedDB. Zurückholen unter **Profil → Sicherungen**.
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
DEPLOY.md               Feste Web-Adresse (GitHub Pages / Cloudflare / Netlify)
INSTALL-IPHONE.md       iPhone-Installation (Deutsch / English)
README.en.md            Englische Fassung dieser Seite
docs/screenshots/       Screenshots für README und GitHub
public/
  index.html            App-Shell
  manifest.webmanifest  PWA-Manifest (Icons, Shortcuts)
  sw.js                 Service Worker (offline, network-first)
  css/app.css           Design System (hell/dunkel, Safe-Areas)
  vendor/
    zxing.min.js        ZXing JS für den Barcode-Scanner in Safari/Firefox
    zxing.LICENSE.txt   Apache-2.0-Lizenztext der ZXing-JS-Bibliothek
  js/
    app.js              Bootstrap, Router, Tabs, Install-Prompt
    store.js            State + localStorage/IndexedDB, Tage, Statistik
    calc.js             BMR/TDEE/Ziele, Makros, Fasten-Pläne
    foods.js            Lokale DB (über 200 Lebensmittel) + Open Food Facts
    recipes.js          Rezeptmodell, Nährwertberechnung, JSON-Import/-Export
    i18n.js             Sprachumschaltung (Wörterbuch, Muster, DOM-Übersetzung)
    ai.js               Gemini-Aufrufe, Bildverkleinerung, Demo-Modus
    ui.js               Sheets (mit Zurück-Taste), Toasts, Charts, Icons
    pause.js            Pausenmodus (nur heute, mehrere Tage, offenes Ende)
    checkin.js          Hunger-/Sättigungs-Check pro Mahlzeit
    wins.js             Kleine Nicht-Zahl-Erfolge im Tagebuch
    csv.js              CSV-Export für Einträge und Tageswerte
    views/              onboarding · diary · add (Suche/Barcode/KI) · recipes · progress · fasting · profile
android-app/            Capacitor-Projekt für die APK (siehe ANDROID.md)
scripts/build-apk.mjs   APK bauen (npm run apk)
scripts/make-icons.mjs  Erzeugt die PNG-Icons (npm run icons)
scripts/tunnel.mjs      HTTPS-Tunnel für die Installation (npm run tunnel)
```

### Technische Entscheidungen

- **Kein Build-Schritt, keine Frameworks** – ES-Module, die direkt im Browser laufen. Änderungen sind sofort sichtbar, die App bleibt über Jahre wartbar.
- **Keine externen Laufzeit-Abhängigkeiten** – weder npm-Pakete noch CDNs. Die einzige externe Bibliothek (ZXing JS für den Safari-Scanner) liegt lokal unter `public/vendor/` und wird mitgeliefert; sie funktioniert auch, wenn Bibliotheken oder CDNs verschwinden. Die APK bindet ZXing zusätzlich nativ ein.
- **Daten in `localStorage` + IndexedDB** – ein JSON-Dokument als schnelle Hauptkopie, automatisch in IndexedDB gespiegelt und per Export/Import sicherbar. Persistenter Speicher schützt zusätzlich vor der Speicherbereinigung durch iOS.
- **Bottom-Sheets mit History-Eintrag** – die Android-Zurück-Taste schließt zuerst das offene Sheet, statt die App zu verlassen.

---

## Grenzen & nächste Schritte

- **Open Food Facts limitiert** Suchanfragen pro Minute. Deshalb: lokale DB zuerst, Online-Suche gedrosselt, Ergebnisse gecacht, 30-Sekunden-Pause nach einem Limit-Fehler.
- **Kein Account, keine Synchronisierung** zwischen Geräten (bewusst). Sync ließe sich später über einen kleinen Server oder Supabase ergänzen.
- **Schrittzähler:** In der APK liest ein natives Plugin den Hardware-Schrittzähler (`TYPE_STEP_COUNTER`). Der Sensor zählt kumulativ seit dem Geräteneustart weiter, auch wenn die App geschlossen ist – beim nächsten Öffnen wird die Differenz nachgetragen. Nach einem Tageswechsel ohne App-Kontakt werden die Schritte dem Tag des Öffnens zugerechnet; nach mehr als 20 Stunden Pause wird der Stand neu gesetzt, statt willkürlich zu verteilen. Im Browser (PWA) bleibt es beim Bewegungssensor und Zählen nur bei geöffneter App; Safari hat keinen HealthKit-Zugriff und pausiert Web-Apps im Hintergrund. Ein echter Hintergrund-Schrittzähler auf dem iPhone würde eine native App mit HealthKit voraussetzen. Schritte lassen sich außerdem jederzeit manuell korrigieren.
- **Community-Rezeptdatenbank, Fitnessarmband-Anbindung und Cloud-Sync** sind nicht enthalten. Eigene Rezepte bleiben lokal und lassen sich als JSON teilen.
- **Native Erweiterungen:** Health Connect/Apple Health, ein echtes Android-Widget und System-Push-Erinnerungen sind bewusst nicht enthalten – sie brauchen native Folgearbeit. PWA-Schnellaktionen für Schnell-Eintrag und Wasser sind vorhanden; die sanfte Erinnerung erscheint beim Öffnen der App.

## Rechtliches

Nachbau der *Funktionen* gängiger Ernährungs-Apps zu Lernzwecken. Der App-Code ist eigenständig; für den Barcode-Scanner wird die Open-Source-Bibliothek ZXing verwendet – nativ in der APK und als lokale JavaScript-Datei in der PWA (Apache-2.0, siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)). Keine fremden Marken und keine fremde Gestaltung übernommen. „Kaloriq" ist ein eigener Name. Nährwertangaben sind Näherungswerte und ersetzen keine fachliche Beratung.
