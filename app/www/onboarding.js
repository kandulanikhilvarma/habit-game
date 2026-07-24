// First run only. Per DESIGN_MOTION_SPEC §3 item 9 this is the one screen allowed to be generous:
// it happens once, so the delight budget is not being spent on a daily surface.

import { SPECIES, creatureSvg } from './creature.js';
import { haptic } from './fx.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * First screen on the web: sign in, or continue as a guest — then the game. Sign-in is offered up
 * front (not buried in You) but never a wall; guests play immediately. Resolves once the user picks.
 * @param onSignIn called when they tap sign in (fires the popup); we resolve either way and the app
 *        updates live when auth lands.
 */
export function runWelcome(host, { onSignIn } = {}) {
  host.innerHTML = `
    <div class="onboard welcome">
      <div class="welcome__mark">${creatureSvg('kumo', 2)}</div>
      <h1 class="onboard__title">Kumo</h1>
      <p class="onboard__sub">A creature that grows from the habits you actually keep.</p>
      <div class="welcome__actions">
        <button class="cta cta--google" id="welcome-signin">Sign in with Google</button>
        <button class="ask__btn" id="welcome-guest">Continue as guest</button>
      </div>
    </div>`;

  return new Promise((resolve) => {
    const done = () => { host.innerHTML = ''; resolve(); };
    host.querySelector('#welcome-signin').addEventListener('click', () => {
      haptic('light');
      onSignIn?.();
      done();
    });
    host.querySelector('#welcome-guest').addEventListener('click', () => { haptic('light'); done(); });
  });
}

/** Resolves with the chosen species key. Renders into `host` and removes itself when done. */
export function runOnboarding(host, { change = false } = {}) {
  const verb = change ? 'Switch to' : 'Begin with';
  host.innerHTML = `
    <div class="onboard">
      <h1 class="onboard__title">${change ? 'Choose a new creature' : 'Who will grow with you?'}</h1>
      ${change ? '<p class="onboard__sub">Your progress stays — only the look and affinity change.</p>' : ''}
      <div class="onboard__cards">
        ${Object.entries(SPECIES).map(([key, s], i) => `
          <button class="starter" data-species="${key}" aria-pressed="false">
            <span class="starter__art">${creatureSvg(key, change ? 2 : 1)}</span>
            <span class="starter__name">${s.name}</span>
            <span class="starter__line">${s.tagline}</span>
          </button>`).join('')}
      </div>
      <button class="cta" id="begin" disabled>Pick one to ${change ? 'switch' : 'begin'}</button>
    </div>`;

  return new Promise((resolve) => {
    let chosen = null;
    const cta = host.querySelector('#begin');

    host.querySelectorAll('.starter').forEach((card) => {
      card.addEventListener('pointerdown', () => {
        chosen = card.dataset.species;
        host.querySelectorAll('.starter').forEach((c) => {
          const picked = c === card;
          c.classList.toggle('picked', picked);
          c.setAttribute('aria-pressed', String(picked));
        });
        if (!reduced.matches) {
          card.querySelector('#body-group')?.animate(
            [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }],
            { duration: 500, easing: 'cubic-bezier(0.22, 1.4, 0.36, 1)' },
          );
        }
        cta.disabled = false;
        cta.textContent = `${verb} ${SPECIES[chosen].name}`;
        haptic('light');   // sound stays off until the opt-in after first completion (§6)
      });
    });

    cta.addEventListener('click', () => {
      if (!chosen) return;
      host.classList.add('leaving');

      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        host.innerHTML = '';
        host.classList.remove('leaving');
        resolve(chosen);
      };
      // transitionend is the fast path; the timer guarantees the user never gets stuck behind a
      // transition that did not fire (throttled tab, interrupted animation, reduced motion).
      host.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 400);
    });
  });
}
