// The one gesture surface in the app (DESIGN_MOTION_SPEC §4). Everything else is plain CSS
// transitions, which is why all the pointer maths is allowed to live in this single file.
//
// The sheet is only ever positioned by `transform: translateY`, so a drag can interrupt an
// in-flight animation and continue from the live value instead of snapping to its target.

import { rubberBand, releaseDecision, velocityFrom } from './gesture-math.js';

const SAMPLE_COUNT = 5;

// Critically damped: stiffness 440, damping 42, mass 1 → response ≈ 0.3s, no bounce.
const OMEGA = Math.sqrt(440);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

let frame = null;
let deadline = null;
let activePointer = null;

/** Analytic critically-damped spring: exact at any timestep, so a slow frame cannot destabilise it. */
function springTo(el, from, to, velocity, onDone) {
  cancelSpring();

  const settle = () => {
    cancelSpring();
    el.style.transform = `translateY(${to}px)`;
    onDone?.();
  };

  if (reduced.matches) {
    settle();
    return;
  }

  const x0 = from - to;
  const v0 = velocity * 1000;           // px/ms → px/s
  const c2 = v0 + OMEGA * x0;
  const start = performance.now();

  const step = (now) => {
    const t = (now - start) / 1000;
    const x = (x0 + c2 * t) * Math.exp(-OMEGA * t);
    if (Math.abs(x) < 0.4 && Math.abs(c2 * Math.exp(-OMEGA * t)) < 40) {
      settle();
      return;
    }
    el.style.transform = `translateY(${to + x}px)`;
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  // A backgrounded or throttled tab never runs rAF. Without this the sheet would hang mid-flight —
  // and `close()` finishes inside onDone, so it would never actually hide.
  deadline = setTimeout(settle, 700);
}

function cancelSpring() {
  if (frame) cancelAnimationFrame(frame);
  if (deadline) clearTimeout(deadline);
  frame = null;
  deadline = null;
}

function currentY(el) {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return m.m42 || 0;
}

/**
 * Opens `el` as a draggable bottom sheet. Returns a `close()` the caller can trigger from a
 * button; dragging or tapping the scrim closes it too.
 */
export function presentSheet(el, scrim, onClosed) {
  const height = () => el.offsetHeight;
  let dragging = false;
  let grabOffset = 0;
  let samples = [];

  el.hidden = false;
  scrim.hidden = false;
  el.style.transform = `translateY(${height()}px)`;
  void el.offsetHeight;          // flush the start value so the scrim fade has something to move from
  scrim.classList.add('on');
  springTo(el, height(), 0, 0);

  const close = (velocity = 0) => {
    scrim.classList.remove('on');
    springTo(el, currentY(el), height(), velocity, () => {
      el.hidden = true;
      scrim.hidden = true;
      detach();
      onClosed?.();
    });
  };

  const onDown = (e) => {
    if (activePointer !== null) return;             // multi-touch guard: ignore extra fingers
    // Drag starts only on the handle. The rest of the sheet scrolls natively, so a tall sheet's
    // submit button is always reachable — the previous whole-sheet drag blocked scroll and hid it.
    if (!e.target.closest('.sheet__handle')) return;
    activePointer = e.pointerId;
    dragging = true;
    cancelSpring();                                  // continue from the live value, not the target
    grabOffset = e.clientY - currentY(el);
    samples = [{ y: e.clientY, t: performance.now() }];
    el.setPointerCapture(e.pointerId);
  };

  const onMove = (e) => {
    if (!dragging || e.pointerId !== activePointer) return;
    let y = e.clientY - grabOffset;
    if (y < 0) y = -rubberBand(-y, height());   // resistance above rest, never a hard stop
    el.style.transform = `translateY(${y}px)`;
    samples.push({ y: e.clientY, t: performance.now() });
    if (samples.length > SAMPLE_COUNT) samples.shift();
  };

  const onUp = (e) => {
    if (!dragging || e.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;

    const velocity = velocityFrom(samples);   // px/ms, positive = downward
    const y = currentY(el);

    if (releaseDecision({ y, velocity, height: height() }) === 'dismiss') close(velocity);
    else springTo(el, y, 0, velocity);
  };

  const onScrim = () => close(0);

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  scrim.addEventListener('pointerdown', onScrim);

  function detach() {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    scrim.removeEventListener('pointerdown', onScrim);
    activePointer = null;
  }

  return close;
}
