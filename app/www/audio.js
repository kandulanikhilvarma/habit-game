// WebAudio oscillators, no assets. Recorded kalimba samples are a v2 swap (DESIGN_MOTION_SPEC §6).
//
// Budget is deliberately tiny: completion, perfect day, level up, comeback, freeze spent. Nothing
// else makes a sound — over-feedback trains people to ignore all of it. Navigation is silent.

// C5 E5 G5 C6 — the day's completions climb this, so progress is audible as well as visible.
const CHIME = [523.25, 659.25, 783.99, 1046.5];

let ctx = null;

/** Created on a user gesture, never at import: browsers refuse an AudioContext without one. */
function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, { at = 0, duration = 0.45, gain = 0.14, type = 'sine' } = {}) {
  const ac = audio();
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  // Soft attack and a long tail: a marimba-ish ping rather than a casino blip.
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(env).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Nth completion of the day climbs the chime; past the fourth it holds at the top note. */
export function playCompletion(indexToday) {
  tone(CHIME[Math.min(indexToday, CHIME.length - 1)]);
}

export function playPerfectDay() {
  [523.25, 659.25, 783.99].forEach((f, i) => tone(f, { at: i * 0.04, duration: 1.1, gain: 0.12 }));
}

export function playLevelUp() {
  [523.25, 659.25, 1046.5].forEach((f, i) => tone(f, { at: i * 0.09, duration: 0.5 }));
}

/** Warm and low-to-high: the comeback should sound like a welcome, never like an alarm. */
export function playComeback() {
  tone(392, { duration: 0.9, gain: 0.1 });
  tone(587.33, { at: 0.18, duration: 1.2, gain: 0.12 });
}

/** A freeze being spent is information, not celebration: one soft, low note. */
export function playFreezeSpent() {
  tone(311.13, { duration: 0.7, gain: 0.09, type: 'triangle' });
}
