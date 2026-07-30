// Habit creation and removal. The sheet surface itself is sheet.js — this is only its contents.

import { DAY_LABELS, DAY_NAMES, scheduleLabel } from './schedule.js';
import { habitIcons, habitGlyph } from './icons.js';

export const MAX_HABITS = 7;          // MASTER_PLAN §3.5: cap total at 7, "master these first"

// Templates keep adding a habit to ≤3 taps. Glyphs are user content, which is the one place
// emoji are allowed (DESIGN_MOTION_SPEC §2).
export const TEMPLATES = [
  { name: 'Read 20 minutes', glyph: 'book', category: 'mind' },
  { name: 'Meditate 10 minutes', glyph: 'lotus', category: 'mind' },
  { name: 'Journal', glyph: 'pen', category: 'mind' },
  { name: 'Morning workout', glyph: 'run', category: 'body' },
  { name: '10,000 steps', glyph: 'walk', category: 'body' },
  { name: 'Drink water', glyph: 'water', category: 'body' },
  { name: 'Sleep by 11pm', glyph: 'moon', category: 'order' },
  { name: 'Less Instagram', glyph: 'phoneOff', category: 'order' },
];

const GLYPHS = Object.keys(habitIcons);
const CATEGORIES = [
  ['mind', 'Mind'],
  ['body', 'Body'],
  ['order', 'Order'],
];

// Doubles as the add and edit sheet: pass an existing habit to pre-fill and switch to edit copy.
export function sheetMarkup(habitCount, habit = null) {
  const editing = !!habit;
  const remaining = MAX_HABITS - habitCount;
  const glyph = habit?.glyph ?? GLYPHS[0];
  const category = habit?.category ?? CATEGORIES[0][0];
  const days = Array.isArray(habit?.days) ? habit.days : [];
  return `
    <div class="sheet__handle" aria-hidden="true"></div>
    <h2 class="sheet__title">${editing ? 'Edit quest' : 'New habit quest'}</h2>
    ${editing
      ? ''
      : `<p class="sheet__note">${remaining} of ${MAX_HABITS} slots left. Fewer habits, kept longer, beats more habits dropped.</p>
    <p class="field__label">Start from a template</p>
    <div class="chips">
      ${TEMPLATES.map((t, i) => `
        <button type="button" class="chip-btn" data-template="${i}">${habitGlyph(t.glyph)} ${t.name}</button>`).join('')}
    </div>`}

    <label class="field">
      <span class="field__label">${editing ? 'Name' : 'Or name your own'}</span>
      <input class="field__input" id="habit-name" type="text" maxlength="40" placeholder="Walk the dog"
             value="${habit ? escapeAttr(habit.name) : ''}" autocomplete="off">
    </label>

    <p class="field__label">Icon</p>
    <div class="glyph-grid" id="glyph-grid">
      ${GLYPHS.map((g) => `
        <button type="button" class="glyph${g === glyph ? ' on' : ''}" data-glyph="${g}" aria-pressed="${g === glyph}" aria-label="${g}">${habitGlyph(g)}</button>`).join('')}
    </div>

    <p class="field__label">Category</p>
    <div class="segmented" id="category">
      ${CATEGORIES.map(([key, label]) => `
        <button type="button" class="segment${key === category ? ' on' : ''}" data-category="${key}" aria-pressed="${key === category}">${label}</button>`).join('')}
    </div>

    <div class="field">
      <span class="field__label">Which days</span>
      <div class="days" id="habit-days" role="group" aria-label="Days this habit runs">
        ${DAY_LABELS.map((label, i) => {
          const on = !days.length || days.includes(i);
          return `<button type="button" class="day${on ? ' on' : ''}" data-day="${i}"
                    aria-pressed="${on}" aria-label="${DAY_NAMES[i]}">${label}</button>`;
        }).join('')}
      </div>
      <p class="days-summary" id="days-summary">${scheduleLabel(days)}</p>
    </div>

    <label class="field">
      <span class="field__label">Remind me (optional)</span>
      <input class="field__input" id="habit-reminder" type="time" value="${habit?.reminder ?? ''}" autocomplete="off">
    </label>

    <label class="field">
      <span class="field__label">Why this matters (optional)</span>
      <input class="field__input" id="habit-goal" type="text" maxlength="60" placeholder="e.g. sleep better, pass the exam"
             value="${habit ? escapeAttr(habit.goal ?? '') : ''}" autocomplete="off">
    </label>

    <button class="btn btn--primary btn--block" id="add-habit"${editing ? '' : ' disabled'}>${editing ? 'Save changes' : 'Add quest'}</button>`;
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** True when a habit with this name already exists (case- and space-insensitive). */
export function isDuplicateName(name, existing) {
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const target = norm(name);
  return existing.some((h) => norm(h.name) === target);
}

/** Slug that stays stable and unique against the habits already stored. */
export function habitId(name, existing) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'habit';
  if (!existing.some((h) => h.id === base)) return base;
  let n = 2;
  while (existing.some((h) => h.id === `${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function makeHabit({ name, glyph, category, reminder = null, goal = null, days = [] }, existing) {
  return {
    id: habitId(name, existing),
    name: name.trim(),
    glyph,
    category,
    reminder: reminder || null,
    goal: goal || null,
    // Empty means every day — the shape every habit had before schedules existed.
    days: days.length === 7 ? [] : days,
    streak: 0,
    best: 0,
    total: 0,
    createdAt: Date.now(),
  };
}
