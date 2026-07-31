// Journey analytics (MASTER_PLAN §4.4). Pure functions over the local completion log so they run
// offline and are testable without a DOM. A log entry is { date:'YYYY-MM-DD', hid, ts, category }.
//
// These are honest counts, not projections — the "coach inside a game" tells the truth, including
// the reds. No ML: every insight here is a plain query over timestamps.

import { isScheduledOn } from './schedule.js';

const DAY_MS = 86400000;

function dayKey(ms) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Distinct days that had at least one completion, for the "don't break the chain" heatmap. */
export function heatmap(log = [], { days = 365, now = Date.now() } = {}) {
  const counts = new Map();
  for (const e of log) {
    counts.set(e.date, (counts.get(e.date) || 0) + 1);
  }
  const cells = [];
  const start = now - (days - 1) * DAY_MS;
  for (let t = start; t <= now; t += DAY_MS) {
    const key = dayKey(t);
    cells.push({ date: key, count: counts.get(key) || 0 });
  }
  return cells;
}

/**
 * Completion rate for one habit over a window. "Due" days are capped by how long the habit has
 * existed, so a 3-day-old habit is not punished against a 30-day window. Daily schedule assumed at
 * MVP (every habit is due every day); specific-weekday schedules refine this later.
 */
export function successRate(log = [], habit, { windowDays = 30, now = Date.now() } = {}) {
  const since = now - (windowDays - 1) * DAY_MS;
  const dueFrom = Math.max(since, habit.createdAt ?? since);

  // Count due days as whole calendar days (window start → today, inclusive), not a rounded ms delta,
  // so the result does not shift with the time of day a habit was created or a query is run.
  // Only days the habit is actually scheduled for count as due: dividing a Mon/Wed/Fri habit by
  // every calendar day caps a perfect record at 43% and tells a consistent user they are failing.
  const spanDays = Math.max(1, Math.round((startOfDay(now) - startOfDay(dueFrom)) / DAY_MS) + 1);
  let dueDays = 0;
  for (let i = 0; i < spanDays; i += 1) {
    if (isScheduledOn(habit, dayKey(startOfDay(dueFrom) + i * DAY_MS))) dueDays += 1;
  }
  dueDays = Math.max(1, dueDays);
  const fromDate = dayKey(dueFrom);
  const toDate = dayKey(now);   // upper bound matters: trend() queries past windows

  const doneDays = new Set(
    log
      .filter((e) => e.hid === habit.id && e.date >= fromDate && e.date <= toDate)
      .map((e) => e.date),
  );
  return { done: doneDays.size, due: dueDays, rate: Math.min(1, doneDays.size / dueDays) };
}

/**
 * Trend arrow: this window's rate against the window before it. A small dead-band avoids flapping
 * an arrow on noise.
 * @returns 'up' | 'down' | 'flat'
 */
export function trend(log = [], habit, { windowDays = 14, now = Date.now() } = {}) {
  const recent = successRate(log, habit, { windowDays, now }).rate;
  const prior = successRate(log, habit, { windowDays, now: now - windowDays * DAY_MS }).rate;
  if (recent - prior > 0.1) return 'up';
  if (prior - recent > 0.1) return 'down';
  return 'flat';
}

/** Completions bucketed by hour of day (0-23), for the time-of-day success curve. */
export function hourHistogram(log = []) {
  const hours = new Array(24).fill(0);
  for (const e of log) {
    if (typeof e.ts === 'number') hours[new Date(e.ts).getHours()] += 1;
  }
  return hours;
}

/**
 * The single most behaviour-changing insight: when the user actually gets things done. Returns the
 * peak hour and the morning share, or null when there is not enough data to claim anything.
 */
export function bestHourInsight(log = [], { minCompletions = 12, minDays = 5 } = {}) {
  const hours = hourHistogram(log);
  const total = hours.reduce((a, b) => a + b, 0);
  const days = new Set(log.map((e) => e.date)).size;
  // A "best hour" drawn from a handful of taps on one evening is a coincidence with a chart around
  // it. Needs both enough completions and enough separate days before it means anything.
  if (total < minCompletions || days < minDays) return null;

  let peak = 0;
  for (let h = 1; h < 24; h += 1) if (hours[h] > hours[peak]) peak = h;
  // Morning is 5am to 11am. "Before 9am" counted 1am as a morning win, which nobody believes.
  const morning = hours.slice(5, 11).reduce((a, b) => a + b, 0);
  const evening = hours.slice(17, 23).reduce((a, b) => a + b, 0);
  return { peakHour: peak, morningShare: morning / total, eveningShare: evening / total, total, days };
}

/** Weekday vs weekend completion split — the simplest "best conditions" insight (§4.4 item 4). */
export function weekdayWeekendSplit(log = []) {
  let weekday = 0;
  let weekend = 0;
  for (const e of log) {
    const day = new Date(e.ts ?? Date.parse(e.date)).getDay();
    if (day === 0 || day === 6) weekend += 1;
    else weekday += 1;
  }
  return { weekday, weekend };
}

/** Format an hour as a plain 12-hour label for copy: 0 → "12am", 9 → "9am", 14 → "2pm". */
export function hourLabel(h) {
  const period = h < 12 ? 'am' : 'pm';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${period}`;
}

/**
 * Per-habit, per-day completion grid — rows are habits, columns are days.
 * Answers the question the daily totals cannot: *which* habit is slipping.
 * `scheduled` marks days the habit was not due, so a rest day never reads as a miss.
 */
export function habitGrid(log = [], habits = [], { days = 14, now = Date.now() } = {}) {
  const dates = [];
  for (let i = days - 1; i >= 0; i -= 1) dates.push(dayKey(now - i * DAY_MS));
  const done = new Set(log.map((e) => `${e.hid}|${e.date}`));
  return habits.map((h) => ({
    habit: h,
    cells: dates.map((date) => ({
      date,
      done: done.has(`${h.id}|${date}`),
      scheduled: isScheduledOn(h, date),
    })),
  }));
}

/**
 * Completion rate over a trailing window, one point per day. A rate rather than a count, so
 * adding a habit does not read as a sudden improvement, and it stays readable when the raw
 * daily counts are too sparse to show a shape.
 */
export function rollingRate(log = [], habits = [], { days = 14, window = 7, now = Date.now() } = {}) {
  const done = new Set(log.map((e) => `${e.hid}|${e.date}`));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const end = now - i * DAY_MS;
    let hit = 0;
    let due = 0;
    for (let w = 0; w < window; w += 1) {
      const date = dayKey(end - w * DAY_MS);
      for (const h of habits) {
        if (!isScheduledOn(h, date)) continue;
        due += 1;
        if (done.has(`${h.id}|${date}`)) hit += 1;
      }
    }
    out.push({ date: dayKey(end), rate: due ? hit / due : 0, due });
  }
  return out;
}
