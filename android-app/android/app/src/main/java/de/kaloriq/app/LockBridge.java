package de.kaloriq.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/**
 * JS-Brücke für die Gerätesperre der App-Sperre.
 * Nutzt die Systemabfrage (Fingerabdruck, Gesicht oder Entsperrmuster),
 * ohne eigene Bibliothek und ohne Netzwerk.
 */
public class LockBridge {

    static final int REQUEST = 4721;

    private final Activity activity;
    private final WebView webView;

    public LockBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public boolean isAvailable() {
        try {
            KeyguardManager keyguard = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
            return keyguard != null && keyguard.isDeviceSecure();
        } catch (Exception err) {
            return false;
        }
    }

    @JavascriptInterface
    public void confirm(String title, String subtitle) {
        KeyguardManager keyguard = (KeyguardManager) activity.getSystemService(Context.KEYGUARD_SERVICE);
        if (keyguard == null || !keyguard.isDeviceSecure()) {
            emit(false);
            return;
        }
        Intent intent = keyguard.createConfirmDeviceCredentialIntent(title, subtitle);
        if (intent == null) {
            emit(false);
            return;
        }
        try {
            activity.startActivityForResult(intent, REQUEST);
        } catch (Exception err) {
            emit(false);
        }
    }

    void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST) return;
        emit(resultCode == Activity.RESULT_OK);
    }

    private void emit(boolean unlocked) {
        final String js = "window.__kaloriqLockResult&&window.__kaloriqLockResult(" + unlocked + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
}
