// Journey and You. Both are deliberately thin at Gate 1: the real analytics screen (heatmap,
// time-of-day curve, per-habit trends) is Gate 2 and needs completion history to say anything true.

import { levelFromTotalXp, stageForLevel, attunementFrom, lineageFor } from './game-math.js';
import { heatmap, successRate, trend, bestHourInsight, weekdayWeekendSplit, hourLabel } from './analytics.js';
import { weeklyLetter } from './letter.js';
import { SPECIES, LINEAGE_STYLE } from './creature.js';
import { scheduleLabel } from './schedule.js';

const TREND_ICON = { up: '↗', down: '↘', flat: '→' };

const STAGE_NAMES = ['Egg', 'Hatchling', 'Sprite', 'Guardian', 'Radiant'];
const CATEGORY_REGION = { mind: 'grove', body: 'forge', order: 'crystal garden' };

export function renderJourney(host, state) {
  const log = state.log ?? [];
  const totalDone = state.habits.reduce((sum, h) => sum + h.total, 0);

  const notes = state.notes ?? [];
  const letter = weeklyLetter(log, state.creature.name, Date.now(), notes);

  host.innerHTML = `
    <h2 class="screen__title">Journey</h2>

    ${letter ? `
    <div class="card letter">
      <p class="card__label">${escapeHtml(letter.title)}</p>
      ${letter.lines.map((l) => `<p class="letter__line">${escapeHtml(l)}</p>`).join('')}
    </div>` : ''}

    <div class="stats">
      ${stat('Current streak', `${state.gStreak}`, state.gStreak === 1 ? 'day' : 'days')}
      ${stat('Best streak', `${state.gBest}`, state.gBest === 1 ? 'day' : 'days')}
      ${stat('Completions', `${totalDone}`, 'all time')}
      ${stat('Freezes banked', `${state.freezes}`, 'of 2')}
    </div>

    <h3 class="screen__sub">Last two weeks</h3>
    ${barsMarkup(heatmap(log, { days: 14 }))}
    ${weekOverWeekMarkup(heatmap(log, { days: 14 }))}

    ${memoriesMarkup(notes, state.day.date)}

    ${log.length >= 21 ? `<h3 class="screen__sub">The long view</h3>${heatmapMarkup(heatmap(log, { days: 84 }))}` : ''}

    ${bestHourMarkup(bestHourInsight(log))}
    ${weekdayMarkup(weekdayWeekendSplit(log), log.length)}

    <h3 class="screen__sub">Per habit</h3>
    <ul class="habit-stats">
      ${state.habits.map((h) => habitStatMarkup(h, log)).join('')}
    </ul>`;
}

// A private journal (§3.5). One entry per day, kept on the device with everything else, and read
// back by the creature in the weekly letter — a diary nothing ever quotes is just typing.
function memoriesMarkup(notes, today) {
  const todayNote = notes.find((n) => n.date === today)?.text ?? '';
  const past = notes.filter((n) => n.date !== today && n.text?.trim())
    .sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  return `
    <div class="card">
      <p class="card__label">Memories</p>
      <label class="field">
        <span class="field__label">Anything worth remembering about today?</span>
        <input class="field__input" id="memory" type="text" maxlength="140"
               placeholder="Ran in the rain and liked it" value="${escapeAttr(todayNote)}" autocomplete="off">
      </label>
      ${past.length ? `<ul class="plain-list">${past.map((n) => `
        <li class="card__meta">${n.date} · ${escapeHtml(n.text)}</li>`).join('')}</ul>` : ''}
    </div>`;
}

function escapeHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(t) {
  return escapeHtml(t).replace(/"/g, '&quot;');
}

// The graph the numbers alone never gave: fourteen days, one bar each, so a good run or a dip is
// visible at a glance instead of inferred from a grid of squares.
function barsMarkup(cells) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const W = 320;
  const H = 76;
  const gap = 5;
  const bw = (W - gap * (cells.length - 1)) / cells.length;
  const bars = cells.map((c, i) => {
    const h = c.count === 0 ? 3 : Math.max(6, Math.round((c.count / max) * H));
    const x = i * (bw + gap);
    const today = i === cells.length - 1;
    return `<rect x="${x.toFixed(1)}" y="${H - h}" width="${bw.toFixed(1)}" height="${h}" rx="3"
      fill="${c.count === 0 ? 'var(--border)' : 'var(--mint)'}" opacity="${today ? 1 : c.count === 0 ? 0.7 : 0.85}">
      <title>${c.date}: ${c.count}</title></rect>`;
  }).join('');
  const label = (i) => new Date(`${cells[i].date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
  return `
    <div class="card chart">
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img"
           aria-label="Completions per day for the last fourteen days">${bars}</svg>
      <div class="chart__axis"><span>${label(0)}</span><span>${label(cells.length - 1)} (today)</span></div>
    </div>`;
}

// A number only means something next to another number. This is the one comparison that answers
// "am I actually doing better?", which is the question that brings someone back tomorrow.
function weekOverWeekMarkup(cells) {
  const half = Math.floor(cells.length / 2);
  const before = cells.slice(0, half).reduce((n, c) => n + c.count, 0);
  const now = cells.slice(half).reduce((n, c) => n + c.count, 0);
  if (before + now === 0) {
    return `<p class="screen__note">Complete a quest and your first week starts here.</p>`;
  }
  const diff = now - before;
  const word = diff > 0 ? 'up' : diff < 0 ? 'down' : 'level';
  const line = diff === 0
    ? `Same as the week before. Holding steady counts.`
    : `${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'completion' : 'completions'} ${word} on the week before.`;
  return `
    <div class="card">
      <p class="card__label">This week</p>
      <p class="card__value">${now} completed <span class="trend--${diff >= 0 ? 'up' : 'down'}">${diff > 0 ? '↗' : diff < 0 ? '↘' : '→'}</span></p>
      <p class="card__meta">${line}</p>
    </div>`;
}

function habitStatMarkup(h, log) {
  const r = successRate(log, h, { windowDays: 30 });
  const t = trend(log, h, { windowDays: 14 });
  const pct = Math.round(r.rate * 100);
  return `
    <li class="habit-stat">
      <span class="habit-stat__glyph">${h.glyph}</span>
      <span class="habit-stat__name">${escapeHtml(h.name)}</span>
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

// Weekday vs weekend: a simple "best conditions" read (§4.4 item 4). Per-day averages so a 5:2
// day split doesn't fake a weekday bias. Needs a little history to say anything.
function weekdayMarkup(split, logLen) {
  if (logLen < 21) return '';   // under three weeks this is a coin flip with a sentence attached
  const wdAvg = split.weekday / 5;
  const weAvg = split.weekend / 2;
  let line;
  if (wdAvg >= weAvg * 1.3) line = 'Weekdays are your strong stretch. Routine is working for you.';
  else if (weAvg >= wdAvg * 1.3) line = 'Weekends carry you. Weekdays are where the next win is.';
  else line = 'You keep an even rhythm across the whole week.';
  return `
    <div class="card">
      <p class="card__label">Weekdays vs weekends</p>
      <p class="card__meta">${line}</p>
    </div>`;
}

function bestHourMarkup(insight) {
  if (!insight) {
    return `<p class="screen__note">Keep going. Once there are a couple of weeks of history, your best time of day appears here.</p>`;
  }
  const morning = Math.round(insight.morningShare * 100);
  const evening = Math.round(insight.eveningShare * 100);
  let line;
  if (morning >= 50) line = `Mornings are when you win. ${morning}% of your completions land before 11am.`;
  else if (evening >= 50) line = `Evenings are when you win. ${evening}% of your completions land after 5pm.`;
  else line = `Your completions are spread through the day, with ${hourLabel(insight.peakHour)} slightly ahead.`;
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
      <p class="card__value">${escapeHtml(state.creature.name)} · ${stageLabel}</p>
      <p class="card__meta">Level ${level} · ${into}/${need} XP · affinity for ${species.affinity} habits</p>
      ${(state.badges ?? []).includes('rekindled')
        ? '<p class="badge">Rekindled. You came back.</p>'
        : ''}
      <div class="btn-row">
        <button class="ask__btn" id="rename-creature">Rename</button>
        <button class="ask__btn" id="change-creature">Change creature</button>
      </div>
      <button class="cta share-btn" id="share-dna">Share your creature</button>
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
            <span class="habit-row__text">
              ${h.glyph} ${escapeHtml(h.name)}
              ${h.goal ? `<span class="habit-row__goal">Why: ${escapeHtml(h.goal)} · ${h.total} day${h.total === 1 ? '' : 's'} in</span>` : ''}
              <span class="habit-row__goal">${scheduleLabel(h.days)}</span>
            </span>
            ${h.reminder ? `<span class="habit-row__time">${h.reminder}</span>` : ''}
          </li>`).join('')}
      </ul>
      <p class="card__meta">Tap a habit to edit it, or press and hold to remove it.</p>
    </div>

    <div class="card">
      <p class="card__label">Appearance</p>
      <div class="segmented" id="theme">
        <button type="button" class="segment${(state.settings.theme || 'dark') === 'dark' ? ' on' : ''}" data-theme-choice="dark" aria-pressed="${(state.settings.theme || 'dark') === 'dark'}">Dark</button>
        <button type="button" class="segment${state.settings.theme === 'light' ? ' on' : ''}" data-theme-choice="light" aria-pressed="${state.settings.theme === 'light'}">Light</button>
      </div>
    </div>

    <div class="card">
      <p class="card__label">Account</p>
      ${accountBlock(identity)}
      <div class="btn-row">
        <button class="ask__btn" id="export-data">Download my data</button>
      </div>
      <button class="danger-btn" id="delete-account">Delete my account</button>
    </div>

    <div class="card">
      <p class="card__label">Feedback</p>
      <p class="card__meta">Something broken, or an idea? It goes straight to the person who builds this.</p>
      <button class="cta cta--quiet" id="send-feedback">Send feedback</button>
    </div>

    <div class="card">
      <p class="card__label">Automation (advanced)</p>
      ${state.webhookToken
        ? `<p class="card__meta">Complete a habit from IFTTT, Tasker or a script:</p>
           <pre class="code">POST /api/v1/complete
{"token":"${state.webhookToken}","habit_id":"${state.habits[0]?.id ?? 'read'}"}</pre>
           <div class="btn-row"><button class="ask__btn" id="regen-token">Regenerate token</button></div>`
        : `<p class="card__meta">Generate a token to complete habits from IFTTT, Tasker, or your own scripts.</p>
           <div class="btn-row"><button class="ask__btn" id="gen-token">Generate webhook token</button></div>`}
    </div>

    `;
}

// Anonymous by default; signing in with Google links this account so progress carries over.
function accountBlock(identity) {
  if (identity.anonymous) {
    return `
      <p class="card__meta">Sign in to keep your creature safe across devices.</p>
      <button class="cta cta--google" id="google-signin">Sign in with Google</button>`;
  }
  // Show the name as the heading; only add the email underneath when it is a distinct second line.
  const heading = identity.name || identity.email || 'Signed in';
  const sub = identity.name && identity.email ? identity.email : '';
  return `
    <p class="card__value">${heading}</p>
    ${sub ? `<p class="card__meta">${sub}</p>` : ''}
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
  return `Your habits chose the ${lineageName} branch. No two lives make the same creature.`;
}

function stat(label, value, unit) {
  return `
    <div class="stat">
      <span class="stat__value">${value}</span>
      <span class="stat__unit">${unit}</span>
      <span class="stat__label">${label}</span>
    </div>`;
}
