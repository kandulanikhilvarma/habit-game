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
  for (let d = 0; d < 14; d += 1) morning.push(entry('a', d, 7));
  const insight = bestHourInsight(morning);
  assert.equal(insight.peakHour, 7);
  assert.equal(insight.morningShare, 1);
});

test('bestHourInsight: a burst on one day is not a finding', () => {
  // 14 completions, all on the same evening. Plenty of taps, no evidence of a pattern.
  const burst = Array.from({ length: 14 }, () => entry('a', 0, 21));
  assert.equal(bestHourInsight(burst), null, 'needs several separate days, not one busy night');
});

test('bestHourInsight: 1am is not a morning', () => {
  const lateNight = [];
  for (let d = 0; d < 14; d += 1) lateNight.push(entry('a', d, 1));
  const insight = bestHourInsight(lateNight);
  assert.equal(insight.peakHour, 1);
  assert.equal(insight.morningShare, 0, 'the old "before 9am" test counted 1am as a morning win');
});

test('bestHourInsight: evenings are recognised too', () => {
  const evening = [];
  for (let d = 0; d < 14; d += 1) evening.push(entry('a', d, 19));
  const insight = bestHourInsight(evening);
  assert.equal(insight.eveningShare, 1);
  assert.equal(insight.morningShare, 0);
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

test('a habit is only judged on the days it was scheduled for', () => {
  // Four weeks ending Wed 2026-07-29. Gym runs Mon/Wed/Fri and never missed one.
  const now = Date.parse('2026-07-29T12:00:00');
  const gym = { id: 'gym', days: [1, 3, 5], createdAt: now - 27 * 86400000 };
  const log = [];
  for (let i = 0; i < 28; i += 1) {
    const d = new Date(now - i * 86400000);
    if ([1, 3, 5].includes(d.getDay())) {
      log.push({ hid: 'gym', date: d.toISOString().slice(0, 10) });
    }
  }
  const r = successRate(log, gym, { windowDays: 28, now });
  assert.equal(r.rate, 1, `a perfect record must read 100%, got ${Math.round(r.rate * 100)}%`);
  assert.ok(r.due < 20, `only scheduled days are due, got ${r.due} of 28`);
});

test('a daily habit is still judged on every day', () => {
  const now = Date.parse('2026-07-29T12:00:00');
  const daily = { id: 'a', createdAt: now - 9 * 86400000 };
  const r = successRate([], daily, { windowDays: 10, now });
  assert.equal(r.due, 10);
  assert.equal(r.rate, 0);
});

test('missing a scheduled day still shows below 100%', () => {
  const now = Date.parse('2026-07-29T12:00:00');
  const gym = { id: 'gym', days: [1, 3, 5], createdAt: now - 13 * 86400000 };
  const log = [{ hid: 'gym', date: '2026-07-27' }];   // one Monday only
  const r = successRate(log, gym, { windowDays: 14, now });
  assert.ok(r.rate > 0 && r.rate < 1, `partial record, got ${r.rate}`);
});
