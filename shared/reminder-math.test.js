import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTime, nextTriggerAt, notificationId } from './reminder-math.js';

test('parseTime accepts real times, including single-digit hours', () => {
  assert.deepEqual(parseTime('07:30'), { hours: 7, minutes: 30 });
  assert.deepEqual(parseTime('7:05'), { hours: 7, minutes: 5 });
  assert.deepEqual(parseTime('00:00'), { hours: 0, minutes: 0 });
  assert.deepEqual(parseTime('23:59'), { hours: 23, minutes: 59 });
});

test('parseTime rejects anything that is not a real time', () => {
  for (const bad of ['24:00', '12:60', '', 'noon', '7', '7:5', '07:30:00', null, undefined, 730]) {
    assert.equal(parseTime(bad), null, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test('a time later today fires today', () => {
  const now = new Date('2026-07-20T09:00:00');
  const at = nextTriggerAt('21:30', now);
  assert.equal(at.getDate(), 20);
  assert.equal(at.getHours(), 21);
  assert.equal(at.getMinutes(), 30);
});

test('a time already passed today rolls to tomorrow', () => {
  const now = new Date('2026-07-20T09:00:00');
  const at = nextTriggerAt('07:30', now);
  assert.equal(at.getDate(), 21);
  assert.equal(at.getHours(), 7);
});

test('the current minute counts as passed, so saving does not fire instantly', () => {
  const now = new Date('2026-07-20T09:00:00');
  assert.equal(nextTriggerAt('09:00', now).getDate(), 21);
});

test('crossing midnight lands on the next calendar day, not the same one', () => {
  const now = new Date('2026-07-20T23:59:00');
  const at = nextTriggerAt('00:05', now);
  assert.equal(at.getDate(), 21);
  assert.equal(at.getHours(), 0);
  assert.equal(at.getMinutes(), 5);
});

test('crossing a month boundary rolls the month too', () => {
  const now = new Date('2026-07-31T22:00:00');
  const at = nextTriggerAt('06:00', now);
  assert.equal(at.getMonth(), 7);   // August
  assert.equal(at.getDate(), 1);
});

test('an invalid time schedules nothing rather than throwing', () => {
  assert.equal(nextTriggerAt('nope'), null);
  assert.equal(nextTriggerAt(null), null);
});

test('notification ids are stable, non-negative and distinct per habit', () => {
  assert.equal(notificationId('read'), notificationId('read'));
  assert.notEqual(notificationId('read'), notificationId('workout'));
  assert.ok(notificationId('a-very-long-habit-id-name-here') >= 0);
  assert.ok(Number.isInteger(notificationId('read')));
});
