import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklyLetter } from './letter.js';

const DAY = 86400000;
const NOW = new Date('2026-07-26T12:00:00').getTime();   // a Sunday
const dayKey = (ms) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
};
const entry = (daysAgo, hid = 'read') => {
  const ts = NOW - daysAgo * DAY;
  return { date: dayKey(ts), hid, ts, category: 'mind' };
};

test('empty log: a warm getting-started note, never blank', () => {
  const l = weeklyLetter([], 'Kumo', NOW);
  assert.ok(l.lines[0].length > 0);
  assert.match(l.title, /Kumo/);
});

test('counts distinct days shown up in the last 7', () => {
  const log = [entry(0), entry(0, 'gym'), entry(1), entry(2), entry(5)];   // 4 distinct days
  const l = weeklyLetter(log, 'Kumo', NOW);
  assert.match(l.lines[0], /4 of 7/);
});

test('a strong week reads as gratitude, a light week as welcome', () => {
  const strong = [0, 1, 2, 3, 4, 5].map((d) => entry(d));
  assert.match(weeklyLetter(strong, 'Kumo', NOW).lines[0], /thank you/i);

  const light = [entry(0)];
  assert.match(weeklyLetter(light, 'Kumo', NOW).lines[0], /every return counts/i);
});

test('names the hardest weekday only with enough history, and never shames', () => {
  // Lots of completions, but none ever on a Tuesday.
  const log = [];
  for (let w = 0; w < 4; w += 1) {
    for (const off of [0, 1, 3, 4, 5]) log.push(entry(w * 7 + off));   // skip the Tuesday offset
  }
  const l = weeklyLetter(log, 'Kumo', NOW);
  const joined = l.lines.join(' ');
  assert.match(joined, /hard for us/);
  assert.doesNotMatch(joined, /fail|lazy|should/i);
});

test('too little data: no weekday claim invented', () => {
  const l = weeklyLetter([entry(0), entry(1)], 'Kumo', NOW);
  assert.doesNotMatch(l.lines.join(' '), /hard for us/);
});
