import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  weekdayOf, isScheduledOn, scheduledOn, missedScheduledDay, scheduleLabel,
} from './schedule.js';

// 2026-07-27 is a Monday.
const MON = '2026-07-27';
const TUE = '2026-07-28';
const WED = '2026-07-29';
const SAT = '2026-08-01';
const SUN = '2026-08-02';

test('weekday indices line up with the calendar', () => {
  assert.equal(weekdayOf(MON), 1);
  assert.equal(weekdayOf(SAT), 6);
  assert.equal(weekdayOf(SUN), 0);
});

test('a habit with no schedule runs every day', () => {
  for (const d of [MON, TUE, SAT, SUN]) {
    assert.ok(isScheduledOn({ id: 'a' }, d));
    assert.ok(isScheduledOn({ id: 'a', days: [] }, d), 'an empty list is not a habit you never do');
  }
});

test('a weekday habit is on Monday and off Sunday', () => {
  const gym = { id: 'gym', days: [1, 3, 5] };
  assert.ok(isScheduledOn(gym, MON));
  assert.ok(!isScheduledOn(gym, TUE));
  assert.ok(isScheduledOn(gym, WED));
  assert.ok(!isScheduledOn(gym, SUN));
});

test('only today\'s habits are counted', () => {
  const habits = [{ id: 'a' }, { id: 'gym', days: [1, 3, 5] }, { id: 'rest', days: [0] }];
  assert.deepEqual(scheduledOn(habits, MON).map((h) => h.id), ['a', 'gym']);
  assert.deepEqual(scheduledOn(habits, SUN).map((h) => h.id), ['a', 'rest']);
});

test('a rest day is not a miss', () => {
  const gym = { id: 'gym', days: [1, 3, 5] };
  const log = [{ hid: 'gym', date: MON }];
  // Mon done, Tue is a rest day -> nothing missed by Wednesday morning.
  assert.equal(missedScheduledDay(gym, log, MON, WED), false);
});

test('a skipped training day is a miss', () => {
  const gym = { id: 'gym', days: [1, 3, 5] };
  const log = [];                                  // Monday never completed
  assert.equal(missedScheduledDay(gym, log, MON, WED), true);
});

test('a daily habit misses any uncompleted day', () => {
  const daily = { id: 'a' };
  assert.equal(missedScheduledDay(daily, [{ hid: 'a', date: MON }], MON, TUE), false);
  assert.equal(missedScheduledDay(daily, [], MON, TUE), true);
});

test('another habit\'s completions do not cover this one', () => {
  const gym = { id: 'gym', days: [1] };
  assert.equal(missedScheduledDay(gym, [{ hid: 'read', date: MON }], MON, TUE), true);
});

test('labels read the way a person would say them', () => {
  assert.equal(scheduleLabel(undefined), 'Every day');
  assert.equal(scheduleLabel([0, 1, 2, 3, 4, 5, 6]), 'Every day');
  assert.equal(scheduleLabel([1, 2, 3, 4, 5]), 'Weekdays');
  assert.equal(scheduleLabel([0, 6]), 'Weekends');
  assert.equal(scheduleLabel([5, 1, 3]), 'Mon, Wed, Fri');
});
