package de.kaloriq.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

/**
 * Nimmt die aktuellen Tageswerte aus der Web-App entgegen und aktualisiert
 * das Home-Screen-Widget. Die Werte liegen in SharedPreferences, damit das
 * Widget auch ohne geöffnete App etwas anzeigen kann.
 */
public class WidgetBridge {

    static final String PREFS = "kaloriq_widget";
    static final String KEY_KCAL = "kcal";
    static final String KEY_WATER = "water";
    static final String KEY_STEPS = "steps";
    static final String KEY_UPDATED = "updated";
    static final String KEY_PENDING = "pending_action";

    private final Context context;

    public WidgetBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return true;
    }

    @JavascriptInterface
    public void update(String json) {
        try {
            JSONObject data = new JSONObject(json);
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(KEY_KCAL, data.optString("kcal", "–"))
                .putString(KEY_WATER, data.optString("water", "–"))
                .putString(KEY_STEPS, data.optString("steps", "–"))
                .putString(KEY_UPDATED, data.optString("updated", ""))
                .apply();
            KaloriqWidgetProvider.updateAll(context);
        } catch (Exception ignored) {
            // Ungültige Daten dürfen die App nicht stören.
        }
    }

    /** Einmalige Aktion aus einem Widget-Klick (quick/water), danach geleert. */
    @JavascriptInterface
    public String getPendingAction() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String action = prefs.getString(KEY_PENDING, "");
        if (!action.isEmpty()) {
            prefs.edit().remove(KEY_PENDING).apply();
        }
        return action;
    }

    public static void setPendingAction(Context context, String action) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PENDING, action == null ? "" : action)
            .apply();
    }

    @JavascriptInterface
    public void clearPendingAction() {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_PENDING)
            .apply();
    }
}
