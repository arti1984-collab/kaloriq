/* ============================================================
   Kaloriq – System-Erinnerungen (Android)
   Nutzt AlarmManager/NotificationManager in der APK. In der PWA
   bleibt die In-App-Erinnerung beim Öffnen aktiv.
   ============================================================ */
import { store } from './store.js';
import { toast } from './ui.js';

function bridge() {
  if (typeof window === 'undefined') return null;
  const b = window.AndroidReminders;
  return b && typeof b.isAvailable === 'function' && b.isAvailable() ? b : null;
}

export function systemRemindersAvailable() {
  try {
    return Boolean(bridge());
  } catch {
    return false;
  }
}

export function scheduleSystemReminder(enabled, time = '18:00') {
  const b = bridge();
  if (!b?.schedule) return;
  const [hour, minute] = String(time).split(':').map((n) => Number(n) || 0);
  try {
    b.schedule(hour, minute, Boolean(enabled));
  } catch (err) {
    toast(err.message || 'Erinnerung konnte nicht geplant werden', 'err');
  }
}

export function initReminders() {
  const b = bridge();
  if (!b) return;

  window.__kaloriqReminderStatus = (granted) => {
    if (granted) return;
    store.saveSettings({ reminderEnabled: false });
    toast('Benachrichtigungen nicht erlaubt – Erinnerung aus', 'err');
  };

  const settings = store.get().settings;
  scheduleSystemReminder(Boolean(settings.reminderEnabled), settings.reminderTime || '18:00');
}
