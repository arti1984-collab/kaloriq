package de.kaloriq.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Stellt die tägliche Erinnerung und offene Fasten-Alarme nach einem Neustart wieder her. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            ReminderScheduler.reschedule(context);
            ReminderScheduler.rescheduleFast(context);
        }
    }
}
