// The evolution has to be *visible* — a label change with the same picture is not branching
// evolution (VALIDATION_REPORT §7 condition 1). This guards which art each stage wears.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { artKeyFor, creatureArt } from './creature.js';

test('stage 2 still wears the starter you picked', () => {
  for (const s of ['kumo', 'embr', 'moss', 'aqua', 'sol', 'nyx']) {
    assert.equal(artKeyFor(s, 2, 'ember'), s);
  }
});

test('stage 3 wears the lineage the habits chose', () => {
  for (const l of ['ember', 'moth', 'sentinel', 'prismatic']) {
    assert.equal(artKeyFor('kumo', 3, l), l);
  }
});

test('stage 4 wears that lineage Guardian, not the stage 3 picture again', () => {
  for (const l of ['ember', 'moth', 'sentinel', 'prismatic']) {
    assert.equal(artKeyFor('kumo', 4, l), `${l}-guardian`);
    assert.notEqual(artKeyFor('kumo', 4, l), artKeyFor('kumo', 3, l));
  }
});

test('stage 5 is the shared Radiant form for every branch', () => {
  for (const l of ['ember', 'moth', 'sentinel', 'prismatic']) {
    assert.equal(artKeyFor('sol', 5, l), 'radiant');
  }
});

test('every promotion changes the picture', () => {
  const seen = [2, 3, 4, 5].map((st) => artKeyFor('embr', st, 'sentinel'));
  assert.deepEqual(seen, ['embr', 'sentinel', 'sentinel-guardian', 'radiant']);
  assert.equal(new Set(seen).size, 4, 'each tier looks different');
});

test('unknown species or lineage still renders something', () => {
  assert.equal(artKeyFor('nope', 2, 'ember'), 'kumo');
  assert.equal(artKeyFor('kumo', 3, 'nope'), 'prismatic');
  assert.equal(artKeyFor('kumo', 4, 'nope'), 'prismatic-guardian');
  assert.match(creatureArt('nope'), /assets\/creatures\/kumo\.png/);
});

test('art markup carries the class fx.js animates and a real alt', () => {
  const html = creatureArt('radiant');
  assert.match(html, /class="creature-art"/);
  assert.match(html, /alt="Radiant guardian"/);
  assert.match(html, /assets\/creatures\/radiant\.png/);
});

// A key with no file behind it renders as a broken image on someone's Home screen, and no amount of
// unit-testing the mapping catches that. Check the files actually exist.
test('every art key a real player can reach has a file on disk', () => {
  const dir = new URL('./assets/creatures/', import.meta.url);
  const wanted = new Set();
  for (const s of ['kumo', 'embr', 'moss', 'aqua', 'sol', 'nyx']) {
    for (const stage of [2, 3, 4, 5]) {
      for (const l of ['ember', 'moth', 'sentinel', 'prismatic']) wanted.add(artKeyFor(s, stage, l));
    }
  }
  const missing = [...wanted].filter((k) => !existsSync(new URL(`${k}.png`, dir)));
  assert.deepEqual(missing, [], `missing art: ${missing.join(', ')}`);
});
