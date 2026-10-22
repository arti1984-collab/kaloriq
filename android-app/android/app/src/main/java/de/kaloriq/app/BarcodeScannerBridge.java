package de.kaloriq.app;

import android.app.Activity;
import android.content.Intent;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.google.zxing.client.android.Intents;

import org.json.JSONObject;

/**
 * Bruecke zwischen dem nativen Barcode-Scanner und der Web-App.
 *
 * <p>Im Android-WebView fehlt {@code BarcodeDetector}. Deshalb oeffnet diese
 * Bruecke die native Scanner-Activity (ZXing, offline) und liefert das
 * Ergebnis asynchron an {@code window.__kaloriqBarcode} zurueck. Die
 * Web-App kann so denselben Ablauf wie im Chrome-Browser verwenden.</p>
 */
public class BarcodeScannerBridge {

    /** Eindeutiger Request-Code fuer die Scanner-Activity. */
    public static final int REQUEST_CODE = 4312;

    private final Activity activity;
    private final WebView webView;

    private volatile boolean destroyed = false;
    private volatile boolean scanning = false;

    public BarcodeScannerBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    /* ---------------- JS-API ---------------- */

    /** Ist der native Scanner in dieser Installation verfuegbar? */
    @JavascriptInterface
    public boolean isAvailable() {
        return true;
    }

    /**
     * Oeffnet den Scanner. Das Ergebnis kommt ueber
     * {@code window.__kaloriqBarcode({value, format})}, bei Abbruch mit
     * {@code {cancelled:true}}.
     */
    @JavascriptInterface
    public void scan(String prompt) {
        activity.runOnUiThread(() -> {
            if (destroyed || scanning) {
                return;
            }
            scanning = true;
            try {
                Intent intent = new Intent(activity, BarcodeScanActivity.class);
                intent.setAction(Intents.Scan.ACTION);
                intent.putExtra(
                    Intents.Scan.PROMPT_MESSAGE,
                    prompt != null && !prompt.trim().isEmpty() ? prompt : "Barcode scannen"
                );
                intent.putExtra(Intents.Scan.BEEP_ENABLED, false);
                intent.putExtra(Intents.Scan.ORIENTATION_LOCKED, true);
                activity.startActivityForResult(intent, REQUEST_CODE);
            } catch (Exception err) {
                scanning = false;
                emitError("open_failed");
            }
        });
    }

    /* ---------------- Lifecycle (von MainActivity aufgerufen) ---------------- */

    /** Ergebnis der Scanner-Activity aus MainActivity. */
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_CODE) {
            return;
        }
        scanning = false;

        if (resultCode == Activity.RESULT_OK && data != null) {
            String value = data.getStringExtra(Intents.Scan.RESULT);
            String format = data.getStringExtra(Intents.Scan.RESULT_FORMAT);
            if (value == null || value.trim().isEmpty()) {
                emitError("no_code");
                return;
            }
            emitResult(value.trim(), format);
            return;
        }

        emitCancelled();
    }

    /** Beim Beenden der Activity aufraeumen. */
    public void onDestroy() {
        destroyed = true;
        scanning = false;
    }

    /* ---------------- Intern ---------------- */

    private void emitResult(String value, String format) {
        try {
            JSONObject result = new JSONObject();
            result.put("value", value);
            if (format != null && !format.isEmpty()) {
                result.put("format", format);
            }
            emit(result);
        } catch (Exception err) {
            emitError("read_failed");
        }
    }

    private void emitCancelled() {
        try {
            JSONObject result = new JSONObject();
            result.put("cancelled", true);
            emit(result);
        } catch (Exception ignored) {
            // JSONObject mit einem Boolean kann nicht fehlschlagen.
        }
    }

    private void emitError(String message) {
        try {
            JSONObject result = new JSONObject();
            result.put("error", message);
            emit(result);
        } catch (Exception ignored) {
            // Siehe emitCancelled().
        }
    }

    /** Ruft {@code window.__kaloriqBarcode} im WebView auf. */
    private void emit(JSONObject result) {
        final String js = "window.__kaloriqBarcode&&window.__kaloriqBarcode(" + result.toString() + ");";
        webView.post(() -> {
            if (!destroyed) {
                webView.evaluateJavascript(js, null);
            }
        });
    }
}
