# Drittanbieter-Hinweise

Kaloriq selbst steht unter **keiner Open-Source-Lizenz**; alle Rechte
vorbehalten. Diese Datei nennt die Bibliotheken, die mit Kaloriq ausgeliefert
werden: ZXing für den nativen Barcode-Scanner der Android-APK und ZXing JS für
den Barcode-Scanner in Safari und Firefox.

## ZXing Android Embedded 4.3.0

- Projekt: <https://github.com/journeyapps/zxing-android-embedded>
- Copyright (C) 2012–2020 JourneyApps
- Copyright (C) 2008–2020 ZXing authors
- Lizenz: **Apache License, Version 2.0**

## ZXing Core 3.4.1

- Projekt: <https://github.com/zxing/zxing>
- Copyright (C) 2008–2020 ZXing authors
- Lizenz: **Apache License, Version 2.0**

## ZXing JS (`@zxing/library`) 0.21.3

- Projekt: <https://github.com/zxing-js/library>
- Copyright (c) ZXing authors and contributors
- Lizenz: **Apache License, Version 2.0**
- Ausgelieferte Datei: [`public/vendor/zxing.min.js`](public/vendor/zxing.min.js)
- Lizenztext: [`public/vendor/zxing.LICENSE.txt`](public/vendor/zxing.LICENSE.txt)
- Hinweis: [`public/vendor/zxing.NOTICE.txt`](public/vendor/zxing.NOTICE.txt)

Der vollständige Apache-2.0-Lizenztext liegt zusätzlich in
[`LICENSES/Apache-2.0.txt`](LICENSES/Apache-2.0.txt).

ZXing wird in der Android-APK nativ für den Barcode-Scanner verwendet. In der
Web-App (PWA) wird ZXing JS nur dann beim ersten Kamera-Scan geladen, wenn der
Browser keinen `BarcodeDetector` bereitstellt (z. B. Safari und Firefox). Die
Bibliothek liegt lokal im App-Paket und wird nicht von einem CDN geladen.
