import { test } from 'node:test';
import assert from 'node:assert/strict';
import { achievements, newlyEarned, awardBoard, perfectDayCount } from './achievements.js';
import { DECOR } from './eggs.js';

const fresh = (over = {}) => ({
  creature: { species: 'kumo', xp: 0 },
  habits: [{ id: 'a', category: 'mind', total: 0 }, { id: 'b', category: 'body', total: 0 }],
  gBest: 0, badges: [], decor: [], log: [],
  ...over,
});

const byId = (state, id) => achievements(state).find((a) => a.id === id);

test('a new save has earned nothing and claims nothing', () => {
  assert.equal(achievements(fresh()).some((a) => a.earned), false);
});

test('the first completion earns the first award', () => {
  const s = fresh({ habits: [{ id: 'a', total: 1 }] });
  assert.equal(byId(s, 'first').earned, true);
});

test('streak awards read the best streak, so they survive a bad week', () => {
  const s = fresh({ gBest: 30 });
  assert.equal(byId(s, 'week').earned, true);
  assert.equal(byId(s, 'month').earned, true);
  assert.equal(byId(s, 'hundred').earned, false);
  assert.ok(byId(s, 'hundred').progress > 0.29, 'and the next rung shows how close it is');
});

test('growth awards follow the creature, not the calendar', () => {
  const egg = fresh();
  assert.equal(byId(egg, 'hatched').earned, false);
  const grown = fresh({ creature: { species: 'kumo', xp: 8000 } });
  assert.equal(byId(grown, 'radiant').earned, true);
});

test('perfect days count only days where everything due was done', () => {
  const habits = [{ id: 'a' }, { id: 'b' }];
  const log = [
    { hid: 'a', date: '2026-07-27' }, { hid: 'b', date: '2026-07-27' },   // whole day
    { hid: 'a', date: '2026-07-28' },                                      // half a day
  ];
  assert.equal(perfectDayCount(log, habits), 1);
});

test('a rest day does not stop a day being whole', () => {
  // 2026-07-28 is a Tuesday; the gym habit is Mon/Wed/Fri, so it is not due.
  const habits = [{ id: 'a' }, { id: 'gym', days: [1, 3, 5] }];
  const log = [{ hid: 'a', date: '2026-07-28' }];
  assert.equal(perfectDayCount(log, habits), 1);
});

test('there is no award for never missing a day', () => {
  // Every award has to be earnable by doing something. "Unbroken" awards are the punishment
  // mechanic wearing a medal, and this product does not ship one.
  const names = achievements(fresh()).map((a) => `${a.name} ${a.note}`.toLowerCase());
  assert.ok(!names.some((n) => n.includes('never') || n.includes('without missing')));
});

test('rekindled is earned by returning, and cannot be earned by staying', () => {
  assert.equal(byId(fresh(), 'rekindled').earned, false);
  assert.equal(byId(fresh({ badges: ['rekindled'] }), 'rekindled').earned, true);
});

test('the glade award needs every piece', () => {
  assert.equal(byId(fresh({ decor: DECOR.slice(0, 2) }), 'glade').earned, false);
  assert.equal(byId(fresh({ decor: [...DECOR] }), 'glade').earned, true);
});

test('newlyEarned reports the moment once, and only the new ones', () => {
  const before = fresh({ gBest: 6 });
  const after = fresh({ gBest: 7 });
  const got = newlyEarned(before, after).map((a) => a.id);
  assert.deepEqual(got, ['week']);
  assert.deepEqual(newlyEarned(after, after), [], 'nothing fires twice');
});

test('undoing progress takes the award back with it', () => {
  // Derived, never toggled: the award cannot outlive the state that earned it.
  const after = fresh({ habits: [{ id: 'a', total: 1 }] });
  const undone = fresh({ habits: [{ id: 'a', total: 0 }] });
  assert.equal(byId(after, 'first').earned, true);
  assert.equal(byId(undone, 'first').earned, false);
});

test('the board shows what was earned plus one next rung per ladder, not every locked award', () => {
  const s = fresh({ gBest: 7, habits: [{ id: 'a', total: 60 }] });
  const { earned, next } = awardBoard(s);
  assert.ok(earned.some((a) => a.id === 'week'));
  const streakNext = next.filter((a) => a.tier === 'streak');
  assert.equal(streakNext.length, 1, 'one rung of the streak ladder, not all of them');
  assert.equal(streakNext[0].id, 'month', 'and it is the closest one');
  assert.ok(next.every((a) => !a.earned));
});
