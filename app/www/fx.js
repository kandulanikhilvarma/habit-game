// The one entry point for reward feedback: visual + haptic fire on the same frame (§6 causality).
// Recipe from DESIGN_MOTION_SPEC §3 item 1.

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function hapticLight() {
  // Capacitor Haptics when running in the shell; the browser gets the vibrate fallback or nothing.
  const haptics = window.Capacitor?.Plugins?.Haptics;
  if (haptics) haptics.impact({ style: 'LIGHT' });
  else navigator.vibrate?.(12);
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
 * Fire the whole check-in beat. Haptic goes off on frame 1, with the check fill — not at the end.
 * @param {{xp:number, at:{x:number,y:number}, stageEl:Element, flameEl:Element}} beat
 */
export function celebrate({ xp, at, stageEl, flameEl }) {
  hapticLight();
  floatXp(xp, at.x, at.y);
  hop(stageEl);
  tickFlame(flameEl);
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
