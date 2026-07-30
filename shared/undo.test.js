// Undo is the one place where getting the accounting wrong silently corrupts someone's progress.
// app.js owns the DOM wiring; this proves the arithmetic it performs — snapshot then restore —
// really is exact, including the fields no subtraction can recover.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpForCompletion, streakAfterDay, PERFECT_DAY_BONUS } from './game-math.js';

// Mirrors complete()/undoComplete() in app/www/app.js, minus rendering, sound and cloud.
function makeGame(state) {
  const snapshot = (h) => ({
    streak: h.streak, best: h.best, total: h.total,
    gStreak: state.gStreak, gBest: state.gBest, freezes: state.freezes,
    xp: state.creature.xp, dayXp: state.day.xpEarned,
    comeback: state.comeback, badges: [...state.badges],
  });

  function complete(id) {
    if (state.day.doneIds.includes(id)) return;
    const h = state.habits.find((x) => x.id === id);
    const before = snapshot(h);
    const firstToday = state.day.doneIds.length === 0;
    let xp = xpForCompletion({ streak: h.streak, auto: false });
    h.streak += 1; h.best = Math.max(h.best, h.streak); h.total += 1;
    state.day.doneIds.push(id);
    state.log.push({ date: state.day.date, hid: id, ts: Date.now() });
    if (firstToday) {
      const r = streakAfterDay({ streak: state.gStreak, freezes: state.freezes, completedToday: true });
      state.gStreak = r.streak; state.freezes = r.freezes;
      state.gBest = Math.max(state.gBest, state.gStreak);
    }
    if (state.day.doneIds.length === state.habits.length) xp += PERFECT_DAY_BONUS;
    if (state.comeback) {
      state.comeback = false;
      if (!state.badges.includes('rekindled')) state.badges.push('rekindled');
    }
    state.creature.xp += xp; state.day.xpEarned += xp;
    (state.day.undo ??= {})[id] = before;
  }

  function undo(id) {
    const b = state.day.undo?.[id];
    const h = state.habits.find((x) => x.id === id);
    if (!b || !h) return false;
    if (id !== state.day.doneIds[state.day.doneIds.length - 1]) return false;
    h.streak = b.streak; h.best = b.best; h.total = b.total;
    state.gStreak = b.gStreak; state.gBest = b.gBest; state.freezes = b.freezes;
    state.creature.xp = b.xp; state.day.xpEarned = b.dayXp;
    state.comeback = b.comeback; state.badges = b.badges;
    state.day.doneIds = state.day.doneIds.filter((x) => x !== id);
    for (let i = state.log.length - 1; i >= 0; i -= 1) {
      if (state.log[i].hid === id && state.log[i].date === state.day.date) { state.log.splice(i, 1); break; }
    }
    delete state.day.undo[id];
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
  gStreak: 6, gBest: 11, freezes: 1, comeback: false, badges: [],
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
  delete s.day.undo;
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

test('only the newest check-in can be undone', () => {
  const s = fresh();
  const g = makeGame(s);
  g.complete('a');
  g.complete('b');
  const xpAfterBoth = s.creature.xp;
  assert.equal(g.undo('a'), false, 'an older completion is refused');
  assert.equal(s.creature.xp, xpAfterBoth, 'and nothing was changed by the refusal');
  assert.ok(g.undo('b'));
});

test('completions unwind cleanly in reverse order', () => {
  const s = fresh();
  const snap = JSON.stringify(s);
  const g = makeGame(s);
  g.complete('a');
  g.complete('b');
  g.undo('b');
  g.undo('a');
  delete s.day.undo;
  assert.equal(JSON.stringify(s), snap, 'back to the start of the day');
});
