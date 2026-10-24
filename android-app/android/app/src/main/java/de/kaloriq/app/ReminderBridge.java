package de.kaloriq.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/** JS-Brücke für die tägliche System-Erinnerung. */
public class ReminderBridge {

    static final int PERMISSION_REQUEST = 4315;

    private final Activity activity;
    private final WebView webView;
    private int pendingHour = -1;
    private int pendingMinute = -1;

    public ReminderBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return true;
    }

    @JavascriptInterface
    public boolean isEnabled() {
        return ReminderScheduler.isEnabled(activity);
    }

    @JavascriptInterface
    public int getHour() {
        return ReminderScheduler.getHour(activity);
    }

    @JavascriptInterface
    public int getMinute() {
        return ReminderScheduler.getMinute(activity);
    }

    @JavascriptInterface
    public void schedule(int hour, int minute, boolean enabled) {
        if (!enabled) {
            ReminderScheduler.cancel(activity);
            emitStatus(true);
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) {
            pendingHour = hour;
            pendingMinute = minute;
            activity.runOnUiThread(() -> activity.requestPermissions(
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                PERMISSION_REQUEST
            ));
            return;
        }
        ReminderScheduler.schedule(activity, hour, minute);
        emitStatus(true);
    }

    void onPermissionResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != PERMISSION_REQUEST) return;
        boolean granted = grantResults.length > 0
            && grantResults[0] == PackageManager.PERMISSION_GRANTED;
        if (granted && pendingHour >= 0) {
            ReminderScheduler.schedule(activity, pendingHour, pendingMinute);
        }
        pendingHour = -1;
        pendingMinute = -1;
        emitStatus(granted);
    }

    private void emitStatus(boolean granted) {
        final String js = "window.__kaloriqReminderStatus&&window.__kaloriqReminderStatus(" + granted + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
}
