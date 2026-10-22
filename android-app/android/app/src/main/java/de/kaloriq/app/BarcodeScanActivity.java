package de.kaloriq.app;

import com.journeyapps.barcodescanner.CaptureActivity;

/**
 * Eigene Scanner-Activity fuer die APK.
 *
 * <p>Die Bibliothek bringt bereits eine {@link CaptureActivity} mit, diese ist
 * aber auf Querformat festgelegt und beendet beim Start den bestehenden Task.
 * Fuer Kaloriq brauchen wir eine normale, im Hochformat geoeffnete Activity,
 * die nach dem Scan wieder zur Web-App zurueckkehrt.</p>
 */
public class BarcodeScanActivity extends CaptureActivity {
}
