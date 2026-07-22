import test from 'node:test';
import assert from 'node:assert/strict';
import {
  xpForCompletion,
  xpNeededForLevel,
  levelFromTotalXp,
  stageForLevel,
  moodFor,
  streakAfterDay,
  applyMissedDays,
  isComeback,
  attunementFrom,
  lineageFor,
  PERFECT_DAY_BONUS,
} from './game-math.js';

test('xp: base completion is 10', () => {
  assert.equal(xpForCompletion({ streak: 0 }), 10);
});

test('xp: streak adds 1 per day and caps at 15', () => {
  assert.equal(xpForCompletion({ streak: 5 }), 15);
  assert.equal(xpForCompletion({ streak: 15 }), 25);
  assert.equal(xpForCompletion({ streak: 400 }), 25);
});

test('xp: auto-verified pays 1.5x', () => {
  assert.equal(xpForCompletion({ streak: 0, auto: true }), 15);
  assert.equal(xpForCompletion({ streak: 15, auto: true }), 38); // 25 * 1.5 = 37.5
});

test('xp: affinity adds a flat bonus and auto multiplies the total', () => {
  assert.equal(xpForCompletion({ streak: 0, affinity: true }), 15);
  assert.equal(xpForCompletion({ streak: 5, affinity: true }), 20);
  assert.equal(xpForCompletion({ streak: 0, affinity: true, auto: true }), 23); // 15 * 1.5 = 22.5
});

test('xp: perfect day bonus is 30', () => {
  assert.equal(PERFECT_DAY_BONUS, 30);
});

test('levels: need(n) = 50 + 35(n-1)', () => {
  assert.equal(xpNeededForLevel(1), 50);
  assert.equal(xpNeededForLevel(2), 85);
  assert.equal(xpNeededForLevel(20), 715);
});

test('levels: total xp maps to level and progress inside it', () => {
  assert.deepEqual(levelFromTotalXp(0), { level: 1, into: 0, need: 50 });
  assert.deepEqual(levelFromTotalXp(49), { level: 1, into: 49, need: 50 });
  assert.deepEqual(levelFromTotalXp(50), { level: 2, into: 0, need: 85 });
  assert.deepEqual(levelFromTotalXp(60), { level: 2, into: 10, need: 85 });
  assert.deepEqual(levelFromTotalXp(135), { level: 3, into: 0, need: 120 });
});

test('levels: negative xp is floored at level 1', () => {
  assert.deepEqual(levelFromTotalXp(-10), { level: 1, into: 0, need: 50 });
});

test('stage: evolves at levels 3, 7, 12, 20', () => {
  assert.equal(stageForLevel(1), 1);
  assert.equal(stageForLevel(2), 1);
  assert.equal(stageForLevel(3), 2);
  assert.equal(stageForLevel(6), 2);
  assert.equal(stageForLevel(7), 3);
  assert.equal(stageForLevel(12), 4);
  assert.equal(stageForLevel(19), 4);
  assert.equal(stageForLevel(20), 5);
  assert.equal(stageForLevel(99), 5);
});

test('mood: every threshold', () => {
  assert.equal(moodFor(0, 3), 'sleeping');
  assert.equal(moodFor(0, 0), 'sleeping');
  assert.equal(moodFor(1, 4), 'waking');
  assert.equal(moodFor(1, 3), 'content');  // exactly one third
  assert.equal(moodFor(2, 3), 'happy');    // exactly two thirds
  assert.equal(moodFor(3, 3), 'radiant');
  assert.equal(moodFor(4, 7), 'content');
  assert.equal(moodFor(5, 7), 'happy');
  assert.equal(moodFor(4, 3), 'radiant');  // over-complete cannot exceed radiant
});

test('streak: completing extends and banks a freeze every 7 days', () => {
  assert.deepEqual(streakAfterDay({ streak: 0, freezes: 0, completedToday: true }), {
    streak: 1, freezes: 0, freezeUsed: false,
  });
  assert.deepEqual(streakAfterDay({ streak: 6, freezes: 0, completedToday: true }), {
    streak: 7, freezes: 1, freezeUsed: false,
  });
  assert.deepEqual(streakAfterDay({ streak: 13, freezes: 1, completedToday: true }), {
    streak: 14, freezes: 2, freezeUsed: false,
  });
});

test('streak: freezes cap at 2', () => {
  assert.deepEqual(streakAfterDay({ streak: 20, freezes: 2, completedToday: true }), {
    streak: 21, freezes: 2, freezeUsed: false,
  });
});

test('streak: a miss spends a freeze and survives', () => {
  assert.deepEqual(streakAfterDay({ streak: 9, freezes: 1, completedToday: false }), {
    streak: 9, freezes: 0, freezeUsed: true,
  });
});

test('streak: a miss with no freeze resets to 0', () => {
  assert.deepEqual(streakAfterDay({ streak: 9, freezes: 0, completedToday: false }), {
    streak: 0, freezes: 0, freezeUsed: false,
  });
});

test('missed days: freezes absorb misses one at a time, then the streak drops', () => {
  assert.deepEqual(applyMissedDays({ streak: 10, freezes: 2 }, 1), {
    streak: 10, freezes: 1, freezeUsed: true,
  });
  assert.deepEqual(applyMissedDays({ streak: 10, freezes: 2 }, 2), {
    streak: 10, freezes: 0, freezeUsed: true,
  });
  assert.deepEqual(applyMissedDays({ streak: 10, freezes: 2 }, 3), {
    streak: 0, freezes: 0, freezeUsed: true,
  });
});

test('missed days: a long absence costs no more than a short one, and terminates', () => {
  assert.deepEqual(applyMissedDays({ streak: 40, freezes: 2 }, 100000), {
    streak: 0, freezes: 0, freezeUsed: true,
  });
});

test('missed days: zero missed days changes nothing', () => {
  assert.deepEqual(applyMissedDays({ streak: 5, freezes: 1 }, 0), {
    streak: 5, freezes: 1, freezeUsed: false,
  });
});

test('comeback: fires at 3 missed days, not 2', () => {
  assert.equal(isComeback(0), false);
  assert.equal(isComeback(2), false);
  assert.equal(isComeback(3), true);
});

test('attunement: sums completions by category, ignores unknown categories', () => {
  const habits = [
    { category: 'mind', total: 5 },
    { category: 'body', total: 3 },
    { category: 'mind', total: 2 },
    { category: 'custom', total: 9 },
  ];
  assert.deepEqual(attunementFrom(habits), { mind: 7, body: 3, order: 0 });
});

test('lineage: a clear leader pulls its branch', () => {
  assert.equal(lineageFor({ body: 50, mind: 30, order: 20 }), 'ember');
  assert.equal(lineageFor({ mind: 60, body: 20, order: 20 }), 'moth');
  assert.equal(lineageFor({ order: 46, mind: 27, body: 27 }), 'sentinel');
});

test('lineage: a spread-out life gets the prismatic branch', () => {
  assert.equal(lineageFor({ mind: 40, body: 35, order: 25 }), 'prismatic'); // leader < 45%
  assert.equal(lineageFor({ mind: 10, body: 10, order: 10 }), 'prismatic'); // dead even
});

test('lineage: a co-leader tie is prismatic, never an arbitrary winner', () => {
  assert.equal(lineageFor({ mind: 50, body: 50, order: 0 }), 'prismatic');
  assert.equal(lineageFor({ mind: 5, body: 5, order: 2 }), 'prismatic');
});

test('lineage: no completions yet is prismatic, not a crash', () => {
  assert.equal(lineageFor({ mind: 0, body: 0, order: 0 }), 'prismatic');
  assert.equal(lineageFor({}), 'prismatic');
});
