// Local persistence for Gate 0. Shape mirrors the Firestore model (MASTER_PLAN §6.3) so the
// Gate 1 sync is a transport change, not a reshape.
// ponytail: localStorage, not a hand-written IndexedDB layer — Firestore's own offline cache
// replaces this wholesale in Gate 1, so anything cleverer here would be written twice.

import { applyMissedDays, isComeback } from './game-math.js';
import { missedScheduledDay } from './schedule.js';

const KEY = 'habitgame.state.v1';
const DAY_MS = 86400000;

/** Local calendar date, not UTC — a habit day ends at the user's midnight. */
export function todayKey(d = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function daysBetween(fromKey, toKey) {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / DAY_MS);
}

function seed() {
  return {
    // species and name are replaced by the starter pick; cracks:1 is endowed progress
    // (VALIDATION_REPORT §4) — the egg is already cracking before the first completion.
    creature: { species: null, name: null, xp: 0, cracks: 1 },
    gStreak: 0,
    gBest: 0,
    freezes: 0,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    habits: [
      { id: 'read', name: 'Read 20 minutes', glyph: '📖', category: 'mind', streak: 0, best: 0, total: 0 },
      { id: 'workout', name: 'Morning workout', glyph: '🏃', category: 'body', streak: 0, best: 0, total: 0 },
      { id: 'phone', name: 'No phone after 11pm', glyph: '🌙', category: 'order', streak: 0, best: 0, total: 0 },
    ],
    comeback: false,
    badges: [],
    decor: [],        // cosmetic glade pieces won from perfect days (§3.4)
    notes: [],        // private per-day journal (§3.5); the weekly letter reads it back
    account: null,       // { email, name, uid } once signed in; null while a guest
    webhookToken: null,  // per-account token for POST /api/v1/complete; generated on demand
    settings: { sound: null, theme: 'dark' },
    day: { date: todayKey(), doneIds: [], xpEarned: 0 },
    // Local completion log — the Journey screen reads this. The cloud has the same rows, but the
    // app is offline-first, so analytics must work with no network and no Firebase project.
    // ponytail: unbounded for now. A year of 7 daily habits is ~2,500 rows; prune when it matters.
    log: [],
    createdAt: Date.now(),
  };
}

/**
 * State saved by an older build is missing whatever keys that build did not have. Fill them from
 * the seed rather than reaching into `state.settings.sound` and throwing on somebody's real data.
 * Cheap forward-compatibility: every new top-level key gets a default here for free.
 */
function withDefaults(stored) {
  const base = seed();
  const merged = {
    ...base,
    ...stored,
    creature: { ...base.creature, ...stored.creature },
    settings: { ...base.settings, ...stored.settings },
    day: { ...base.day, ...stored.day },
  };
  merged.habits = dedupeHabits(merged.habits || []);
  return merged;
}

/** Drop habits that repeat a name (keep the first) and enforce the 7-habit cap — cleans up data
 *  created before the duplicate/cap rules existed, which is why some accounts show "Workout" twice. */
export function dedupeHabits(habits) {
  const seen = new Set();
  const kept = [];
  for (const h of habits) {
    const key = (h.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(h);
    if (kept.length >= 7) break;
  }
  return kept;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? withDefaults(JSON.parse(raw)) : seed();
  } catch {
    return seed();
  }
}

export function save(state) {
  state.updatedAt = Date.now();   // the tiebreaker when local and cloud disagree at boot
  localStorage.setItem(KEY, JSON.stringify(state));
}

// `pushWholeState` writes the log inside one Firestore document, and a document hard-fails at
// 1 MiB — an unbounded log eventually breaks sync outright rather than degrading. Journey never
// reads past 150 days, so keeping ~2 years is generous and puts a ceiling on the document.
export const LOG_KEEP_DAYS = 730;

export function pruneLog(log = [], today = todayKey()) {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - LOG_KEEP_DAYS);
  const oldest = cutoff.toISOString().slice(0, 10);
  return log.filter((e) => e.date >= oldest);
}

/**
 * Move the state to today if the calendar moved. Returns {state, rolled, freezeUsed, missed}
 * so the UI can decide whether to play a comeback beat.
 */
export function rollover(state, today = todayKey()) {
  const last = state.day.date;
  if (last === today) return { state, rolled: false, freezeUsed: false, missed: 0 };

  const gap = daysBetween(last, today);
  const lastDayCompleted = state.day.doneIds.length > 0;
  const missed = lastDayCompleted ? gap - 1 : gap;

  const next = applyMissedDays({ streak: state.gStreak, freezes: state.freezes }, Math.max(0, missed));

  state.gStreak = next.streak;
  state.freezes = next.freezes;
  // A per-habit streak breaks only on a day that habit was actually scheduled for. Resetting a
  // Mon/Wed/Fri habit because the user rested on Sunday punishes them for following their own plan.
  state.habits.forEach((h) => {
    if (missedScheduledDay(h, state.log, last, today)) h.streak = 0;
  });
  // The creature sleeps through a long absence and wakes on the next completion — a paused world
  // reads as "waiting for you", where a punished one reads as "delete the app" (MASTER_PLAN §3.3).
  if (isComeback(Math.max(0, missed))) state.comeback = true;
  state.day = { date: today, doneIds: [], xpEarned: 0 };
  state.log = pruneLog(state.log, today);
  save(state);
  return { state, rolled: true, freezeUsed: next.freezeUsed, missed: Math.max(0, missed) };
}
