// Journey and You. Both are deliberately thin at Gate 1: the real analytics screen (heatmap,
// time-of-day curve, per-habit trends) is Gate 2 and needs completion history to say anything true.

import { levelFromTotalXp, stageForLevel } from './game-math.js';
import { SPECIES } from './creature.js';

const STAGE_NAMES = ['Egg', 'Hatchling', 'Sprite', 'Guardian', 'Radiant'];

export function renderJourney(host, state) {
  const { level } = levelFromTotalXp(state.creature.xp);
  const totalDone = state.habits.reduce((sum, h) => sum + h.total, 0);

  host.innerHTML = `
    <h2 class="screen__title">Journey</h2>
    <div class="stats">
      ${stat('Current streak', `${state.gStreak}`, state.gStreak === 1 ? 'day' : 'days')}
      ${stat('Best streak', `${state.gBest}`, state.gBest === 1 ? 'day' : 'days')}
      ${stat('Completions', `${totalDone}`, 'all time')}
      ${stat('Freezes banked', `${state.freezes}`, 'of 2')}
    </div>

    <h3 class="screen__sub">Per habit</h3>
    <ul class="habit-stats">
      ${state.habits.map((h) => `
        <li class="habit-stat">
          <span class="habit-stat__glyph">${h.glyph}</span>
          <span class="habit-stat__name">${h.name}</span>
          <span class="habit-stat__num">${h.total}<small> done</small></span>
          <span class="habit-stat__num">${h.best}<small> best</small></span>
        </li>`).join('')}
    </ul>

    <p class="screen__note">
      Heatmap, best-hour insight and trend lines arrive at Gate 2 — they need more days of history
      than you have yet. Every completion is already being recorded for them.
    </p>`;
}

export function renderYou(host, state) {
  const { level, into, need } = levelFromTotalXp(state.creature.xp);
  const stage = stageForLevel(level);
  const species = SPECIES[state.creature.species] ?? SPECIES.kumo;

  host.innerHTML = `
    <h2 class="screen__title">You</h2>
    <div class="card">
      <p class="card__label">Your creature</p>
      <p class="card__value">${state.creature.name} · ${STAGE_NAMES[stage - 1]}</p>
      <p class="card__meta">Level ${level} · ${into}/${need} XP · affinity for ${species.affinity} habits</p>
    </div>

    <div class="card">
      <p class="card__label">Habits</p>
      <ul class="plain-list">
        ${state.habits.map((h) => `
          <li class="habit-row" data-delete="${h.id}">
            <span class="habit-row__fill" aria-hidden="true"></span>
            <span class="habit-row__text">${h.glyph} ${h.name}</span>
          </li>`).join('')}
      </ul>
      <p class="card__meta">Press and hold a habit for a second to remove it.</p>
    </div>

    <p class="screen__note">
      Sound, reminders and account settings are still being built. Nothing here leaves your phone
      except completion events.
    </p>`;
}

function stat(label, value, unit) {
  return `
    <div class="stat">
      <span class="stat__value">${value}</span>
      <span class="stat__unit">${unit}</span>
      <span class="stat__label">${label}</span>
    </div>`;
}
