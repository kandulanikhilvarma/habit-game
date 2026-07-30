// The log rides inside one Firestore document, which hard-fails at 1 MiB. Pruning is what keeps
// sync from breaking outright after a few years of daily use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruneLog, LOG_KEEP_DAYS } from './store.js';

const dayBefore = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

test('rows inside the window survive, older ones are dropped', () => {
  const today = '2026-07-30';
  const log = [
    { date: dayBefore(today, LOG_KEEP_DAYS + 60), hid: 'a' },
    { date: dayBefore(today, LOG_KEEP_DAYS - 1), hid: 'a' },
    { date: today, hid: 'a' },
  ];
  const kept = pruneLog(log, today).map((e) => e.date);
  assert.equal(kept.length, 2);
  assert.ok(kept.includes(today));
  assert.ok(!kept.includes(dayBefore(today, LOG_KEEP_DAYS + 60)));
});

test('the window comfortably covers what Journey reads (150 days)', () => {
  const today = '2026-07-30';
  const log = Array.from({ length: 150 }, (_, i) => ({ date: dayBefore(today, i), hid: 'a' }));
  assert.equal(pruneLog(log, today).length, 150, 'no analytics row is ever pruned');
});

test('pruning an empty or missing log is harmless', () => {
  assert.deepEqual(pruneLog([], '2026-07-30'), []);
  assert.deepEqual(pruneLog(undefined, '2026-07-30'), []);
});
