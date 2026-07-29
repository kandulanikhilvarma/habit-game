// The evolution has to be *visible* — a label change with the same picture is not branching
// evolution (VALIDATION_REPORT §7 condition 1). This guards which art each stage wears.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { artKeyFor, creatureArt, LOGO_CREATURE } from './creature.js';

test('stage 2 still wears the starter you picked', () => {
  for (const s of ['kumo', 'embr', 'moss', 'aqua', 'sol', 'nyx']) {
    assert.equal(artKeyFor(s, 2, 'ember'), s);
  }
});

test('stage 3-4 wears the lineage the habits chose', () => {
  for (const l of ['ember', 'moth', 'sentinel', 'prismatic']) {
    assert.equal(artKeyFor('kumo', 3, l), l);
    assert.equal(artKeyFor('kumo', 4, l), l);
  }
});

test('stage 5 is the shared Radiant form for every branch', () => {
  for (const l of ['ember', 'moth', 'sentinel', 'prismatic']) {
    assert.equal(artKeyFor('sol', 5, l), 'radiant');
  }
});

test('evolving actually changes the picture', () => {
  const seen = [2, 3, 5].map((st) => artKeyFor('embr', st, 'sentinel'));
  assert.deepEqual(seen, ['embr', 'sentinel', 'radiant']);
  assert.equal(new Set(seen).size, 3, 'each tier looks different');
});

test('unknown species or lineage still renders something', () => {
  assert.equal(artKeyFor('nope', 2, 'ember'), 'kumo');
  assert.equal(artKeyFor('kumo', 3, 'nope'), 'prismatic');
  assert.match(creatureArt('nope'), /assets\/creatures\/kumo\.png/);
});

test('art markup carries the class fx.js animates and a real alt', () => {
  const html = creatureArt('radiant');
  assert.match(html, /class="creature-art"/);
  assert.match(html, /alt="Radiant guardian"/);
  assert.match(html, /assets\/creatures\/radiant\.png/);
});

test('the logo creature is a real art key', () => {
  assert.match(creatureArt(LOGO_CREATURE), new RegExp(`${LOGO_CREATURE}\\.png`));
});
