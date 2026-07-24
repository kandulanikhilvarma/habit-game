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

/**
 * Unlock audio from a direct tap (the sound opt-in "Sure"). iOS keeps the context suspended until a
 * gesture resumes it; doing that here, on an explicit tap, is more reliable than waiting for the
 * first completion beat. A silent 1-frame tone primes the pipeline without an audible blip.
 * Note: iOS still routes WebAudio through the hardware mute switch — sound needs the ringer on.
 */
export function unlockAudio() {
  const ac = audio();
  const osc = ac.createOscillator();
  const env = ac.createGain();
  env.gain.value = 0;
  osc.connect(env).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.02);
}

// One shared low-pass so nothing is harsh — the "soft" in the Apple-ish softness comes from rolling
// off the top end and layering a quiet octave-up shimmer rather than a bare oscillator.
let lp = null;
function lowpass() {
  const ac = audio();
  if (!lp || lp.context !== ac) {
    lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    lp.Q.value = 0.4;
    lp.connect(ac.destination);
  }
  return lp;
}

function tone(freq, { at = 0, duration = 0.45, gain = 0.14, type = 'sine' } = {}) {
  const ac = audio();
  const t0 = ac.currentTime + at;
  const out = lowpass();

  // A gentle bell: fundamental + a quiet triangle octave for body + a faint fifth shimmer. The soft
  // 8ms attack and long exponential tail keep it a warm ping, never a click or a casino blip.
  const partials = [
    { f: freq, g: gain, wave: type },
    { f: freq * 2, g: gain * 0.18, wave: 'triangle' },
    { f: freq * 3, g: gain * 0.06, wave: 'sine' },
  ];
  for (const p of partials) {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = p.wave;
    osc.frequency.value = p.f;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(p.g, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env).connect(out);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }
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

/** A new quest joins the world: two notes rising — something began. */
export function playAdd() {
  tone(587.33, { duration: 0.28, gain: 0.11 });
  tone(880, { at: 0.09, duration: 0.4, gain: 0.11 });
}

/** A quest let go: two soft notes falling — gentle, never a failure sound. */
export function playRemove() {
  tone(440, { duration: 0.26, gain: 0.09, type: 'triangle' });
  tone(329.63, { at: 0.09, duration: 0.4, gain: 0.09, type: 'triangle' });
}

/** A quiet selection blip for picking a template, icon, or starter. Short so it never nags. */
export function playPick() {
  tone(659.25, { duration: 0.12, gain: 0.07 });
}

/** The creature reacts to a pet: a soft two-note coo. */
export function playPet() {
  tone(783.99, { duration: 0.22, gain: 0.08 });
  tone(1046.5, { at: 0.06, duration: 0.3, gain: 0.06 });
}
