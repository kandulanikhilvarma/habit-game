// Undo is the one place where getting the accounting wrong silently corrupts someone's progress.
// app.js owns the DOM wiring; this proves the arithmetic it performs — snapshot then restore —
// really is exact, including the fields no subtraction can recover.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpForCompletion, streakAfterDay, PERFECT_DAY_BONUS } from './game-math.js';

// Mirrors complete()/undoComplete() in app/www/app.js, minus rendering, sound and cloud.
function makeGame(state) {
  const scheduled = () => state.habits.length;
  const isPerfect = () => scheduled() > 0 && state.day.doneIds.length === scheduled();

  function complete(id) {
    if (state.day.doneIds.includes(id)) return;
    const h = state.habits.find((x) => x.id === id);
    const firstToday = state.day.doneIds.length === 0;
    if (firstToday) {
      state.day.dayStart = {
        gStreak: state.gStreak, gBest: state.gBest, freezes: state.freezes,
        comeback: state.comeback, badges: [...state.badges],
      };
    }
    const base = xpForCompletion({ streak: h.streak, auto: false });
    (state.day.undo ??= {})[id] = { xp: base, habit: { streak: h.streak, best: h.best, total: h.total } };

    h.streak += 1; h.best = Math.max(h.best, h.streak); h.total += 1;
    state.day.doneIds.push(id);
    state.log.push({ date: state.day.date, hid: id, ts: Date.now() });
    if (firstToday) {
      const r = streakAfterDay({ streak: state.gStreak, freezes: state.freezes, completedToday: true });
      state.gStreak = r.streak; state.freezes = r.freezes;
      state.gBest = Math.max(state.gBest, state.gStreak);
    }
    state.creature.xp += base; state.day.xpEarned += base;
    if (state.comeback) {
      state.comeback = false;
      if (!state.badges.includes('rekindled')) state.badges.push('rekindled');
    }
    if (isPerfect() && !state.day.perfectBonus) {
      state.creature.xp += PERFECT_DAY_BONUS;
      state.day.xpEarned += PERFECT_DAY_BONUS;
      state.day.perfectBonus = true;
      (state.decor ??= []).push('crystal');
      state.day.eggWon = 'crystal';
    }
  }

  function undo(id) {
    const rec = state.day.undo?.[id];
    const h = state.habits.find((x) => x.id === id);
    if (!rec || !h) return false;
    h.streak = rec.habit.streak; h.best = rec.habit.best; h.total = rec.habit.total;
    state.creature.xp -= rec.xp; state.day.xpEarned -= rec.xp;
    state.day.doneIds = state.day.doneIds.filter((x) => x !== id);
    for (let i = state.log.length - 1; i >= 0; i -= 1) {
      if (state.log[i].hid === id && state.log[i].date === state.day.date) { state.log.splice(i, 1); break; }
    }
    delete state.day.undo[id];
    if (state.day.perfectBonus && !isPerfect()) {
      state.creature.xp -= PERFECT_DAY_BONUS;
      state.day.xpEarned -= PERFECT_DAY_BONUS;
      state.day.perfectBonus = false;
      if (state.day.eggWon) {
        state.decor = (state.decor ?? []).filter((d) => d !== state.day.eggWon);
        state.day.eggWon = null;
      }
    }
    if (state.day.doneIds.length === 0 && state.day.dayStart) {
      const d = state.day.dayStart;
      state.gStreak = d.gStreak; state.gBest = d.gBest; state.freezes = d.freezes;
      state.comeback = d.comeback; state.badges = d.badges;
      state.day.dayStart = null;
    }
    return true;
  }
  return { complete, undo };
}

const fresh = (over = {}) => ({
  creature: { species: 'kumo', xp: 100 },
  habits: [
    { id: 'a', category: 'mind', streak: 3, best: 9, total: 20 },
    { id: 'b', category: 'body', streak: 0, best: 0, total: 0 },
  ],
  gStreak: 6, gBest: 11, freezes: 1, comeback: false, badges: [], decor: [],
  day: { date: '2026-07-30', doneIds: [], xpEarned: 0 },
  log: [],
  ...over,
});

test('undo returns every field to exactly where it was', () => {
  const s = fresh();
  const snap = JSON.stringify(s);
  const g = makeGame(s);
  g.complete('a');
  assert.notEqual(JSON.stringify(s), snap, 'completing changed something');
  assert.ok(g.undo('a'));
  delete s.day.undo; delete s.day.dayStart; delete s.day.perfectBonus; delete s.day.eggWon;
  assert.equal(JSON.stringify(s), snap, 'undo restored the exact prior state');
});

test('a personal best raised by the completion comes back down', () => {
  const s = fresh({ habits: [{ id: 'a', category: 'mind', streak: 9, best: 9, total: 20 }] });
  const g = makeGame(s);
  g.complete('a');
  assert.equal(s.habits[0].best, 10, 'the completion set a new best');
  g.undo('a');
  assert.equal(s.habits[0].best, 9, 'undo puts the old best back — no subtraction could');
});

test('the perfect-day bonus is not left behind', () => {
  const s = fresh();
  const g = makeGame(s);
  g.complete('a');
  const afterOne = s.creature.xp;
  g.complete('b');                       // completes the set, so this one carries the bonus
  assert.ok(s.creature.xp - afterOne > PERFECT_DAY_BONUS, 'bonus was awarded');
  g.undo('b');
  assert.equal(s.creature.xp, afterOne, 'undo removed the bonus with it');
});

test('a banked streak freeze is not kept for free', () => {
  const s = fresh({ gStreak: 6, freezes: 0 });   // 7th day banks a freeze
  const g = makeGame(s);
  g.complete('a');
  assert.equal(s.freezes, 1, 'completing the 7th day banked one');
  g.undo('a');
  assert.equal(s.freezes, 0, 'undo un-banks it');
  assert.equal(s.gStreak, 6);
});

test('undo removes the completion from the log Journey reads', () => {
  const s = fresh();
  const g = makeGame(s);
  g.complete('a');
  assert.equal(s.log.length, 1);
  g.undo('a');
  assert.equal(s.log.length, 0, 'analytics must not count an undone day');
});

test('waking from a comeback re-sleeps if that completion is undone', () => {
  const s = fresh({ comeback: true });
  const g = makeGame(s);
  g.complete('a');
  assert.equal(s.comeback, false);
  assert.deepEqual(s.badges, ['rekindled']);
  g.undo('a');
  assert.equal(s.comeback, true, 'the creature goes back to sleep');
  assert.deepEqual(s.badges, [], 'the badge was not really earned yet');
});

test('any of the day’s check-ins can be undone, not only the newest', () => {
  const s = fresh();
  const g = makeGame(s);
  g.complete('a');
  const xpAfterA = s.creature.xp;
  g.complete('b');
  assert.ok(g.undo('a'), 'an older completion is accepted now');
  assert.equal(s.day.doneIds.join(), 'b', 'the newer one is untouched');
  assert.equal(s.habits[0].streak, 3, "the undone habit's streak is back");
  assert.equal(s.habits[1].streak, 1, "the other habit's streak is not");
  g.complete('a');
  assert.equal(s.creature.xp > xpAfterA, true, 're-completing works');
});

test('undoing any habit ends the perfect day and takes its bonus and egg', () => {
  const s = fresh();
  const xpStart = s.creature.xp;
  const g = makeGame(s);
  g.complete('a');
  g.complete('b');                                   // completes the set
  assert.equal(s.day.perfectBonus, true);
  assert.deepEqual(s.decor, ['crystal']);
  g.undo('a');                                       // the one that did NOT carry the bonus
  assert.equal(s.day.perfectBonus, false, 'the day is no longer perfect');
  assert.deepEqual(s.decor, [], 'the egg goes with it');
  // Only b's own XP should be left standing on the starting total: a's is gone with a, and the
  // day bonus is gone with the perfect day.
  assert.equal(s.creature.xp, xpStart + s.day.undo.b.xp, 'no bonus left behind');
});

test('undoing out of order still lands on the exact starting state', () => {
  const s = fresh();
  const snap = JSON.stringify(s);
  const g = makeGame(s);
  g.complete('a');
  g.complete('b');
  g.undo('a');
  g.undo('b');
  delete s.day.undo; delete s.day.dayStart; delete s.day.perfectBonus; delete s.day.eggWon;
  assert.equal(JSON.stringify(s), snap, 'reverse order and forward order agree');
});

test('completions unwind cleanly in reverse order', () => {
  const s = fresh();
  const snap = JSON.stringify(s);
  const g = makeGame(s);
  g.complete('a');
  g.complete('b');
  g.undo('b');
  g.undo('a');
  delete s.day.undo; delete s.day.dayStart; delete s.day.perfectBonus; delete s.day.eggWon;
  assert.equal(JSON.stringify(s), snap, 'back to the start of the day');
});

test('an egg won by a completion is given back when it is undone', () => {
  const s = fresh();
  const g = makeGame(s);
  g.complete('a');
  g.complete('b');                                  // perfect day -> egg
  assert.deepEqual(s.decor, ['crystal']);
  g.undo('b');
  assert.deepEqual(s.decor, [], 'undoing the perfect day takes the reward with it');
});
