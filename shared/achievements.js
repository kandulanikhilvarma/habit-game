// Achievements (the Apple Fitness "awards" idea, adapted to a game that refuses to punish).
//
// Two rules shape all of it. Everything is **derived from state**, never toggled by a side effect,
// so an award can never disagree with the save that produced it — and undoing a completion takes
// its award back the same way it takes the XP. And every award is for something you *did*: there
// are no awards for streaks unbroken, because that is the same sentence as "punished for missing",
// and this product does not do that.
//
// What actually returns people is the *next* one being visible and close, so every award reports
// progress toward itself, not just a locked or unlocked state.

import { levelFromTotalXp, stageForLevel } from './game-math.js';
import { isScheduledOn } from './schedule.js';
import { DECOR } from './eggs.js';

/** How many separate days had every scheduled habit completed. */
export function perfectDayCount(log = [], habits = []) {
  if (!habits.length) return 0;
  const byDate = new Map();
  for (const e of log) {
    if (!byDate.has(e.date)) byDate.set(e.date, new Set());
    byDate.get(e.date).add(e.hid);
  }
  let n = 0;
  for (const [date, done] of byDate) {
    const due = habits.filter((h) => isScheduledOn(h, date));
    if (due.length && due.every((h) => done.has(h.id))) n += 1;
  }
  return n;
}

/**
 * `value` is what the player has; `target` is what the award needs. `tier` groups the ladders so
 * the UI can show only the rung being climbed rather than every rung at once.
 */
export function achievements(state = {}) {
  const habits = state.habits ?? [];
  const log = state.log ?? [];
  const totalDone = habits.reduce((n, h) => n + (h.total || 0), 0);
  const stage = stageForLevel(levelFromTotalXp(state.creature?.xp ?? 0).level);
  const perfect = perfectDayCount(log, habits);
  const decor = (state.decor ?? []).length;
  const best = state.gBest ?? 0;

  const list = [
    { id: 'first', tier: 'start', name: 'First step', note: 'Completed a habit', value: totalDone, target: 1 },
    { id: 'week', tier: 'streak', name: 'A week kept', note: 'Seven days in a row', value: best, target: 7 },
    { id: 'month', tier: 'streak', name: 'A month kept', note: 'Thirty days in a row', value: best, target: 30 },
    { id: 'hundred', tier: 'streak', name: 'A hundred days', note: 'One hundred days in a row', value: best, target: 100 },
    { id: 'fifty', tier: 'volume', name: 'Fifty done', note: 'Fifty completions', value: totalDone, target: 50 },
    { id: 'fivehundred', tier: 'volume', name: 'Five hundred done', note: 'Five hundred completions', value: totalDone, target: 500 },
    { id: 'hatched', tier: 'growth', name: 'Hatched', note: 'Your creature left the egg', value: stage, target: 2 },
    { id: 'branched', tier: 'growth', name: 'Branched', note: 'Your habits chose a lineage', value: stage, target: 3 },
    { id: 'guardian', tier: 'growth', name: 'Guardian', note: 'Grew into its Guardian form', value: stage, target: 4 },
    { id: 'radiant', tier: 'growth', name: 'Radiant', note: 'Reached the final form', value: stage, target: 5 },
    { id: 'perfect', tier: 'perfect', name: 'A whole day', note: 'Completed everything due', value: perfect, target: 1 },
    { id: 'perfect10', tier: 'perfect', name: 'Ten whole days', note: 'Ten days with nothing left', value: perfect, target: 10 },
    { id: 'glade', tier: 'glade', name: 'Glade keeper', note: 'Found every piece for the glade', value: decor, target: DECOR.length },
    // Earned by coming back, never by never leaving.
    { id: 'rekindled', tier: 'return', name: 'Rekindled', note: 'Came back after a break',
      value: (state.badges ?? []).includes('rekindled') ? 1 : 0, target: 1 },
  ];

  return list.map((a) => ({
    ...a,
    earned: a.value >= a.target,
    progress: Math.max(0, Math.min(1, a.value / a.target)),
  }));
}

export const earnedIds = (state) => achievements(state).filter((a) => a.earned).map((a) => a.id);

/** The awards that appeared between two states, so the moment can be celebrated once. */
export function newlyEarned(before, after) {
  const had = new Set(earnedIds(before));
  return achievements(after).filter((a) => a.earned && !had.has(a.id));
}

/**
 * What to show: everything earned, plus the single closest unearned rung of each ladder. Listing
 * every locked award turns the screen into a wall of things you have not done.
 */
export function awardBoard(state) {
  const all = achievements(state);
  const earned = all.filter((a) => a.earned);
  const nextPerTier = new Map();
  for (const a of all) {
    if (a.earned) continue;
    const held = nextPerTier.get(a.tier);
    if (!held || a.target < held.target) nextPerTier.set(a.tier, a);
  }
  return { earned, next: [...nextPerTier.values()].sort((x, y) => y.progress - x.progress) };
}
