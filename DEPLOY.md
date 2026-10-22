# Kaloriq dauerhaft online stellen (feste Adresse)

Ziel: **eine Adresse, die sich nie ändert.** Dann bleiben Profil, Mahlzeiten,
Gewicht und API-Key bei jedem Update erhalten – du tippst nichts neu ein.

Der Grund für den bisherigen Datenverlust: Der Cloudflare-**Schnell**-Tunnel
erzeugt bei jedem Start eine neue Adresse. Der Browser speichert App-Daten aber
pro Adresse. Neue Adresse = leerer Speicher. Mit einer festen Adresse ist das
erledigt.

---

## Empfohlen: Cloudflare Pages (kostenlos, kein PC nötig)

### Einmalig einrichten

1. Upload-Paket bauen:

   ```powershell
   cd C:\Users\Pc\Desktop\Projekte\HandyKalorienApp
   npm run build:static
   ```

   → erzeugt den Ordner `dist\`

2. Kostenloses Konto anlegen: <https://dash.cloudflare.com/sign-up>

3. Im Dashboard: **Workers & Pages → Create → Pages → Upload assets**

4. Projektname z. B. `kaloriq` → deine Adresse wird
   **`https://kaloriq.pages.dev`**

5. **Den Inhalt** von `dist\` hochladen (also `index.html`, `js\`, `css\`,
   `icons\`, `sw.js`, `manifest.webmanifest`, `_headers` – nicht den Ordner
   `dist` selbst).

6. Am Handy `https://kaloriq.pages.dev` in Chrome öffnen → **Installieren**.

### Updates (ab jetzt immer gleich)

```powershell
npm run build:static
```

Dann im selben Pages-Projekt **Create new deployment** → `dist`-Inhalt erneut
hochladen. **Adresse bleibt gleich, alle Daten bleiben.** Die App lädt die neuen
Dateien beim nächsten Start automatisch (Service Worker, Netz zuerst).

---

## Alternative: Netlify Drop

<https://app.netlify.com/drop> → `dist`-Ordner hineinziehen → feste Adresse
`https://<name>.netlify.app`. Updates: gleiche Seite, neuen Deploy hochladen,
Adresse bleibt.

---

## Einmaliger Datenumzug von der alten Adresse

Die alte Tunnel-Adresse ist tot, die dort installierte App läuft nur noch aus
dem Cache. Deshalb einmalig:

1. Alte App öffnen → **Profil → Daten exportieren** (JSON-Datei wird gespeichert)
2. Neue Adresse öffnen → **Profil → Daten importieren** → Datei wählen
3. Fertig – danach nie wieder nötig.

Tipp: Der API-Key steckt in der exportierten Datei und ist danach wieder gesetzt.

---

## Warum Updates keine Daten löschen

- App-Daten liegen in `localStorage` unter `kaloriq.state.v1` – Code-Dateien
  haben darauf keinen Zugriff und überschreiben sie nie.
- Neue Felder werden beim Laden ergänzt, vorhandene Werte bleiben
  (`migrate()` in `public/js/store.js`).
- Zusätzlich legt die App automatisch **alle 12 Stunden** eine Sicherung an
  (max. 3 Stände). Zurückholen: **Profil → Sicherungen**.
- Vor **Import** und **Zurücksetzen** wird der aktuelle Stand automatisch
  gesichert.

Löschen kannst du Daten nur noch bewusst über *Profil → Alles zurücksetzen* –
und selbst das ist über die Sicherungen rückholbar.
