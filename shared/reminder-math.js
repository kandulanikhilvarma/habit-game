// When a reminder should next fire. Pure so the timezone and midnight edges can be tested without
// a device — this is the part that silently breaks at 23:59 and nobody notices for a week.

/** @returns {{hours:number, minutes:number}|null} — null for anything that is not a real HH:MM. */
export function parseTime(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Next occurrence of a local wall-clock time. Today if it is still ahead, otherwise tomorrow.
 * A reminder set for the exact current minute counts as passed — firing instantly on save reads
 * as a bug, not a feature.
 */
export function nextTriggerAt(hhmm, now = new Date()) {
  const time = parseTime(hhmm);
  if (!time) return null;

  const at = new Date(now);
  at.setHours(time.hours, time.minutes, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  return at;
}

/** Stable per-habit notification id: rescheduling must replace a habit's reminder, never stack up. */
export function notificationId(habitId) {
  let hash = 0;
  for (let i = 0; i < habitId.length; i += 1) {
    hash = (hash * 31 + habitId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100000;
}
