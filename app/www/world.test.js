// Guards the glade's rules (§3.3): the ≥7-day planting threshold, the ≤10 cap, lanterns following
// the local clock, and neglect dimming without ruin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldSvg } from './world.js';

const at = (h) => Date.parse(`2026-07-29T${String(h).padStart(2, '0')}:00:00`);
const count = (svg, re) => (svg.match(re) || []).length;

function state(over = {}) {
  return {
    gStreak: 5,
    day: { doneIds: [] },
    habits: [
      { id: 'a', category: 'mind', total: 9 },
      { id: 'b', category: 'body', total: 20 },
      { id: 'c', category: 'order', total: 3 },  // under threshold, no planting
    ],
    ...over,
  };
}

test('only habits kept >=7 days plant something', () => {
  const svg = worldSvg(state(), { now: at(12) });
  assert.equal(count(svg, /class="plant /g), 2, 'the 3-day habit is not yet planted');
  assert.equal(count(svg, /plant--tree/g), 1, 'mind plants a tree');
  assert.equal(count(svg, /plant--lantern/g), 1, 'body plants a lantern');
});

test('planting count is capped at 10', () => {
  const habits = Array.from({ length: 14 }, (_, i) => ({ id: 'h' + i, category: 'mind', total: 30 }));
  assert.equal(count(worldSvg(state({ habits }), { now: at(12) }), /class="plant /g), 10);
});

test('lanterns glow at night, not at noon', () => {
  assert.equal(count(worldSvg(state(), { now: at(23) }), /lantern-glow/g), 1, 'lit at night');
  assert.equal(count(worldSvg(state(), { now: at(12) }), /lantern-glow/g), 0, 'dark at noon');
});

test('neglect dims the scene but still renders it', () => {
  const svg = worldSvg(state({ gStreak: 0 }), { now: at(23) });
  assert.match(svg, /world--dim/);
  assert.equal(count(svg, /class="plant /g), 2, 'plantings persist through neglect');
  assert.equal(count(svg, /lantern-glow/g), 0, 'lanterns unlit while neglected');
  assert.equal(count(svg, /class="firefly"/g), 0, 'no fireflies while neglected');
});

test('a perfect day summons fireflies', () => {
  const perfect = state({ day: { doneIds: ['a', 'b', 'c'] } });
  assert.equal(count(worldSvg(perfect, { now: at(23) }), /class="firefly"/g), 6);
  assert.equal(count(worldSvg(state(), { now: at(23) }), /class="firefly"/g), 0);
});

test('colours come from theme variables, never hardcoded surface hex', () => {
  const svg = worldSvg(state(), { now: at(12) });
  assert.match(svg, /var\(--world-ground\)/);
  // A stray dark hex is what made the ground a slab in light mode; keep it out.
  assert.ok(!/#(2b3873|1f294a|2c3a63|161a33)/i.test(svg), 'no hardcoded surface colours');
});

test('plantings sit on the island arc, never floating off it', () => {
  const habits = Array.from({ length: 8 }, (_, i) => ({ id: 'h' + i, category: 'order', total: 30 }));
  const svg = worldSvg(state({ habits }), { now: at(12) });
  // spring ellipses carry the ground contact point
  const ys = [...svg.matchAll(/plant--spring">\s*<ellipse cx="([\d.]+)" cy="([\d.]+)"/g)]
    .map((m) => Number(m[2]));
  assert.equal(ys.length, 8);
  for (const y of ys) assert.ok(y >= 28 && y <= 64, `ground y ${y} is on the island`);
});
