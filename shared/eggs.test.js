import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollEgg, decorLabel, DECOR, EGG_CHANCE } from './eggs.js';

const always = () => 0;        // rolls under the chance, picks the first option
const never = () => 0.99;      // rolls over the chance

test('an ordinary day never drops one', () => {
  assert.equal(rollEgg({ perfect: false, rng: always }), null);
});

test('a perfect day can drop one', () => {
  assert.equal(rollEgg({ perfect: true, rng: always }), DECOR[0]);
});

test('a perfect day often drops nothing — that is the point', () => {
  assert.equal(rollEgg({ perfect: true, rng: never }), null);
});

test('nothing is ever awarded twice', () => {
  const got = rollEgg({ perfect: true, unlocked: [DECOR[0]], rng: always });
  assert.notEqual(got, DECOR[0]);
  assert.ok(DECOR.includes(got));
});

test('a full collection stops dropping instead of failing', () => {
  assert.equal(rollEgg({ perfect: true, unlocked: [...DECOR], rng: always }), null);
});

test('the drop rate is roughly the stated chance', () => {
  let hits = 0;
  const runs = 4000;
  let seed = 1;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < runs; i += 1) {
    if (rollEgg({ perfect: true, unlocked: [], rng })) hits += 1;
  }
  const rate = hits / runs;
  assert.ok(Math.abs(rate - EGG_CHANCE) < 0.05, `expected about ${EGG_CHANCE}, saw ${rate.toFixed(3)}`);
});

test('every decor key has words for it', () => {
  for (const d of DECOR) assert.match(decorLabel(d), /\w/);
});
