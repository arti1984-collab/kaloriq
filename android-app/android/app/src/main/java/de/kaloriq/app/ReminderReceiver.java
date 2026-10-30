package de.kaloriq.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/** Zeigt die tägliche, sanfte Check-in-Erinnerung und die Fasten-Hinweise. */
public class ReminderReceiver extends BroadcastReceiver {

    private static final String CHANNEL_ID = "kaloriq_checkin";
    private static final int NOTIFICATION_ID = 4314;
    private static final int FAST_NOTIFICATION_ID = 4318;

    @Override
    public void onReceive(Context context, Intent intent) {
        String type = intent == null ? null : intent.getStringExtra("type");
        boolean fast = "fast_end".equals(type) || "fast_soon".equals(type);

        if (fast) {
            if (!ReminderScheduler.isFastEnabled(context)) return;
        } else if (!ReminderScheduler.isEnabled(context)) {
            return;
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.reminder_channel),
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription(context.getString(R.string.reminder_channel_desc));
            manager.createNotificationChannel(channel);
        }

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        open.putExtra("widget_action", fast ? "fasting" : "quick");
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            fast ? 21 : 20,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title;
        String text;
        if ("fast_soon".equals(type)) {
            title = context.getString(R.string.fast_soon_title);
            text = context.getString(R.string.fast_soon_text);
        } else if ("fast_end".equals(type)) {
            title = context.getString(R.string.fast_end_title);
            text = context.getString(R.string.fast_end_text);
        } else {
            title = context.getString(R.string.reminder_title);
            text = context.getString(R.string.reminder_text);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .addAction(
                0,
                context.getString(fast ? R.string.fast_action : R.string.reminder_action),
                contentIntent
            );

        try {
            NotificationManagerCompat.from(context).notify(
                fast ? FAST_NOTIFICATION_ID : NOTIFICATION_ID,
                builder.build()
            );
        } catch (SecurityException ignored) {
            // Benachrichtigungsrecht wurde entzogen – App bleibt nutzbar.
        }
    }
}
