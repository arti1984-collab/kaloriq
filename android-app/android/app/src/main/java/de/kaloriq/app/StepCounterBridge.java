package de.kaloriq.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import java.util.Locale;

/**
 * Brücke zwischen dem Android-Schrittsensor und der Web-App.
 *
 * <p>{@link Sensor#TYPE_STEP_COUNTER} liefert die Schritte seit dem letzten
 * Geräteneustart (kumulativ). Der Sensor zählt in der Hardware weiter, auch
 * wenn die App geschlossen ist. Beim nächsten Öffnen liest die App den
 * aktuellen Stand und trägt die Differenz zum zuletzt gespeicherten Stand
 * nach – ein Hintergrunddienst ist dafür nicht nötig.</p>
 *
 * <p>Die Methoden werden per {@code addJavascriptInterface} als
 * {@code window.AndroidStepCounter} freigegeben. Da sie auf dem
 * JavaBridge-Thread laufen, werden alle Sensor- und UI-Aktionen auf den
 * Main-Thread verschoben.</p>
 */
public class StepCounterBridge implements SensorEventListener {

    /** Eindeutiger Request-Code für die Aktivitäts-Berechtigung. */
    public static final int REQUEST_CODE = 4311;

    private static final long EMIT_INTERVAL_MS = 500L;

    private final Activity activity;
    private final WebView webView;
    private final SensorManager sensorManager;
    private final Sensor stepSensor;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private boolean listening = false;
    private long lastValue = -1;
    private long lastSensorAt = -1;
    private long lastSensorWall = -1;
    private long lastEmitAt = 0;
    private long pendingValue = -1;
    private boolean emitScheduled = false;
    private volatile boolean destroyed = false;

    /** Nachlaufendes Update: zeigt den letzten Schritt spätestens nach 500 ms. */
    private final Runnable emitPending = () -> {
        emitScheduled = false;
        if (destroyed || pendingValue < 0) {
            return;
        }
        long value = pendingValue;
        pendingValue = -1;
        lastEmitAt = SystemClock.elapsedRealtime();
        emit("update", value);
    };

    public StepCounterBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.sensorManager = (SensorManager) activity.getSystemService(Context.SENSOR_SERVICE);
        Sensor sensor = null;
        if (sensorManager != null) {
            sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        }
        this.stepSensor = sensor;
    }

    /* ---------------- JS-API ---------------- */

    /** Ist ein Hardware-Schrittzähler vorhanden? */
    @JavascriptInterface
    public boolean isAvailable() {
        return stepSensor != null;
    }

    /** Darf die App den Schrittsensor lesen? */
    @JavascriptInterface
    public boolean hasPermission() {
        return checkPermission();
    }

    /** Letzter bekannter Stand seit dem letzten Neustart (-1 = unbekannt). */
    @JavascriptInterface
    public long getStepsSinceBoot() {
        return lastValue;
    }

    /**
     * Startet das Mitlesen. Fehlt die Berechtigung, wird sie hier angefordert;
     * das Ergebnis kommt über {@link #onPermissionResult(int, String[], int[])}.
     */
    @JavascriptInterface
    public void start() {
        mainHandler.post(this::startInternal);
    }

    /** Beendet das Mitlesen (der Hardware-Zähler läuft unabhängig weiter). */
    @JavascriptInterface
    public void stop() {
        mainHandler.post(() -> {
            stopListening();
            emit("stopped", lastValue);
        });
    }

    /* ---------------- Lifecycle (von MainActivity aufgerufen) ---------------- */

    /** Nach dem Wechsel in den Vordergrund: Sensor neu registrieren.
     *  Android liefert beim erneuten Registrieren sofort den aktuellen
     *  Zählerstand – dadurch springt die Anzeige nicht erst beim nächsten
     *  Schrittereignis, sondern direkt auf den echten Wert. */
    public void onResume() {
        if (listening) {
            stopListening();
            registerListener();
        }
    }

    /** Beim Beenden der Activity aufräumen. */
    public void onDestroy() {
        destroyed = true;
        stopListening();
    }

    /** Ergebnis der Berechtigungsabfrage aus MainActivity. */
    public void onPermissionResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != REQUEST_CODE) {
            return;
        }
        boolean granted = grantResults.length > 0
            && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (granted) {
            startInternal();
        } else {
            listening = false;
            emit("denied", -1);
        }
    }

    /* ---------------- Intern ---------------- */

    private boolean checkPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return true;
        }
        return activity.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private void startInternal() {
        if (stepSensor == null) {
            emit("unavailable", -1);
            return;
        }
        if (!checkPermission()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                activity.requestPermissions(
                    new String[] { Manifest.permission.ACTIVITY_RECOGNITION },
                    REQUEST_CODE
                );
            }
            return;
        }
        registerListener();
    }

    private void registerListener() {
        if (stepSensor == null || sensorManager == null || !checkPermission()) {
            return;
        }
        if (!listening) {
            sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_UI);
            listening = true;
        }
        // Nach einem Neustart der App oder einem Reload der Seite den letzten
        // bekannten Stand sofort an die Web-App melden – aber nur, wenn er
        // frisch ist. Ein tagelang zwischengespeicherter Wert würde sonst als
        // Ausgangspunkt für die Tageszuordnung dienen.
        boolean fresh = lastValue >= 0
            && lastSensorAt >= 0
            && SystemClock.elapsedRealtime() - lastSensorAt < 5 * 60 * 1000L;
        // Das erste Sensor-Ereignis nach der Registrierung immer durchreichen.
        lastEmitAt = 0;
        emit("running", fresh ? lastValue : -1);
    }

    private void stopListening() {
        if (listening && sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        listening = false;
        mainHandler.removeCallbacks(emitPending);
        emitScheduled = false;
        pendingValue = -1;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) {
            return;
        }
        if (event.values.length == 0) {
            return;
        }
        long value = Math.round(event.values[0]);
        if (value < 0) {
            return;
        }
        lastValue = value;
        lastSensorAt = SystemClock.elapsedRealtime();
        lastSensorWall = System.currentTimeMillis();

        // Höchstens alle 500 ms ein Update an die WebView – aber ohne das
        // letzte Ereignis zu verlieren. Bisher wurden Ereignisse innerhalb
        // des Intervalls einfach verworfen, dadurch konnte die Anzeige
        // mehrere Sekunden hinterherlaufen.
        long now = SystemClock.elapsedRealtime();
        pendingValue = value;
        if (lastEmitAt == 0 || now - lastEmitAt >= EMIT_INTERVAL_MS) {
            mainHandler.removeCallbacks(emitPending);
            emitScheduled = false;
            pendingValue = -1;
            lastEmitAt = now;
            emit("update", value);
            return;
        }

        if (!emitScheduled) {
            emitScheduled = true;
            mainHandler.postDelayed(emitPending, EMIT_INTERVAL_MS - (now - lastEmitAt));
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Nicht relevant: TYPE_STEP_COUNTER liefert eine feste Zählung.
    }

    /** Meldet Status und Zählerstand an {@code window.__kaloriqNativeSteps}. */
    private void emit(String status, long value) {
        final String js = String.format(
            Locale.US,
            "window.__kaloriqNativeSteps&&window.__kaloriqNativeSteps({status:\"%s\",value:%d,ts:%d});",
            status,
            value,
            lastSensorWall
        );
        webView.post(() -> {
            if (destroyed) {
                return;
            }
            webView.evaluateJavascript(js, null);
        });
    }
}
