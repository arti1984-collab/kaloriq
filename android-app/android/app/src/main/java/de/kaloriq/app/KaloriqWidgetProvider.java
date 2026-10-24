package de.kaloriq.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Home-Screen-Widget mit den wichtigsten Tageswerten. */
public class KaloriqWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            update(context, appWidgetManager, id);
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, KaloriqWidgetProvider.class));
        for (int id : ids) {
            update(context, manager, id);
        }
    }

    private static void update(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetBridge.PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kaloriq);

        views.setTextViewText(R.id.widget_kcal, prefs.getString(WidgetBridge.KEY_KCAL, "–"));
        views.setTextViewText(R.id.widget_water, prefs.getString(WidgetBridge.KEY_WATER, "–"));
        views.setTextViewText(R.id.widget_steps, prefs.getString(WidgetBridge.KEY_STEPS, "–"));
        String updated = prefs.getString(WidgetBridge.KEY_UPDATED, "");
        views.setTextViewText(R.id.widget_updated, updated.isEmpty() ? context.getString(R.string.widget_hint) : updated);

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(
            context, 10, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, openPi);

        Intent quick = new Intent(context, MainActivity.class);
        quick.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        quick.putExtra("widget_action", "quick");
        PendingIntent quickPi = PendingIntent.getActivity(
            context, 11, quick, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_quick, quickPi);

        Intent water = new Intent(context, MainActivity.class);
        water.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        water.putExtra("widget_action", "water");
        PendingIntent waterPi = PendingIntent.getActivity(
            context, 12, water, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_water_button, waterPi);

        manager.updateAppWidget(widgetId, views);
    }
}
