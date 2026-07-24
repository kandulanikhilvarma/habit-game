// Habit creation and removal. The sheet surface itself is sheet.js — this is only its contents.

export const MAX_HABITS = 7;          // MASTER_PLAN §3.5: cap total at 7, "master these first"

// Templates keep adding a habit to ≤3 taps. Glyphs are user content, which is the one place
// emoji are allowed (DESIGN_MOTION_SPEC §2).
export const TEMPLATES = [
  { name: 'Read 20 minutes', glyph: '📖', category: 'mind' },
  { name: 'Meditate 10 minutes', glyph: '🧘', category: 'mind' },
  { name: 'Journal', glyph: '✍️', category: 'mind' },
  { name: 'Morning workout', glyph: '🏃', category: 'body' },
  { name: '10,000 steps', glyph: '🚶', category: 'body' },
  { name: 'Drink water', glyph: '💧', category: 'body' },
  { name: 'Sleep by 11pm', glyph: '🌙', category: 'order' },
  { name: 'Less Instagram', glyph: '📵', category: 'order' },
];

const GLYPHS = ['📖', '🧘', '✍️', '🏃', '🚶', '💧', '🌙', '📵', '🎸', '🧹', '🥗', '☀️'];
const CATEGORIES = [
  ['mind', 'Mind'],
  ['body', 'Body'],
  ['order', 'Order'],
];

export function sheetMarkup(habitCount) {
  const remaining = MAX_HABITS - habitCount;
  return `
    <div class="sheet__handle" aria-hidden="true"></div>
    <h2 class="sheet__title">New habit quest</h2>
    <p class="sheet__note">${remaining} of ${MAX_HABITS} slots left. Fewer habits, kept longer, beats more habits dropped.</p>

    <p class="field__label">Start from a template</p>
    <div class="chips">
      ${TEMPLATES.map((t, i) => `
        <button type="button" class="chip-btn" data-template="${i}">${t.glyph} ${t.name}</button>`).join('')}
    </div>

    <label class="field">
      <span class="field__label">Or name your own</span>
      <input class="field__input" id="habit-name" type="text" maxlength="40" placeholder="Walk the dog" autocomplete="off">
    </label>

    <p class="field__label">Icon</p>
    <div class="glyph-grid" id="glyph-grid">
      ${GLYPHS.map((g, i) => `
        <button type="button" class="glyph${i === 0 ? ' on' : ''}" data-glyph="${g}" aria-pressed="${i === 0}">${g}</button>`).join('')}
    </div>

    <p class="field__label">Category</p>
    <div class="segmented" id="category">
      ${CATEGORIES.map(([key, label], i) => `
        <button type="button" class="segment${i === 0 ? ' on' : ''}" data-category="${key}" aria-pressed="${i === 0}">${label}</button>`).join('')}
    </div>

    <label class="field">
      <span class="field__label">Remind me (optional)</span>
      <input class="field__input" id="habit-reminder" type="time" autocomplete="off">
    </label>

    <button class="cta" id="add-habit" disabled>Add quest</button>`;
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

export function makeHabit({ name, glyph, category, reminder = null }, existing) {
  return {
    id: habitId(name, existing),
    name: name.trim(),
    glyph,
    category,
    reminder: reminder || null,
    streak: 0,
    best: 0,
    total: 0,
    createdAt: Date.now(),
  };
}
