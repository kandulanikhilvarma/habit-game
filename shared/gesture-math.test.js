import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rubberBand, projectMomentum, releaseDecision, velocityFrom, DISMISS_VELOCITY,
} from './gesture-math.js';

const H = 400;

test('rubber band: gives ground at first, then resists', () => {
  assert.equal(rubberBand(0, H), 0);
  const small = rubberBand(10, H);
  const large = rubberBand(200, H);
  assert.ok(small > 5 && small < 10, `10px pull moved ${small}`);
  assert.ok(large < 200 * 0.55, 'resistance grows with distance');
  assert.ok(large > small, 'still moves, never hard-stops');
});

test('rubber band: never exceeds the sheet height even on an absurd pull', () => {
  assert.ok(rubberBand(100000, H) < H, 'asymptote keeps it bounded');
});

test('release: a fast flick dismisses even from the very top', () => {
  assert.equal(releaseDecision({ y: 2, velocity: 0.5, height: H }), 'dismiss');
});

test('release: a slow drag near the top settles back open', () => {
  assert.equal(releaseDecision({ y: 40, velocity: 0.01, height: H }), 'settle');
});

test('release: past halfway with no velocity dismisses', () => {
  assert.equal(releaseDecision({ y: 260, velocity: 0, height: H }), 'dismiss');
});

test('release: an upward flick from low down settles rather than dismissing', () => {
  assert.equal(releaseDecision({ y: 220, velocity: -0.4, height: H }), 'settle');
});

test('release: the dismiss threshold is exclusive', () => {
  assert.equal(releaseDecision({ y: 10, velocity: DISMISS_VELOCITY, height: H }), 'settle');
  assert.equal(releaseDecision({ y: 10, velocity: DISMISS_VELOCITY + 0.001, height: H }), 'dismiss');
});

test('momentum projection carries in the direction of travel', () => {
  assert.ok(projectMomentum(100, 0.2) > 100);
  assert.ok(projectMomentum(100, -0.2) < 100);
  assert.equal(projectMomentum(100, 0), 100);
});

test('velocity: derived from first and last retained sample', () => {
  assert.equal(velocityFrom([{ y: 0, t: 0 }, { y: 100, t: 100 }]), 1);
  assert.equal(velocityFrom([{ y: 100, t: 0 }, { y: 0, t: 100 }]), -1);
});

test('velocity: degenerate sample sets are zero, not NaN or Infinity', () => {
  assert.equal(velocityFrom([]), 0);
  assert.equal(velocityFrom([{ y: 5, t: 5 }]), 0);
  assert.equal(velocityFrom([{ y: 0, t: 7 }, { y: 50, t: 7 }]), 0);
});
