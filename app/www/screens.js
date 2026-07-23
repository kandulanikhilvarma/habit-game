// Journey and You. Both are deliberately thin at Gate 1: the real analytics screen (heatmap,
// time-of-day curve, per-habit trends) is Gate 2 and needs completion history to say anything true.

import { levelFromTotalXp, stageForLevel, attunementFrom, lineageFor } from './game-math.js';
import { heatmap, successRate, trend, bestHourInsight, hourLabel } from './analytics.js';
import { SPECIES, LINEAGE_STYLE } from './creature.js';

const TREND_ICON = { up: '↗', down: '↘', flat: '→' };

const STAGE_NAMES = ['Egg', 'Hatchling', 'Sprite', 'Guardian', 'Radiant'];
const CATEGORY_REGION = { mind: 'grove', body: 'forge', order: 'crystal garden' };

export function renderJourney(host, state) {
  const log = state.log ?? [];
  const totalDone = state.habits.reduce((sum, h) => sum + h.total, 0);

  host.innerHTML = `
    <h2 class="screen__title">Journey</h2>
    <div class="stats">
      ${stat('Current streak', `${state.gStreak}`, state.gStreak === 1 ? 'day' : 'days')}
      ${stat('Best streak', `${state.gBest}`, state.gBest === 1 ? 'day' : 'days')}
      ${stat('Completions', `${totalDone}`, 'all time')}
      ${stat('Freezes banked', `${state.freezes}`, 'of 2')}
    </div>

    <h3 class="screen__sub">Last 5 months</h3>
    ${heatmapMarkup(heatmap(log, { days: 150 }))}

    ${bestHourMarkup(bestHourInsight(log))}

    <h3 class="screen__sub">Per habit</h3>
    <ul class="habit-stats">
      ${state.habits.map((h) => habitStatMarkup(h, log)).join('')}
    </ul>`;
}

function habitStatMarkup(h, log) {
  const r = successRate(log, h, { windowDays: 30 });
  const t = trend(log, h, { windowDays: 14 });
  const pct = Math.round(r.rate * 100);
  return `
    <li class="habit-stat">
      <span class="habit-stat__glyph">${h.glyph}</span>
      <span class="habit-stat__name">${h.name}</span>
      <span class="habit-stat__num">${pct}%<small> 30d</small></span>
      <span class="habit-stat__trend trend--${t}">${TREND_ICON[t]}</span>
    </li>`;
}

// GitHub-style cells, coloured by count. Rendered complete and instantly — this is data the user
// reads, so it never animates in (DESIGN_MOTION_SPEC §3 part 2 rejection list).
function heatmapMarkup(cells) {
  const dots = cells.map((c) => {
    const level = c.count === 0 ? 0 : Math.min(4, c.count);
    return `<span class="heat heat--${level}" title="${c.date}: ${c.count}"></span>`;
  }).join('');
  return `<div class="heatmap" role="img" aria-label="Completion history, last 150 days">${dots}</div>`;
}

function bestHourMarkup(insight) {
  if (!insight) {
    return `<p class="screen__note">A few more days of completions and your best-hour insight appears here.</p>`;
  }
  const share = Math.round(insight.morningShare * 100);
  const line = share >= 50
    ? `You win mornings — ${share}% of your wins land before 9am.`
    : `Your peak hour is ${hourLabel(insight.peakHour)}. Only ${share}% of wins are before 9am.`;
  return `
    <div class="card">
      <p class="card__label">Best hour</p>
      <p class="card__value">${hourLabel(insight.peakHour)}</p>
      <p class="card__meta">${line}</p>
    </div>`;
}

export function renderYou(host, state, identity = { anonymous: true }) {
  const { level, into, need } = levelFromTotalXp(state.creature.xp);
  const stage = stageForLevel(level);
  const species = SPECIES[state.creature.species] ?? SPECIES.kumo;
  const att = attunementFrom(state.habits);
  const lineage = lineageFor(att);
  const lineageName = LINEAGE_STYLE[lineage]?.name ?? 'Prismatic';
  const stageLabel = stage >= 3 ? `${lineageName} ${STAGE_NAMES[stage - 1]}` : STAGE_NAMES[stage - 1];

  host.innerHTML = `
    <h2 class="screen__title">You</h2>
    <div class="card">
      <p class="card__label">Your creature</p>
      <p class="card__value">${state.creature.name} · ${stageLabel}</p>
      <p class="card__meta">Level ${level} · ${into}/${need} XP · affinity for ${species.affinity} habits</p>
      ${(state.badges ?? []).includes('rekindled')
        ? '<p class="badge">Rekindled — you came back</p>'
        : ''}
    </div>

    <div class="card">
      <p class="card__label">Attunement</p>
      ${attunementBars(att)}
      <p class="card__meta">${lineageBlurb(stage, lineageName, att)}</p>
    </div>

    <div class="card">
      <p class="card__label">Habits</p>
      <ul class="plain-list">
        ${state.habits.map((h) => `
          <li class="habit-row" data-delete="${h.id}">
            <span class="habit-row__fill" aria-hidden="true"></span>
            <span class="habit-row__text">${h.glyph} ${h.name}</span>
            ${h.reminder ? `<span class="habit-row__time">${h.reminder}</span>` : ''}
          </li>`).join('')}
      </ul>
      <p class="card__meta">Press and hold a habit for a second to remove it.</p>
    </div>

    <div class="card">
      <p class="card__label">Account</p>
      ${accountBlock(identity)}
    </div>

    <p class="screen__note">Nothing here leaves your phone except completion events.</p>`;
}

// Anonymous by default; signing in with Google links this account so progress carries over.
function accountBlock(identity) {
  if (identity.anonymous) {
    return `
      <p class="card__meta">You are playing as a guest. Sign in to keep your creature safe across devices.</p>
      <button class="cta cta--google" id="google-signin">Sign in with Google</button>`;
  }
  return `
    <p class="card__value">${identity.name || identity.email || 'Signed in'}</p>
    <p class="card__meta">${identity.email || ''}</p>
    <button class="ask__btn" id="sign-out">Sign out</button>`;
}

// The blend the creature's later form is chosen from. Bars, not numbers — the shape is the point.
function attunementBars(att) {
  const total = (att.mind + att.body + att.order) || 1;
  const rows = [
    ['Mind', att.mind, 'var(--violet)'],
    ['Body', att.body, 'var(--flame)'],
    ['Order', att.order, 'var(--mint)'],
  ];
  return `<div class="attune">${rows.map(([label, val, color]) => `
    <span class="attune__label">${label}</span>
    <span class="attune__track"><span class="attune__fill" style="width:${Math.round((val / total) * 100)}%;background:${color}"></span></span>
    <span class="attune__val">${val}</span>`).join('')}</div>`;
}

function lineageBlurb(stage, lineageName, att) {
  if (stage < 3) {
    const lead = Object.entries(att).sort((a, b) => b[1] - a[1])[0];
    const region = lead && lead[1] > 0 ? CATEGORY_REGION[lead[0]] : null;
    return region
      ? `Your ${region} is leading. Which habits you keep shapes what your creature becomes at stage 3.`
      : 'Keep habits in different categories and the blend will choose your creature’s branch at stage 3.';
  }
  return `Your habits chose the ${lineageName} branch — no two lives make the same creature.`;
}

function stat(label, value, unit) {
  return `
    <div class="stat">
      <span class="stat__value">${value}</span>
      <span class="stat__unit">${unit}</span>
      <span class="stat__label">${label}</span>
    </div>`;
}
