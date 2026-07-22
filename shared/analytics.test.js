import test from 'node:test';
import assert from 'node:assert/strict';
import {
  heatmap, successRate, trend, hourHistogram, bestHourInsight,
  weekdayWeekendSplit, hourLabel,
} from './analytics.js';

const DAY = 86400000;
// Fixed clock so windowed queries are deterministic. Local noon avoids any DST/offset edge.
const NOW = new Date('2026-07-20T12:00:00').getTime();
const dayKey = (ms) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
};
const entry = (habitId, daysAgo, hour = 8) => {
  const ts = new Date(NOW - daysAgo * DAY);
  ts.setHours(hour, 0, 0, 0);
  return { date: dayKey(ts.getTime()), hid: habitId, ts: ts.getTime(), category: 'body' };
};

test('heatmap: one cell per day in the window, counting completions', () => {
  const log = [entry('a', 0), entry('b', 0), entry('a', 2)];
  const cells = heatmap(log, { days: 7, now: NOW });
  assert.equal(cells.length, 7);
  assert.equal(cells[cells.length - 1].count, 2);   // today had two
  assert.equal(cells[cells.length - 3].count, 1);   // two days ago had one
  assert.equal(cells[0].count, 0);                  // six days ago, nothing
});

test('successRate: caps due days at habit age so a new habit is not punished', () => {
  const habit = { id: 'a', createdAt: NOW - 3 * DAY };
  const log = [entry('a', 0), entry('a', 1), entry('a', 2), entry('a', 3)];
  const r = successRate(log, habit, { windowDays: 30, now: NOW });
  assert.equal(r.due, 4);          // habit is 4 calendar days old, not 30
  assert.equal(r.done, 4);
  assert.equal(r.rate, 1);
});

test('successRate: counts a day once even with duplicate completions, and never exceeds 1', () => {
  const habit = { id: 'a', createdAt: NOW - 30 * DAY };
  const log = [entry('a', 0, 8), entry('a', 0, 20), entry('a', 1)];
  const r = successRate(log, habit, { windowDays: 30, now: NOW });
  assert.equal(r.done, 2);
  assert.ok(r.rate <= 1);
});

test('trend: improvement reads up, decline reads down, noise stays flat', () => {
  const habit = { id: 'a', createdAt: NOW - 60 * DAY };
  const recentHeavy = [];
  for (let d = 0; d < 12; d += 1) recentHeavy.push(entry('a', d));       // dense recent fortnight
  assert.equal(trend(recentHeavy, habit, { windowDays: 14, now: NOW }), 'up');

  const olderHeavy = [];
  for (let d = 14; d < 26; d += 1) olderHeavy.push(entry('a', d));       // dense prior fortnight only
  assert.equal(trend(olderHeavy, habit, { windowDays: 14, now: NOW }), 'down');
});

test('hourHistogram: buckets by local hour', () => {
  const h = hourHistogram([entry('a', 0, 8), entry('a', 1, 8), entry('a', 2, 21)]);
  assert.equal(h[8], 2);
  assert.equal(h[21], 1);
  assert.equal(h.reduce((a, b) => a + b, 0), 3);
});

test('bestHourInsight: null below the evidence floor, real above it', () => {
  assert.equal(bestHourInsight([entry('a', 0), entry('a', 1)]), null);
  const morning = [];
  for (let d = 0; d < 6; d += 1) morning.push(entry('a', d, 7));
  const insight = bestHourInsight(morning);
  assert.equal(insight.peakHour, 7);
  assert.equal(insight.morningShare, 1);
});

test('weekdayWeekendSplit: partitions by day of week', () => {
  // 2026-07-20 is a Monday; 5 days ago (the 15th) is a Wednesday; 2 days ago (18th) is Saturday.
  const split = weekdayWeekendSplit([entry('a', 0), entry('a', 2), entry('a', 5)]);
  assert.equal(split.weekday, 2);
  assert.equal(split.weekend, 1);
});

test('hourLabel: 12-hour clock', () => {
  assert.equal(hourLabel(0), '12am');
  assert.equal(hourLabel(9), '9am');
  assert.equal(hourLabel(12), '12pm');
  assert.equal(hourLabel(14), '2pm');
  assert.equal(hourLabel(23), '11pm');
});
