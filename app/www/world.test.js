// Guards the glade's rules (§3.3): the ≥7-day planting threshold, the ≤10 cap, day/night from the
// local clock, and neglect dimming without ruin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worldSvg } from './world.js';

const at = (h) => Date.parse(`2026-07-29T${String(h).padStart(2, '0')}:00:00`);

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
  // 3 habits, one under threshold -> 2 plant groups. Count <g> planting groups (not the whole svg).
  const svg = worldSvg(state(), { now: at(12) });
  const groups = (svg.match(/<g>/g) || []).length;
  assert.equal(groups, 2, 'two plantings, the 3-day habit is not yet planted');
});

test('planting count is capped at 10', () => {
  const habits = Array.from({ length: 14 }, (_, i) => ({ id: 'h' + i, category: 'mind', total: 30 }));
  const svg = worldSvg(state({ habits }), { now: at(12) });
  assert.equal((svg.match(/<g>/g) || []).length, 10);
});

test('lanterns glow at night, not at noon', () => {
  const night = worldSvg(state(), { now: at(23) });
  const noon = worldSvg(state(), { now: at(12) });
  assert.ok(/opacity="0.9"/.test(night), 'lantern lit at night');
  assert.ok(/opacity="0.25"/.test(noon), 'lantern dark at noon');
});

test('neglect dims the scene but still renders it', () => {
  const svg = worldSvg(state({ gStreak: 0 }), { now: at(23) });
  assert.match(svg, /opacity:0.55/);
  assert.ok(svg.includes('<g>'), 'plantings persist through neglect');
  assert.ok(!svg.includes('class="firefly"'), 'no fireflies while neglected');
});

test('a perfect day summons fireflies', () => {
  const perfect = state({ day: { doneIds: ['a', 'b', 'c'] } });
  const svg = worldSvg(perfect, { now: at(23) });
  assert.ok(svg.includes('class="firefly"'));
});
