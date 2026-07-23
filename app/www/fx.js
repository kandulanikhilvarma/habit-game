// The one entry point for reward feedback: visual + haptic fire on the same frame (§6 causality).
// Recipe from DESIGN_MOTION_SPEC §3 item 1.

import { playCompletion, playPerfectDay, playComeback } from './audio.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function hapticLight() {
  // Capacitor Haptics when running in the shell; the browser gets the vibrate fallback or nothing.
  const haptics = window.Capacitor?.Plugins?.Haptics;
  if (haptics) haptics.impact({ style: 'LIGHT' });
  else navigator.vibrate?.(12);
}

function hapticSuccess() {
  const haptics = window.Capacitor?.Plugins?.Haptics;
  if (haptics) haptics.notification({ type: 'SUCCESS' });
  else navigator.vibrate?.([12, 60, 24]);
}

/**
 * One haptic entry point for the whole app. 'light' for taps/selections, 'success' for completions.
 * Note: iOS Safari ignores navigator.vibrate entirely, so on iOS-web this is a no-op — haptics land
 * in the native Android shell via the Capacitor plugin.
 */
export function haptic(kind = 'light') {
  const haptics = window.Capacitor?.Plugins?.Haptics;
  if (haptics) {
    if (kind === 'success') haptics.notification({ type: 'SUCCESS' });
    else haptics.impact({ style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
    return;
  }
  navigator.vibrate?.(kind === 'success' ? [12, 60, 24] : 8);
}

/** XP number floats up from the point the finger actually touched. */
export function floatXp(amount, x, y) {
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = `+${amount}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.append(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/** Creature hop — overshoot is allowed here because the moment carries momentum. */
export function hop(stageEl) {
  if (reduced.matches) return;
  const body = stageEl.querySelector('#body-group');
  if (!body) return;
  body.animate(
    [{ transform: 'translateY(0) scaleY(1)' },
     { transform: 'translateY(-22px) scaleY(1.06)', offset: 0.45 },
     { transform: 'translateY(0) scaleY(0.96)', offset: 0.75 },
     { transform: 'translateY(0) scaleY(1)' }],
    { duration: 500, easing: 'cubic-bezier(0.22, 1.4, 0.36, 1)', composite: 'replace' },
  );
}

/** Streak flame ticks 1 -> 1.15 -> 1. */
export function tickFlame(flameEl) {
  if (!flameEl || reduced.matches) return;
  flameEl.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
    { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  );
}

/**
 * Fire the whole check-in beat. Sound and haptic go off on frame 1, with the check fill — not at
 * the end of the sequence (§6 causality: feedback belongs on the causal frame).
 * @param {{xp:number, at:{x:number,y:number}, stageEl:Element, flameEl:Element,
 *          indexToday:number, perfect:boolean, sound:boolean}} beat
 */
export function celebrate({ xp, at, stageEl, flameEl, indexToday = 0, perfect = false, sound = false }) {
  if (perfect) hapticSuccess();
  else hapticLight();
  if (sound) {
    if (perfect) playPerfectDay();
    else playCompletion(indexToday);
  }
  floatXp(xp, at.x, at.y);
  hop(stageEl);
  tickFlame(flameEl);
}

/**
 * The comeback wake-up (DESIGN_MOTION_SPEC §3 item 8). Blanket slides off, the creature stretches,
 * then settles. Rare and high-emotion, so it is allowed to be long — but it never blocks input.
 * Resolves when the beat is over so the caller can re-render the awake creature.
 */
export function wakeUp(stageEl, { sound = false } = {}) {
  if (sound) playComeback();
  if (reduced.matches) return Promise.resolve();

  const blanketEl = stageEl.querySelector('#blanket');
  const body = stageEl.querySelector('#body-group');

  blanketEl?.animate(
    [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(70px)', opacity: 0 }],
    { duration: 400, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' },
  );
  const stretch = body?.animate(
    [{ transform: 'scaleY(1)' },
     { transform: 'scaleY(1.06) translateY(-6px)', offset: 0.45 },
     { transform: 'scaleY(0.98)', offset: 0.75 },
     { transform: 'scaleY(1)' }],
    { duration: 600, delay: 300, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
  );

  // Timer rather than the animation's finished promise: on a tab that never paints, WAAPI never
  // resolves and the caller would wait forever for a creature that is already awake in state.
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

/** Idle life costs battery on a WebView; stop it whenever the app is not on screen. */
export function bindIdleLifecycle() {
  const setPlayState = () => {
    const state = document.hidden ? 'paused' : 'running';
    document.querySelectorAll('#body-group, #shadow, #eyes').forEach((el) => {
      el.style.animationPlayState = state;
    });
  };
  document.addEventListener('visibilitychange', setPlayState);
  setPlayState();
}

/** Blink at a random phase so two sessions never look identical. */
export function randomizeBlink() {
  const eyes = document.querySelector('#eyes');
  if (eyes) eyes.style.animationDelay = `${-Math.random() * 5}s`;
}
