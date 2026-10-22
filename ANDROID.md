# Kaloriq als Android-APK

Die App läuft als **eigenständige APK komplett offline** – alle Dateien sind in
der APK enthalten, es wird kein Server und keine Internetverbindung gebraucht
(Ausnahme: KI-Schätzung und Open-Food-Facts-Suche, wenn du sie nutzt).

Gebaut mit [Capacitor](https://capacitorjs.com): die normale PWA (`public/`)
wird unverändert in eine Android-Hülle gepackt. Kein zweiter Code, keine
abweichende Logik.

---

## Bauen

```powershell
npm run apk
```

Das Skript erledigt alles:

1. `dist/` neu bauen
2. nach `android-app/www/` kopieren
3. Capacitor synchronisieren
4. Release-APK signieren und bauen
5. APK als `Kaloriq-<Version>.apk` ins Projektverzeichnis legen

Dauer: ~1 Minute (der erste Build lädt Gradle-Abhängigkeiten, danach ~5 s).

Voraussetzungen (einmalig installiert):

| Werkzeug | Version | Ort |
|---|---|---|
| JDK | Temurin 21 | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` |
| Android SDK | Platform 35/36, Build-Tools 35/36 | `%LOCALAPPDATA%\Android\Sdk` |
| Gradle | 8.14.3 (Wrapper) | `android-app/android/gradle` |

Nachinstallieren ließe sich das mit:

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
# SDK: https://developer.android.com/studio#command-line-tools → entpacken nach %LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

---

## Installieren

1. `Kaloriq-<Version>.apk` aufs Handy kopieren (USB, Cloud, Messenger an dich selbst).
2. Datei antippen → Chrome/Dateimanager fragt nach **„Unbekannte Quellen zulassen"** → erlauben.
3. **Installieren** → die App erscheint mit eigenem Icon als „Kaloriq".

Alternativ per USB mit ADB:

```powershell
adb install -r Kaloriq-<Version>.apk
```

---

## Daten und Updates

- Die App speichert wie die PWA in `localStorage` des WebViews
  (`kaloriq.state.v1`, `kaloriq.backups.v1`).
- **Update über die alte Version installieren** (gleiche `applicationId`,
  gleicher Signaturschlüssel) → **Daten bleiben erhalten**.
- **Deinstallieren löscht die App-Daten.** Vorher: Profil → Daten exportieren
  (JSON) oder Sicherungen prüfen.

### Signaturschlüssel

`android-app/keystore/kaloriq-release.jks` + `keystore.properties`
(Passwort steht dort im Klartext – Datei nicht weitergeben, nicht veröffentlichen).

**Diesen Ordner aufbewahren.** Ohne ihn lässt sich die App später nicht mehr
über eine bestehende Installation aktualisieren (Android akzeptiert nur
Updates mit demselben Schlüssel). Ein Backup liegt im Projekt-ZIP.

---

## Was anders ist als in der PWA

| Punkt | APK |
|---|---|
| Offline | ✅ alles lokal in der APK, auch ohne Netz |
| KI-Schätzung | ✅ direkt zu Google mit deinem Key (kein Server-Proxy) |
| Key-Speicherung | auf dem Gerät (Profil → KI-Tracking) |
| Barcode-Scan | ✅ nativer ZXing-Scanner (Kamera, offline) – zusätzlich bleibt die Nummer eintippbar |
| Schrittzähler | ✅ Gerätesensor (`TYPE_STEP_COUNTER`) – trägt Schritte aus der Zeit mit geschlossener App beim nächsten Öffnen nach |
| Kamera/Fotos | ✅ über den Android-Dateiauswahl-Dialog |
| Installation | ✅ eigenes Icon, Vollbild, kein Browser |
| Updates | ✅ APK drüber installieren, Daten bleiben |

---

## Aufbau

```
android-app/
  capacitor.config.json   App-ID, Name, Web-Verzeichnis
  prepare.mjs             kopiert dist/ → www/
  package.json            Capacitor-Abhängigkeiten (nur für den Build)
  keystore/               Signaturschlüssel (geheim halten!)
  www/                    Web-Stand (generiert, nicht bearbeiten)
  android/                natives Android-Projekt (Hülle; Java-Brücken unter app/src/main/java)
    app/build.gradle      versionName/versionCode (wird von npm run bump gesetzt) + ZXing-Abhängigkeit
    app/src/main/java/    MainActivity, Scanner- und Schrittzähler-Brücken
    app/src/main/res/     Icons + Splash (aus public/icons erzeugt)
```

`android-app/www` und `android-app/android/build` sind **generiert** – Änderungen
dort werden beim nächsten `npm run apk` überschrieben. Der einzige Ort für
Inhalte ist `public/`.

---

## Nativer Barcode-Scanner

Das Android-WebView stellt `BarcodeDetector` nicht bereit. In der APK öffnet der
Button **Scannen** deshalb eine native Scanner-Activity auf Basis von
[ZXing Android Embedded](https://github.com/journeyapps/zxing-android-embedded)
(offline, ohne Google Play-Dienste). ZXing steht unter Apache-2.0; Hinweise
und Lizenztext: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md),
[`LICENSES/Apache-2.0.txt`](LICENSES/Apache-2.0.txt).

| Datei | Aufgabe |
| --- | --- |
| `app/src/main/java/de/kaloriq/app/BarcodeScannerBridge.java` | JS-Brücke (`window.AndroidBarcodeScanner`), startet den Scan und liefert das Ergebnis an `window.__kaloriqBarcode` |
| `.../BarcodeScanActivity.java` | eigene Scanner-Activity im Hochformat; verdrängt die Web-App nicht aus dem Task |
| `.../MainActivity.java` | registriert die Brücke und leitet `onActivityResult` weiter |
| `.../AndroidManifest.xml` | deklariert die Scanner-Activity (`exported=false`); `CAMERA` ist bereits für Fotos vorhanden |
| `app/build.gradle` | `com.journeyapps:zxing-android-embedded:4.3.0` |
| `public/js/views/add.js` | erkennt die Brücke, zeigt den Scan-Button, verarbeitet Ergebnis/Abbruch/Fehler; in der PWA weiterhin `BarcodeDetector` |

**Ablauf:** `scan()` öffnet die Kamera-Activity. Nach einem Treffer liefert
ZXing den Code und das Format zurück; die Web-App trägt ihn ins Barcode-Feld ein
und startet die Open-Food-Facts-Suche. Bei Abbruch bleibt die manuelle Eingabe.
Die Kamera-Berechtigung fragt die Scanner-Activity beim ersten Scan ab.

**Fehlercodes:** `open_failed`, `no_code`, `read_failed`. Die Web-App übersetzt
sie und zeigt eine verständliche Meldung an.

Beim Bauen nicht überschreiben: `MainActivity.java`, `BarcodeScannerBridge.java`,
`BarcodeScanActivity.java` und `StepCounterBridge.java` liegen im nativen Projekt
und werden von `cap sync` nicht neu erzeugt.

---

## Nativer Schrittzähler

Die Web-App nutzt in der APK den Hardware-Schrittzähler, statt nur den
Bewegungssensor auszuwerten:

| Datei | Aufgabe |
| --- | --- |
| `app/src/main/java/de/kaloriq/app/StepCounterBridge.java` | liest `Sensor.TYPE_STEP_COUNTER`, verwaltet die `ACTIVITY_RECOGNITION`-Berechtigung und meldet den Stand an die WebView (`window.AndroidStepCounter`, Rückruf `window.__kaloriqNativeSteps`) |
| `.../MainActivity.java` | registriert die Brücke, leitet Berechtigungs-Ergebnisse weiter |
| `.../AndroidManifest.xml` | `ACTIVITY_RECOGNITION` + optionales Feature `android.hardware.sensor.stepcounter` |
| `public/js/steps.js` | erkennt die Brücke, führt den Abgleich mit `settings.stepCounter` durch, fällt sonst auf `DeviceMotionEvent` zurück |

**So funktioniert es:** `TYPE_STEP_COUNTER` liefert die Schritte seit dem
letzten Geräteneustart – unabhängig davon, ob die App läuft. Beim Öffnen liest
die App den aktuellen Stand und verbucht die Differenz zum zuletzt
gespeicherten Stand. Ein Hintergrunddienst ist nicht nötig; die App fragt beim
ersten Start nach der Berechtigung „Körperliche Aktivität“.

**Grenzen:**

- Nach einem Geräteneustart beginnt der Zähler bei 0. Der gespeicherte Stand
  wird dann ohne Nachtrag neu gesetzt.
- Wird die App über einen Tageswechsel hinweg geschlossen, lässt sich nicht
  trennen, wie viele Schritte auf welchen Tag entfallen. Die Differenz wird
  dem Tag des Öffnens zugerechnet – bei mehr als 20 Stunden Pause wird sie
  verworfen, damit kein unrealistischer Tageswert entsteht.
- Geräte ohne Step-Counter-Sensor nutzen weiterhin den Bewegungssensor
  (zählt nur bei geöffneter App).

Beim Bauen nicht überschreiben: `MainActivity.java` und `StepCounterBridge.java`
liegen im nativen Projekt und werden von `cap sync` nicht neu erzeugt.

---

## Version

`npm run bump` setzt automatisch:

- `package.json` → `version`
- `public/js/version.js` → Anzeige in der App
- `public/sw.js` → Cache-Name
- `android-app/android/app/build.gradle` → `versionName` + `versionCode`

Danach `npm run apk` für die neue APK.
