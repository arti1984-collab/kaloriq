package de.kaloriq.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.util.Calendar;

/** Plant die tägliche System-Erinnerung per AlarmManager. */
public final class ReminderScheduler {

    static final String PREFS = "kaloriq_reminders";
    static final String KEY_ENABLED = "enabled";
    static final String KEY_HOUR = "hour";
    static final String KEY_MINUTE = "minute";
    static final String KEY_FAST_ENABLED = "fast_enabled";
    static final String KEY_FAST_END = "fast_end";
    static final String KEY_FAST_BEFORE = "fast_before";
    private static final int ALARM_REQUEST = 4313;
    private static final int FAST_END_REQUEST = 4316;
    private static final int FAST_SOON_REQUEST = 4317;

    private ReminderScheduler() {}

    static void schedule(Context context, int hour, int minute) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(KEY_ENABLED, true)
            .putInt(KEY_HOUR, hour)
            .putInt(KEY_MINUTE, minute)
            .apply();

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, ReminderReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) {
            next.add(Calendar.DAY_OF_YEAR, 1);
        }

        alarmManager.setInexactRepeating(
            AlarmManager.RTC_WAKEUP,
            next.getTimeInMillis(),
            AlarmManager.INTERVAL_DAY,
            pending
        );
    }

    static void cancel(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_ENABLED, false).apply();

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        Intent intent = new Intent(context, ReminderReceiver.class);
        PendingIntent pending = PendingIntent.getBroadcast(
            context,
            ALARM_REQUEST,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        alarmManager.cancel(pending);
    }

    static void reschedule(Context context) {
        if (isEnabled(context)) {
            schedule(context, getHour(context), getMinute(context));
        }
    }

    /**
     * Plant die Fasten-Erinnerungen: einmal zum Ende, optional vorher.
     * Die Alarme sind bewusst nicht exakt (kein Sonderrecht nötig) und
     * werden nach einem Neustart aus den Einstellungen wiederhergestellt.
     */
    static void scheduleFast(Context context, long endMillis, int beforeMinutes, boolean enabled) {
        cancelFast(context);
        if (!enabled) return;
        long now = System.currentTimeMillis();
        if (endMillis <= now) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean(KEY_FAST_ENABLED, true)
            .putLong(KEY_FAST_END, endMillis)
            .putInt(KEY_FAST_BEFORE, Math.max(0, beforeMinutes))
            .apply();

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        long soon = endMillis - Math.max(0, beforeMinutes) * 60000L;
        if (beforeMinutes > 0 && soon > now) {
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                soon,
                fastIntent(context, "fast_soon", FAST_SOON_REQUEST)
            );
        }
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            endMillis,
            fastIntent(context, "fast_end", FAST_END_REQUEST)
        );
    }

    static void cancelFast(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putBoolean(KEY_FAST_ENABLED, false).remove(KEY_FAST_END).apply();

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        alarmManager.cancel(fastIntent(context, "fast_end", FAST_END_REQUEST));
        alarmManager.cancel(fastIntent(context, "fast_soon", FAST_SOON_REQUEST));
    }

    static void rescheduleFast(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_FAST_ENABLED, false)) return;
        long end = prefs.getLong(KEY_FAST_END, 0);
        if (end <= System.currentTimeMillis()) {
            prefs.edit().putBoolean(KEY_FAST_ENABLED, false).remove(KEY_FAST_END).apply();
            return;
        }
        scheduleFast(context, end, prefs.getInt(KEY_FAST_BEFORE, 0), true);
    }

    static boolean isFastEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_FAST_ENABLED, false);
    }

    private static PendingIntent fastIntent(Context context, String type, int request) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.putExtra("type", type);
        return PendingIntent.getBroadcast(
            context,
            request,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean(KEY_ENABLED, false);
    }

    static int getHour(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getInt(KEY_HOUR, 18);
    }

    static int getMinute(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getInt(KEY_MINUTE, 0);
    }
}
