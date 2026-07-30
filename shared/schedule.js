// Habit schedules (MASTER_PLAN §3.5: `schedule(daily or specific weekdays)`). A habit with no
// `days` runs every day — that is the default and the shape every habit had before schedules
// existed, so old saves keep working untouched.
//
// The point of a schedule is not filtering the list. It is that a rest day must not count as a
// miss: a Mon/Wed/Fri habit skipped on Sunday has not been broken, and a streak that punishes you
// for a day you never planned to train is the guilt mechanic this game is built to avoid.

/** Weekday index of an ISO date (0 = Sunday), read in UTC so it matches the stored date key. */
export function weekdayOf(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Every day unless a non-empty `days` list says otherwise. */
export function isScheduledOn(habit, dateStr) {
  const days = habit?.days;
  if (!Array.isArray(days) || days.length === 0) return true;
  return days.includes(weekdayOf(dateStr));
}

/** The habits that actually count today — what Home lists and what a perfect day is measured against. */
export function scheduledOn(habits = [], dateStr) {
  return habits.filter((h) => isScheduledOn(h, dateStr));
}

/**
 * Did this habit miss a day it was scheduled for, between two dates (both exclusive of `toDate`)?
 * Rest days are skipped, so only a planned day that went uncompleted breaks a streak.
 */
export function missedScheduledDay(habit, log, fromDate, toDate) {
  const done = new Set(log.filter((e) => e.hid === habit.id).map((e) => e.date));
  const d = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  while (d < end) {
    const key = d.toISOString().slice(0, 10);
    if (isScheduledOn(habit, key) && !done.has(key)) return true;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return false;
}

/** "Every day", "Weekdays", "Mon, Wed, Fri" — for the habit list and the sheet. */
export function scheduleLabel(days) {
  if (!Array.isArray(days) || days.length === 0 || days.length === 7) return 'Every day';
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.join() === '0,6') return 'Weekends';
  return sorted.map((d) => DAY_NAMES[d]).join(', ');
}
