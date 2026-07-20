// Local notification reminders with a ✓ action.
//
// Honest limitation: tapping ✓ wakes the app to apply the completion — Capacitor delivers the
// action to JS, so something has to be running to handle it. Truly app-less completion needs a
// Kotlin BroadcastReceiver, which is deferred to Gate 2 alongside the widget's native work.
// The user still only taps once and never has to find the habit themselves.

import { nextTriggerAt, notificationId } from './reminder-math.js';

const ACTION_TYPE = 'HABIT_REMINDER';
const DONE_ACTION = 'COMPLETE_HABIT';

/** Null when the plugin is absent — i.e. every browser. Callers no-op rather than branching. */
function plugin() {
  return window.Capacitor?.Plugins?.LocalNotifications ?? null;
}

export async function initReminders(onComplete) {
  const ln = plugin();
  if (!ln) return false;

  await ln.registerActionTypes({
    types: [{
      id: ACTION_TYPE,
      actions: [{ id: DONE_ACTION, title: 'Done ✓' }],
    }],
  });

  ln.addListener('localNotificationActionPerformed', (event) => {
    if (event.actionId !== DONE_ACTION) return;
    const habitId = event.notification?.extra?.habitId;
    if (habitId) onComplete(habitId);
  });

  return true;
}

/** Asked only when the user actually sets a reminder — never as a cold prompt on first launch. */
export async function ensurePermission() {
  const ln = plugin();
  if (!ln) return false;
  const current = await ln.checkPermissions();
  if (current.display === 'granted') return true;
  const asked = await ln.requestPermissions();
  return asked.display === 'granted';
}

/**
 * Replace every scheduled reminder with the current set. Cancel-then-schedule keeps ids stable and
 * stops a renamed or deleted habit from leaving a ghost notification behind.
 */
export async function syncReminders(habits, creatureName) {
  const ln = plugin();
  if (!ln) return;

  const pending = await ln.getPending();
  if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications });

  const toSchedule = habits
    .filter((h) => h.reminder)
    .map((h) => {
      const at = nextTriggerAt(h.reminder);
      if (!at) return null;
      return {
        id: notificationId(h.id),
        title: `${h.glyph} ${h.name}`,
        // The creature asks, the app does not nag (VALIDATION_REPORT §4 notification ethics).
        body: `${creatureName} is ready when you are.`,
        schedule: { at, repeats: true, every: 'day', allowWhileIdle: true },
        actionTypeId: ACTION_TYPE,
        extra: { habitId: h.id },
      };
    })
    .filter(Boolean);

  if (toSchedule.length) await ln.schedule({ notifications: toSchedule });
}
