// The card is presentation glue over already-tested math (game-math, analytics). This guards the
// glue: that the creature's real name/level/streak/lineage actually land in the SVG, and the heat
// ring reflects the log — so a rename of a field upstream can't silently blank the share card.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dnaCardSvg } from './dna.js';

const day = 86400000;
const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

function sampleState(over = {}) {
  const now = Date.parse('2026-07-29T12:00:00Z');
  const log = [];
  for (let i = 0; i < 40; i++) log.push({ date: dayKey(now - i * day), hid: 'h0', ts: now - i * day, category: 'mind' });
  return {
    creature: { name: 'Emberwyn', species: 'embr', xp: 980 },
    habits: [
      { id: 'h0', name: 'Read', category: 'mind', total: 61 },
      { id: 'h1', name: 'Run', category: 'body', total: 44 },
      { id: 'h2', name: 'Tidy', category: 'order', total: 30 },
    ],
    gStreak: 42, gBest: 42, log,
    ...over,
  };
}

test('card carries the creature identity and stats', () => {
  const svg = dnaCardSvg(sampleState());
  assert.match(svg, /viewBox="0 0 1080 1920"/);
  assert.ok(svg.includes('Emberwyn'), 'creature name');
  assert.ok(svg.includes('>42<'), 'streak flame');
  assert.ok(svg.includes('Lv 7'), 'level derived from xp');
  assert.ok(svg.includes('135'), 'total quests = 61+44+30');
  assert.ok(svg.includes('line') || svg.includes('affinity'), 'lineage or affinity tag');
});

test('heat ring reflects completed days, not blank', () => {
  const lit = (dnaCardSvg(sampleState()).match(/r="7"/g) || []).length;
  assert.ok(lit >= 39 && lit <= 41, `~40 lit days, got ${lit}`);
  const empty = (dnaCardSvg(sampleState({ log: [] })).match(/r="7"/g) || []).length;
  assert.equal(empty, 0, 'no log = no lit cells');
});

test('missing name falls back without crashing', () => {
  const svg = dnaCardSvg(sampleState({ creature: { name: '', species: 'kumo', xp: 0 } }));
  assert.ok(svg.includes('Kumo'));
});

test('user text is escaped', () => {
  const svg = dnaCardSvg(sampleState({ creature: { name: '<b>&x', species: 'embr', xp: 10 } }));
  assert.ok(svg.includes('&lt;b&gt;&amp;x'));
  assert.ok(!svg.includes('<b>&x'));
});
