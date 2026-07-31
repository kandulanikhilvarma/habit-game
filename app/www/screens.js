// Journey and You. Both are deliberately thin at Gate 1: the real analytics screen (heatmap,
// time-of-day curve, per-habit trends) is Gate 2 and needs completion history to say anything true.

import { levelFromTotalXp, stageForLevel, attunementFrom, lineageFor } from './game-math.js';
import { heatmap, successRate, trend, bestHourInsight, weekdayWeekendSplit, hourLabel, habitGrid, rollingRate } from './analytics.js';
import { weeklyLetter } from './letter.js';
import { SPECIES, LINEAGE_STYLE } from './creature.js';
import { scheduleLabel } from './schedule.js';
import { habitGlyph } from './icons.js';

const TREND_ICON = { up: '↗', down: '↘', flat: '→' };

const STAGE_NAMES = ['Egg', 'Hatchling', 'Sprite', 'Guardian', 'Radiant'];
const CATEGORY_REGION = { mind: 'grove', body: 'forge', order: 'crystal garden' };

export function renderJourney(host, state) {
  const view = state.settings?.chart ?? 'days';
  const log = state.log ?? [];
  const totalDone = state.habits.reduce((sum, h) => sum + h.total, 0);

  const notes = state.notes ?? [];
  const letter = weeklyLetter(log, state.creature.name, Date.now(), notes);

  if (log.length === 0) {
    host.innerHTML = `
      <h2 class="screen__title">Journey</h2>
      <div class="card empty">
        <p class="card__value">Nothing to show yet, and that is fine.</p>
        <p class="card__meta">Tick a quest on Home and this fills in: how the fortnight went, which
          habit is carrying you, and a note from ${escapeHtml(state.creature.name)} each week.</p>
      </div>`;
    return;
  }

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
    ${chartSwitcher(view)}
    ${view === 'habits' ? gridMarkup(habitGrid(log, state.habits, { days: 14 }))
      : view === 'trend' ? trendMarkup(rollingRate(log, state.habits, { days: 14 }))
      : barsMarkup(heatmap(log, { days: 14 }))}
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

// Three ways to read the same fortnight, because the questions are different: how much did I do
// (days), which habit is slipping (habits), and am I trending up (trend).
const CHART_VIEWS = [['days', 'Days'], ['habits', 'Habits'], ['trend', 'Trend']];
function chartSwitcher(view) {
  return `
    <div class="segmented" id="chart-view" role="tablist" aria-label="Chart type">
      ${CHART_VIEWS.map(([key, label]) => `
        <button type="button" class="segment${key === view ? ' on' : ''}" data-chart="${key}"
                role="tab" aria-selected="${key === view}">${label}</button>`).join('')}
    </div>`;
}

// Columns, with a faint track behind each. Without the track an empty fortnight rendered as a row
// of short dashes that read as fourteen failures rather than as a chart with nothing in it yet.
function barsMarkup(cells) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const W = 320, H = 76, gap = 5;
  const bw = (W - gap * (cells.length - 1)) / cells.length;
  const marks = cells.map((c, i) => {
    const x = (i * (bw + gap)).toFixed(1);
    const h = c.count === 0 ? 0 : Math.max(6, Math.round((c.count / max) * H));
    const track = `<rect x="${x}" y="0" width="${bw.toFixed(1)}" height="${H}" rx="4"
      fill="var(--surface-raised)" opacity="0.6"/>`;
    const bar = c.count === 0 ? '' : `<rect x="${x}" y="${H - h}" width="${bw.toFixed(1)}" height="${h}" rx="4"
      fill="var(--mint)" opacity="${i === cells.length - 1 ? 1 : 0.85}"/>`;
    return `<g><title>${c.date}: ${c.count} completed</title>${track}${bar}</g>`;
  }).join('');
  const label = (i) => new Date(`${cells[i].date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
  const total = cells.reduce((n, c) => n + c.count, 0);
  return `
    <div class="card chart">
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img"
           aria-label="Completions per day for the last fourteen days, ${total} in total">${marks}</svg>
      <div class="chart__axis"><span>${label(0)}</span><span>${label(cells.length - 1)} (today)</span></div>
    </div>`;
}

// A grid: habits down, days across. The one view that answers "which habit am I dropping".
function gridMarkup(rows) {
  if (!rows.length) return `<p class="screen__note">Add a habit and this fills in.</p>`;
  const days = rows[0].cells.length;
  return `
    <div class="card chart">
      <div class="grid-chart" style="--cols:${days}">
        ${rows.map((r) => `
          <span class="grid-chart__name" title="${escapeAttr(r.habit.name)}">${habitGlyph(r.habit.glyph)}</span>
          ${r.cells.map((c) => `<span class="grid-cell${c.done ? ' is-done' : c.scheduled ? '' : ' is-rest'}"
             title="${escapeAttr(r.habit.name)} · ${c.date}${c.done ? ' · done' : c.scheduled ? ' · missed' : ' · rest day'}"></span>`).join('')}
        `).join('')}
      </div>
      <div class="chart__axis"><span>14 days ago</span><span>today</span></div>
    </div>`;
}

// A rate over a trailing week, so the shape stays readable when the daily counts are too sparse
// to have one, and so adding a habit does not look like a sudden improvement.
function trendMarkup(points) {
  if (!points.some((p) => p.due)) {
    return `<p class="screen__note">Once a few days are in, your seven-day rate draws itself here.</p>`;
  }
  const W = 320, H = 76, pad = 4;
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (r) => pad + (1 - r) * (H - pad * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.rate).toFixed(1)}`).join('');
  const area = `${line}L${W},${H}L0,${H}Z`;
  const last = points.at(-1);
  return `
    <div class="card chart">
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img"
           aria-label="Seven-day completion rate, currently ${Math.round(last.rate * 100)} percent">
        <path d="${area}" fill="var(--mint)" opacity="0.14"/>
        <path d="${line}" fill="none" stroke="var(--mint)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(last.rate).toFixed(1)}" r="4" fill="var(--mint)"/>
      </svg>
      <div class="chart__axis"><span>7-day rate</span><span>${Math.round(last.rate * 100)}% now</span></div>
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
      <span class="habit-stat__glyph">${habitGlyph(h.glyph)}</span>
      <span class="habit-stat__name">${escapeHtml(h.name)}</span>
      <span class="habit-stat__num">${pct}%<small> 30d</small></span>
      <span class="habit-stat__trend trend--${t}">${TREND_ICON[t]}</span>
    </li>`;
}

// GitHub-style cells, coloured by count. Rendered complete and instantly — this is data the user
// reads, so it never animates in (DESIGN_MOTION_SPEC §3 part 2 rejection list).
function heatmapMarkup(cells) {
  const span = cells.length;
  const dots = cells.map((c) => {
    const level = c.count === 0 ? 0 : Math.min(4, c.count);
    return `<span class="heat heat--${level}" title="${c.date}: ${c.count}"></span>`;
  }).join('');
  return `<div class="heatmap" role="img" aria-label="Completion history, last ${span} days">${dots}</div>`;
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
        <button class="btn btn--secondary" id="rename-creature">Rename</button>
        <button class="btn btn--secondary" id="change-creature">Change creature</button>
      </div>
      <button class="btn btn--primary btn--block" id="share-dna">Share your creature</button>
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
              ${habitGlyph(h.glyph)} ${escapeHtml(h.name)}
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
        <button type="button" class="segment${(state.settings.theme || 'light') === 'dark' ? ' on' : ''}" data-theme-choice="dark" aria-pressed="${(state.settings.theme || 'light') === 'dark'}">Dark</button>
        <button type="button" class="segment${state.settings.theme === 'light' ? ' on' : ''}" data-theme-choice="light" aria-pressed="${state.settings.theme === 'light'}">Light</button>
      </div>
    </div>

    <div class="card">
      <p class="card__label">Account</p>
      ${accountBlock(identity)}
      <div class="btn-row">
        ${identity.anonymous ? '' : '<button class="btn btn--secondary" id="export-data">Download my data</button>'}
        <button class="btn btn--secondary" id="send-feedback">Send feedback</button>
      </div>
      ${identity.anonymous
        ? `<button class="btn btn--danger btn--block" id="start-over">Start over</button>
           <p class="card__meta">Erases this creature and every habit on this device. There is no
              account to delete yet, because you are playing as a guest.</p>`
        : `<button class="btn btn--danger btn--block" id="delete-account">Delete my account</button>`}
    </div>

    <details class="card card--fold">
      <summary class="card__label">Automation for advanced users</summary>
      ${state.webhookToken
        ? `<p class="card__meta">Complete a habit from IFTTT, Tasker or a script:</p>
           <pre class="code">POST /api/v1/complete
{"token":"${state.webhookToken}","habit_id":"${state.habits[0]?.id ?? 'read'}"}</pre>
           <div class="btn-row"><button class="btn btn--secondary" id="regen-token">Regenerate token</button></div>`
        : `<p class="card__meta">Generate a token to complete habits from IFTTT, Tasker, or your own scripts.</p>
           <div class="btn-row"><button class="btn btn--secondary" id="gen-token">Generate webhook token</button></div>`}
    </details>

    `;
}

// Anonymous by default; signing in with Google links this account so progress carries over.
function accountBlock(identity) {
  if (identity.anonymous) {
    return `
      <p class="card__meta">Sign in to keep your creature safe across devices.</p>
      <button class="btn btn--google btn--block" id="google-signin">Sign in with Google</button>`;
  }
  // Show the name as the heading; only add the email underneath when it is a distinct second line.
  const heading = identity.name || identity.email || 'Signed in';
  const sub = identity.name && identity.email ? identity.email : '';
  return `
    <p class="card__value">${heading}</p>
    ${sub ? `<p class="card__meta">${sub}</p>` : ''}
    <button class="btn btn--secondary" id="sign-out">Sign out</button>`;
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
    <span class="attune__track"><span class="attune__fill" style="transform:scaleX(${(val / total).toFixed(3)});background:${color}"></span></span>
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
