# Arbeitsregeln – Kaloriq

## 1. Versionsnummer bei JEDER Änderung erhöhen (Pflicht)

Nach jeder Änderung an der App (alles unter `public/`: Code, Styles, Texte,
Manifest, Icons) muss die Version steigen. Nicht vergessen, nicht überspringen.
Reine Doku-Änderungen (README, DEPLOY, AGENTS) brauchen keinen Bump.

```powershell
npm run bump          # Patch: 1.1.1 → 1.1.2
npm run bump 1.2.0    # feste Version (Minor/Major)
```

Das Skript aktualisiert gemeinsam:

- `package.json` → `version`
- `public/js/version.js` → `APP_VERSION` (Anzeige unter **Profil**)
- `public/sw.js` → `kaloriq-vN` (Cache-Name, erzwingt frisches App-Shell)
- `android-app/android/app/build.gradle` → `versionName` + `versionCode` (falls vorhanden)
- `dist\` → Upload-Paket wird direkt neu gebaut

Niemals die Nummern einzeln von Hand ändern – sonst laufen App-Anzeige und
Service-Worker-Cache auseinander.

## 2. Daten nie löschen

- Speicher: `localStorage`, Schlüssel `kaloriq.state.v1`
- Migration nur ergänzend (`migrate()` in `public/js/store.js`)
- Automatische Sicherungen (`kaloriq.backups.v1`) nicht abschalten
- Vor destruktiven Aktionen `snapshot(true)` aufrufen

## 3. Keine Build-Tools

Reines ES-Module-JavaScript, kein Bundler, keine npm-Abhängigkeiten.
Neue JS-Dateien zusätzlich in die `SHELL`-Liste von `public/sw.js` eintragen,
sonst fehlen sie offline.

Ausnahme ist ausschließlich die **APK-Verpackung** (`android-app/` mit Capacitor):
Sie kopiert `dist\` unverändert in eine Android-Hülle. Die App selbst bleibt
abhängigkeitsfrei.

## 4. APK

- Bauen: `npm run apk` → `Kaloriq-<Version>.apk` im Projektordner.
- `android-app/www/` und `android-app/android/.../build/` sind **generiert** –
  nie dort bearbeiten, Quelle ist immer `public/`.
- `android-app/keystore/` (Signaturschlüssel + Passwort) **niemals löschen**
  und nicht veröffentlichen – ohne ihn gibt es keine Updates auf bestehenden
  Installationen.
- Icons/Splash liegen in `android-app/android/app/src/main/res/` und werden aus
  `public/icons/` erzeugt.
- Details: `ANDROID.md`
