// Pure decisions behind the sheet gesture (DESIGN_MOTION_SPEC §4), kept out of sheet.js so they
// can be tested without a DOM. sheet.js owns the pointer plumbing; this owns the arithmetic.

export const DISMISS_VELOCITY = 0.11;   // px/ms — a flick this fast dismisses regardless of distance
export const MOMENTUM_FRICTION = 0.998;
export const RUBBER_BAND = 0.55;

/**
 * Resistance above the rest position: the sheet keeps moving with the finger but gives less and
 * less ground, and never hard-stops.
 * @param overshoot how far past rest the finger has travelled, in px (positive)
 * @param height the sheet's height in px
 */
export function rubberBand(overshoot, height) {
  return (overshoot * RUBBER_BAND * height) / (height + RUBBER_BAND * overshoot);
}

/** Where momentum would carry the sheet if the finger let go now. */
export function projectMomentum(y, velocity) {
  return y + (velocity * MOMENTUM_FRICTION) / (1 - MOMENTUM_FRICTION);
}

/**
 * Release decision. Velocity wins over position: a fast flick dismisses even from near the top,
 * which is what makes the sheet feel like a physical object rather than a threshold check.
 * @returns 'dismiss' | 'settle'
 */
export function releaseDecision({ y, velocity, height }) {
  if (velocity > DISMISS_VELOCITY) return 'dismiss';
  return projectMomentum(y, velocity) > height / 2 ? 'dismiss' : 'settle';
}

/** Velocity in px/ms from the retained pointer samples; positive is downward. */
export function velocityFrom(samples) {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  return dt > 0 ? (last.y - first.y) / dt : 0;
}
