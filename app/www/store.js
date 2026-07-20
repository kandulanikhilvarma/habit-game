// Local persistence for Gate 0. Shape mirrors the Firestore model (MASTER_PLAN §6.3) so the
// Gate 1 sync is a transport change, not a reshape.
// ponytail: localStorage, not a hand-written IndexedDB layer — Firestore's own offline cache
// replaces this wholesale in Gate 1, so anything cleverer here would be written twice.

import { applyMissedDays } from './game-math.js';

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
    creature: { species: 'kumo', name: 'Kumo', xp: 0 },
    gStreak: 0,
    gBest: 0,
    freezes: 0,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    habits: [
      { id: 'read', name: 'Read 20 minutes', glyph: '📖', category: 'mind', streak: 0, best: 0, total: 0 },
      { id: 'workout', name: 'Morning workout', glyph: '🏃', category: 'body', streak: 0, best: 0, total: 0 },
      { id: 'phone', name: 'No phone after 11pm', glyph: '🌙', category: 'order', streak: 0, best: 0, total: 0 },
    ],
    day: { date: todayKey(), doneIds: [], xpEarned: 0 },
    createdAt: Date.now(),
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : seed();
  } catch {
    return seed();
  }
}

export function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
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
  state.habits.forEach((h) => {
    if (missed > 0) h.streak = 0;
  });
  state.day = { date: today, doneIds: [], xpEarned: 0 };
  save(state);
  return { state, rolled: true, freezeUsed: next.freezeUsed, missed: Math.max(0, missed) };
}
