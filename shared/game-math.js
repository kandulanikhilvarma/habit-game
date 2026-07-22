// Game math from HABITGAME_MVP_MASTER_PLAN §3.4. Pure functions, no DOM, no I/O.
// The app and the web viewer both run this file, so the numbers can never drift.

export const PERFECT_DAY_BONUS = 30;
export const STREAK_XP_CAP = 15;
export const AUTO_MULTIPLIER = 1.5;
export const MAX_FREEZES = 2;
export const FREEZE_EARNED_EVERY = 7;
export const EVOLUTION_LEVELS = [3, 7, 12, 20];
export const COMEBACK_AFTER_MISSED_DAYS = 3;

// The master plan calls for an affinity bonus but never fixes its size. 5 XP is a starting value
// picked here, not a spec number — tune it once real completion data exists.
export const AFFINITY_BONUS_XP = 5;

/**
 * XP for one completion. Streak makes consistency literally worth more, auto-verified pays 1.5x,
 * and a habit matching the creature's affinity category pays a small flat bonus.
 */
export function xpForCompletion({ streak = 0, auto = false, affinity = false } = {}) {
  const base = 10 + Math.min(streak, STREAK_XP_CAP) + (affinity ? AFFINITY_BONUS_XP : 0);
  return Math.round(base * (auto ? AUTO_MULTIPLIER : 1));
}

/** XP required to clear level n on its own (not cumulative). */
export function xpNeededForLevel(n) {
  return 50 + 35 * (n - 1);
}

/** Walk the curve from level 1. Returns the level plus progress inside it, for the XP bar. */
export function levelFromTotalXp(totalXp) {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  let need = xpNeededForLevel(level);
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = xpNeededForLevel(level);
  }
  return { level, into: remaining, need };
}

/** Evolution stage 1-5. Stages 3+ pick a *branch* from attunement; the number is the rail. */
export function stageForLevel(level) {
  let stage = 1;
  for (const threshold of EVOLUTION_LEVELS) {
    if (level >= threshold) stage += 1;
  }
  return stage;
}

// Branching evolution (VALIDATION_REPORT §6/§7): the creature's later form is chosen by which
// habits the user actually lives, not a fixed rail. Each category feeds a hidden attunement; the
// dominant blend at stage 3+ picks a lineage. A clear leader wins; a balanced life gets the rare
// prismatic branch. This is what makes "what did YOUR creature become?" a real question.
export const LINEAGES = {
  body: 'ember',       // powerful ember-beast
  mind: 'moth',        // mystic moth-sage
  order: 'sentinel',   // crystalline sentinel
  balanced: 'prismatic',
};
export const LINEAGE_DOMINANCE = 0.45;   // a leader needs >45% of completions to pull the branch

/** Lifetime attunement from per-habit totals. Completions, not habit count — living it is what counts. */
export function attunementFrom(habits = []) {
  const att = { mind: 0, body: 0, order: 0 };
  for (const h of habits) {
    if (h.category in att) att[h.category] += h.total || 0;
  }
  return att;
}

/**
 * Which lineage a blend resolves to. No dominant category (or no data yet) → balanced/prismatic.
 * @returns 'ember' | 'moth' | 'sentinel' | 'prismatic'
 */
export function lineageFor(attunement = {}) {
  const mind = attunement.mind || 0;
  const body = attunement.body || 0;
  const order = attunement.order || 0;
  const total = mind + body + order;
  if (total === 0) return LINEAGES.balanced;

  const ranked = [['body', body], ['mind', mind], ['order', order]].sort((a, b) => b[1] - a[1]);
  const [leadCat, leadVal] = ranked[0];
  const secondVal = ranked[1][1];
  // A co-leader (tie for the top) is no identity at all → prismatic, not an arbitrary winner.
  if (leadVal === secondVal) return LINEAGES.balanced;
  return leadVal / total >= LINEAGE_DOMINANCE ? LINEAGES[leadCat] : LINEAGES.balanced;
}

/** Mood from today's completion ratio. Drives creature animation, world light, widget image, copy. */
export function moodFor(done, total) {
  if (total <= 0 || done <= 0) return 'sleeping';
  if (done >= total) return 'radiant';
  // Thirds compared as integers: with the 3-habit onboarding cap, 1/3 and 2/3 must land exactly.
  if (done * 3 >= total * 2) return 'happy';
  if (done * 3 >= total) return 'content';
  return 'waking';
}

/**
 * Roll one day forward for the global streak.
 * A completed day extends the streak and banks a freeze every 7-day run (max 2 held).
 * A missed day spends a freeze if one is held (streak survives), otherwise the streak resets.
 */
export function streakAfterDay({ streak = 0, freezes = 0, completedToday = false } = {}) {
  if (completedToday) {
    const next = streak + 1;
    const earned = next % FREEZE_EARNED_EVERY === 0 ? 1 : 0;
    return {
      streak: next,
      freezes: Math.min(freezes + earned, MAX_FREEZES),
      freezeUsed: false,
    };
  }
  if (freezes > 0) {
    return { streak, freezes: freezes - 1, freezeUsed: true };
  }
  return { streak: 0, freezes, freezeUsed: false };
}

/**
 * Catch up after the app was closed for a while: the day that just ended, then each fully missed day.
 * Stops early once there is nothing left to lose — a month away costs the same as three days.
 */
export function applyMissedDays({ streak = 0, freezes = 0 } = {}, missedDays = 0) {
  let state = { streak, freezes, freezeUsed: false };
  let freezeUsed = false;
  for (let i = 0; i < missedDays; i += 1) {
    if (state.streak === 0 && state.freezes === 0) break;
    state = streakAfterDay({ streak: state.streak, freezes: state.freezes, completedToday: false });
    freezeUsed = freezeUsed || state.freezeUsed;
  }
  return { streak: state.streak, freezes: state.freezes, freezeUsed };
}

/** After this many missed days the creature is asleep under a blanket and the next win is a ceremony. */
export function isComeback(daysMissed) {
  return daysMissed >= COMEBACK_AFTER_MISSED_DAYS;
}
