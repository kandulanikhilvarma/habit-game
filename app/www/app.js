import {
  xpForCompletion, levelFromTotalXp, stageForLevel, moodFor,
  streakAfterDay, attunementFrom, lineageFor, PERFECT_DAY_BONUS,
} from './game-math.js';
import { load, save, rollover, todayKey, dedupeHabits } from './store.js';
import { creatureSvg, creatureArt, artKeyFor, SPECIES, LINEAGE_STYLE } from './creature.js';
import { worldSvg } from './world.js';
import { scheduledOn, scheduleLabel } from './schedule.js';
import { rollEgg, decorLabel } from './eggs.js';
import { renderJourney, renderYou } from './screens.js';
import { icons, habitGlyph } from './icons.js';
import { celebrate, wakeUp, haptic, bindIdleLifecycle, randomizeBlink } from './fx.js';
import { playAdd, playRemove, playPick, playPet } from './audio.js';
import { sheetMarkup, makeHabit, isDuplicateName, TEMPLATES, MAX_HABITS } from './habits.js';
import { presentSheet } from './sheet.js';
import { initReminders, ensurePermission, syncReminders } from './reminders.js';

const el = (id) => document.getElementById(id);
let state = load();
let cloud = null;
let screen = 'home';
let identity = { anonymous: true, email: null, name: null };
let signInFn = null;   // set once cloud init resolves; called directly so the popup opens in-gesture
let cloudCtx = null;   // { db, uid } once cloud init resolves; needed for account deletion

// Theme: dark by default, light when chosen. Applied to <html> so tokens.css can override surfaces.
function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme || 'dark';
}
applyTheme();

// Sound only plays once the user has opted in; haptics fire freely (silent, and a no-op on iOS web).
const soundOn = () => state.settings.sound === true;

// One transient message, for errors and blocked actions that would otherwise fail silently.
let toastTimer = null;
function toast(message) {
  let t = el('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.append(t);
  }
  t.textContent = message;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 3200);
}

function render() {
  const { level, into, need } = levelFromTotalXp(state.creature.xp);
  const stage = stageForLevel(level);
  const done = state.day.doneIds.length;
  // Only today's habits count. A rest day should not read as an unfinished day.
  const todays = scheduledOn(state.habits, state.day.date);
  const total = todays.length;

  el('level').innerHTML = `${icons.star}<span>Lv ${level}</span>`;
  el('streak').innerHTML =
    `<span class="flame-icon" id="flame">${icons.flame}</span><span>${state.gStreak} day streak</span>`;
  el('xp-fill').style.transform = `scaleX(${(into / need).toFixed(3)})`;

  const cracks = Math.min((state.creature.cracks ?? 0) + done, 3);
  const lineage = lineageFor(attunementFrom(state.habits));
  // Awake, hatched creature = the hand-made art. Egg and the asleep/wake ceremony stay procedural
  // SVG so fx.js can animate their parts (cracks, blanket slide-off).
  el('creature').innerHTML = (!state.comeback && stage >= 2)
    ? creatureArt(artKeyFor(state.creature.species, stage, lineage))
    : creatureSvg(state.creature.species, stage, { cracks, asleep: state.comeback, lineage });
  el('glade').innerHTML = worldSvg(state);
  el('creature-name').textContent = state.creature.name;
  el('creature-stage-tag').textContent = state.comeback
    ? 'Asleep · waiting for you'
    : `${stageName(stage, lineage)} · ${moodFor(done, total)}`;

  el('today-label').textContent = `Today ${done}/${total}`;
  el('today-dots').innerHTML = todays
    .map((h) => `<span class="dot${state.day.doneIds.includes(h.id) ? ' on' : ''}"></span>`)
    .join('');

  el('quests').innerHTML = todays.map(questMarkup).join('');
  el('add-quest').hidden = state.habits.length >= MAX_HABITS;
  el('home-signin').hidden = !identity.anonymous;   // guest prompt on Home, gone once signed in
  randomizeBlink();

  if (screen === 'journey') {
    renderJourney(el('screen-journey'), state);
    const memory = el('memory');
    // `change` only fires on blur, and on a phone you often type a note and then background the app
    // or tap straight to another tab — the keystrokes were being thrown away. Persist as they type.
    if (memory) {
      let noteTimer = null;
      const writeNote = () => {
        const text = memory.value.trim();
        state.notes = (state.notes ?? []).filter((n) => n.date !== state.day.date);
        if (text) state.notes.push({ date: state.day.date, text });
        save(state);
      };
      memory.addEventListener('input', () => {
        clearTimeout(noteTimer);
        noteTimer = setTimeout(writeNote, 400);
      });
      // Belt and braces for the ways a phone can take the page away mid-sentence.
      memory.addEventListener('blur', () => {
        clearTimeout(noteTimer);
        writeNote();
        cloud?.pushAll(state).catch((err) => console.warn('cloud write queued/failed', err));
      });
      window.addEventListener('pagehide', writeNote, { once: true });
    }
  }
  if (screen === 'you') {
    renderYou(el('screen-you'), state, identity);
    el('google-signin')?.addEventListener('click', beginSignIn);
    el('sign-out')?.addEventListener('click', async () => {
      const { signOutUser } = await import('./cloud.js');
      await signOutUser();
      location.reload();   // simplest correct reset: re-init as a fresh anonymous session
    });
    el('change-creature')?.addEventListener('click', changeCreature);
    el('rename-creature')?.addEventListener('click', renameCreature);
    el('share-dna')?.addEventListener('click', async () => {
      haptic('light');
      try {
        const { shareCard } = await import('./dna.js');
        const how = await shareCard(state);
        if (how === 'downloaded') toast('Your creature card was saved.');
      } catch (err) {
        if (err?.name !== 'AbortError') { toast('Could not make the card.'); console.warn('share failed', err); }
      }
    });
    el('send-feedback')?.addEventListener('click', sendFeedback);
    el('export-data')?.addEventListener('click', exportData);
    el('gen-token')?.addEventListener('click', generateWebhookToken);
    el('regen-token')?.addEventListener('click', generateWebhookToken);
    bindDeleteAccount(el('delete-account'));
    el('theme')?.querySelectorAll('[data-theme-choice]').forEach((b) => {
      b.addEventListener('click', () => {
        state.settings.theme = b.dataset.themeChoice;
        save(state);
        applyTheme();
        haptic('light');
        render();
      });
    });
  }
}

// Stages 1-2 are the shared rail; from stage 3 the name carries the lineage the user's habits chose.
const BASE_STAGE_NAMES = ['Egg', 'Hatchling', 'Sprite', 'Guardian', 'Radiant'];
function stageName(stage, lineage) {
  const base = BASE_STAGE_NAMES[stage - 1] ?? 'Egg';
  if (stage < 3) return base;
  return `${LINEAGE_STYLE[lineage]?.name ?? 'Prismatic'} ${base}`;
}

// Habit names, goals and the creature's name are user text going into innerHTML. Escaping is the
// render boundary's job — the store keeps what the user typed, the DOM never executes it.
function escapeHtml(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function questMarkup(h) {
  const isDone = state.day.doneIds.includes(h.id);
  const streakMeta = h.streak > 0
    ? `${icons.flame}<span>${h.streak} day${h.streak === 1 ? '' : 's'}</span>`
    : '<span>New quest</span>';
  return `
    <li class="quest${isDone ? ' done' : ''}">
      <span class="quest__glyph">${habitGlyph(h.glyph)}</span>
      <span class="quest__text">
        <span class="quest__name">${escapeHtml(h.name)}</span>
        <span class="quest__meta">${streakMeta}</span>
      </span>
      <button class="check${isDone ? ' on' : ''}" data-habit="${h.id}"
              aria-pressed="${isDone}" aria-label="${isDone ? 'Undo' : 'Complete'} ${escapeHtml(h.name)}">
        <span class="check__ring">${icons.check}</span>
      </button>
    </li>`;
}

// Undo is a snapshot, not arithmetic run backwards. `best` and the banked freeze are maxima and
// thresholds — once raised, no subtraction recovers what they were, so the only honest reversal is
// to remember the values and put them back. Lives in `state.day` so it survives a reload and is
// cleared by the daily rollover: undo corrects a mistap, it does not rewrite history.
function snapshot(habit) {
  return {
    streak: habit.streak, best: habit.best, total: habit.total,
    gStreak: state.gStreak, gBest: state.gBest, freezes: state.freezes,
    xp: state.creature.xp, dayXp: state.day.xpEarned,
    comeback: state.comeback, badges: [...state.badges],
    decor: [...(state.decor ?? [])],
  };
}

function undoComplete(habitId) {
  const before = state.day.undo?.[habitId];
  const habit = state.habits.find((h) => h.id === habitId);
  if (!before || !habit) return false;

  // Only the newest check-in, so the snapshots unwind in the order they were taken. Undoing an
  // older one would restore an XP total from before every completion that followed it.
  if (habitId !== state.day.doneIds[state.day.doneIds.length - 1]) {
    toast('Only your most recent check-in can be undone.');
    return false;
  }

  habit.streak = before.streak;
  habit.best = before.best;
  habit.total = before.total;
  state.gStreak = before.gStreak;
  state.gBest = before.gBest;
  state.freezes = before.freezes;
  state.creature.xp = before.xp;
  state.day.xpEarned = before.dayXp;
  state.comeback = before.comeback;
  state.badges = before.badges;
  state.decor = before.decor;   // an egg won by this completion is not kept after undoing it
  state.day.doneIds = state.day.doneIds.filter((id) => id !== habitId);
  // Drop this habit's newest row for today, so Journey stops counting a completion that was undone.
  for (let i = state.log.length - 1; i >= 0; i -= 1) {
    if (state.log[i].hid === habitId && state.log[i].date === state.day.date) {
      state.log.splice(i, 1);
      break;
    }
  }
  delete state.day.undo[habitId];

  save(state);
  haptic('light');
  if (soundOn()) playRemove();
  render();
  toast('Undone.');
  // Whole state, not a completion delta: the cloud has to forget the XP and streak too.
  cloud?.pushAll(state).catch((err) => console.warn('cloud undo queued/failed', err));
  return true;
}

function complete(habitId, at) {
  if (state.day.doneIds.includes(habitId)) return;
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return;

  const before = snapshot(habit);
  const firstToday = state.day.doneIds.length === 0;
  const affinity = habit.category === SPECIES[state.creature.species]?.affinity;
  let xp = xpForCompletion({ streak: habit.streak, auto: false, affinity });

  habit.streak += 1;
  habit.best = Math.max(habit.best, habit.streak);
  habit.total += 1;
  state.day.doneIds.push(habitId);
  // Append to the local completion log — the source the Journey screen reads offline.
  state.log.push({ date: state.day.date, hid: habitId, ts: Date.now(), category: habit.category });

  if (firstToday) {
    const rolled = streakAfterDay({ streak: state.gStreak, freezes: state.freezes, completedToday: true });
    state.gStreak = rolled.streak;
    state.freezes = rolled.freezes;
    state.gBest = Math.max(state.gBest, state.gStreak);
  }
  const perfect = state.day.doneIds.length === scheduledOn(state.habits, state.day.date).length;
  if (perfect) xp += PERFECT_DAY_BONUS;
  const wasAsleep = state.comeback;

  state.creature.xp += xp;
  state.day.xpEarned += xp;

  if (wasAsleep) {
    // Coming back is the moment worth marking, so the badge is earned here and never expires.
    state.comeback = false;
    if (!state.badges.includes('rekindled')) state.badges.push('rekindled');
  }
  // A perfect day sometimes leaves something behind in the glade (§3.4). Rolled after the bonus so
  // the drop is the surprise on top, never the reason the day mattered.
  let hatched = null;
  if (perfect) {
    hatched = rollEgg({ perfect: true, unlocked: state.decor ?? [] });
    if (hatched) (state.decor ??= []).push(hatched);
  }
  (state.day.undo ??= {})[habitId] = before;
  save(state);

  if (wasAsleep) {
    wakeUp(el('creature'), { sound: state.settings.sound === true }).then(render);
  } else {
    render();
  }

  celebrate({
    xp, at, stageEl: el('creature'), flameEl: el('flame'),
    indexToday: state.day.doneIds.length - 1,
    perfect,
    sound: state.settings.sound === true,
  });
  if (hatched) setTimeout(() => toast(`An egg hatched — ${decorLabel(hatched)} appears in your glade.`), 1200);
  if (state.settings.sound === null) askAboutSound();

  // Fire-and-forget: the write is already local and Firestore replays it whenever the network
  // comes back. A failure here must never cost the user their completion.
  cloud?.push(state, { hid: habitId, xp }).catch((err) => console.warn('cloud write queued/failed', err));
}

// Respond on pointerdown — feedback belongs on the press, not on click.
el('quests').addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('.check');
  if (!btn) return;
  const id = btn.dataset.habit;
  // A ticked box unticks — the same affordance every checkbox has, so undo needs no extra chrome.
  if (state.day.doneIds.includes(id)) undoComplete(id);
  else complete(id, { x: e.clientX, y: e.clientY });
});

el('creature').addEventListener('pointerdown', () => {
  el('creature').querySelector('#body-group')?.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.04, 0.96)' }, { transform: 'scale(1)' }],
    { duration: 320, easing: 'cubic-bezier(0.22, 1.4, 0.36, 1)' },
  );
  haptic('light');
  if (soundOn()) playPet();
});

// Asked once, after the first completion, in the creature's voice rather than as a settings prompt
// (§6). Until it is answered the app stays silent — `settings.sound === null` means "not asked".
function askAboutSound() {
  const banner = document.createElement('div');
  banner.className = 'ask';
  banner.innerHTML = `
    <p class="ask__text">${escapeHtml(state.creature.name)} wants to make sounds — okay?</p>
    <div class="ask__actions">
      <button class="ask__btn" data-sound="no">Not now</button>
      <button class="ask__btn ask__btn--yes" data-sound="yes">Sure</button>
    </div>`;
  document.body.append(banner);

  banner.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-sound]');
    if (!btn) return;
    const yes = btn.dataset.sound === 'yes';
    state.settings.sound = yes;
    save(state);
    // Unlock + confirm inside this tap: on iOS the audio context only resumes from a gesture, and a
    // short chime here proves to the user that sound is on (or reveals a silent hardware switch).
    if (yes) {
      const { unlockAudio, playCompletion } = await import('./audio.js');
      unlockAudio();
      playCompletion(0);
    }
    banner.remove();
  });
}

// Change creature any time — keeps all progress (XP, level, streaks, world); only the species look
// and its affinity change. Reuses the onboarding picker, which just resolves a species key.
async function changeCreature() {
  haptic('light');
  const { runOnboarding } = await import('./onboarding.js');
  const species = await runOnboarding(el('overlay'), { change: true });
  state.creature.species = species;
  state.creature.name = SPECIES[species].name;
  save(state);
  showScreen('home');
  cloud?.pushAll(state).catch((err) => console.warn('cloud write queued/failed', err));
}

// A per-account webhook token, stored on the user doc so the backend can map an incoming call to
// this account (services/webhook_service.py queries users by webhookToken).
function generateWebhookToken() {
  haptic('light');
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  state.webhookToken = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  save(state);
  render();
  cloud?.pushAll(state).catch((err) => console.warn('cloud write queued/failed', err));
  toast('Webhook token generated.');
}

// Download everything as JSON — GDPR-friendly, and it is just the local state (which mirrors the
// cloud). No server round-trip needed.
// A bare mailto: link opens nothing on plenty of phones — no mail client configured, or an
// in-app browser that refuses the scheme — and a button that silently does nothing is worse than
// no button. Try to open the composer, and always leave the address on the clipboard as a fallback.
const FEEDBACK_EMAIL = 'kandulanikhilvarma@gmail.com';

async function sendFeedback() {
  haptic('light');
  const { level } = levelFromTotalXp(state.creature.xp);
  const body = `

---
Level ${level} · ${state.habits.length} habits · ${state.gStreak} day streak`;
  const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Kumo feedback')}&body=${encodeURIComponent(body)}`;
  try {
    await navigator.clipboard?.writeText(FEEDBACK_EMAIL);
    toast(`Opening mail. Address copied: ${FEEDBACK_EMAIL}`);
  } catch {
    toast(`Email: ${FEEDBACK_EMAIL}`);
  }
  window.location.href = href;
}

function exportData() {
  haptic('light');
  // A data export nobody can read is not really an export. Plain text is what a person opens; the
  // JSON stays in the file underneath it for anyone who wants to move the data somewhere.
  const { level } = levelFromTotalXp(state.creature.xp);
  const line = (s = '') => `${s}
`;
  let out = '';
  out += line(`KUMO — your data, exported ${todayKey()}`);
  out += line('='.repeat(48));
  out += line();
  out += line(`Creature:      ${state.creature.name} (${SPECIES[state.creature.species]?.name ?? state.creature.species})`);
  out += line(`Level:         ${level}  (${state.creature.xp} XP total)`);
  out += line(`Current streak: ${state.gStreak} days   Best: ${state.gBest} days`);
  out += line(`Freezes banked: ${state.freezes}`);
  if (state.account?.email) out += line(`Account:       ${state.account.email}`);
  out += line();

  out += line('YOUR HABITS');
  out += line('-'.repeat(48));
  for (const h of state.habits) {
    out += line(`${h.name}`);
    out += line(`   category ${h.category} · runs ${scheduleLabel(h.days)}`);
    out += line(`   ${h.total} completions · streak ${h.streak} · best ${h.best}`);
    if (h.goal) out += line(`   why: ${h.goal}`);
    if (h.reminder) out += line(`   reminder at ${h.reminder}`);
    out += line();
  }

  const notes = (state.notes ?? []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (notes.length) {
    out += line('MEMORIES');
    out += line('-'.repeat(48));
    for (const n of notes) out += line(`${n.date}  ${n.text}`);
    out += line();
  }

  const log = state.log ?? [];
  out += line(`COMPLETION HISTORY (${log.length} entries)`);
  out += line('-'.repeat(48));
  const byDate = new Map();
  for (const e of log) {
    const names = byDate.get(e.date) ?? [];
    names.push(state.habits.find((h) => h.id === e.hid)?.name ?? e.hid);
    byDate.set(e.date, names);
  }
  for (const [date, names] of [...byDate].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    out += line(`${date}  ${names.join(', ')}`);
  }
  out += line();
  out += line('-'.repeat(48));
  out += line('Raw data (JSON), for moving this somewhere else:');
  out += line();
  out += line(JSON.stringify(state, null, 2));

  const blob = new Blob([out], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kumo-data-${todayKey()}.txt`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Your data is downloading.');
}

// Rename the creature inline — the name is the attachment (MASTER_PLAN §3.2). Swaps the value line
// for an input; Enter or blur saves a non-empty trimmed name.
function renameCreature() {
  haptic('light');
  const valueEl = el('screen-you').querySelector('.card__value');
  if (!valueEl || valueEl.querySelector('input')) return;
  const current = state.creature.name ?? '';
  valueEl.innerHTML = `<input class="field__input rename-input" id="rename-input" maxlength="20" value="${current.replace(/"/g, '&quot;')}">`;
  const input = el('rename-input');
  input.focus();
  input.select();
  let done = false;
  const commit = () => {
    if (done) return;
    done = true;
    const name = input.value.trim().slice(0, 20);
    if (name && name !== current) {
      state.creature.name = name;
      save(state);
      cloud?.pushAll(state).catch((err) => console.warn('cloud write queued/failed', err));
    }
    render();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
  input.addEventListener('blur', commit);
}

function openAddSheet(editHabit = null) {
  const sheet = el('sheet');
  sheet.innerHTML = sheetMarkup(state.habits.length, editHabit);

  let glyph = (sheet.querySelector('.glyph.on') ?? sheet.querySelector('.glyph')).dataset.glyph;
  let category = (sheet.querySelector('.segment.on') ?? sheet.querySelector('.segment')).dataset.category;
  const nameInput = sheet.querySelector('#habit-name');
  const submit = sheet.querySelector('#add-habit');
  const sync = () => { submit.disabled = nameInput.value.trim().length === 0; };

  const pick = (group, chosen, attr) => {
    sheet.querySelectorAll(group).forEach((b) => {
      const on = b === chosen;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    return chosen.dataset[attr];
  };

  sheet.querySelectorAll('.chip-btn').forEach((chip) => {
    chip.addEventListener('click', () => {
      const t = TEMPLATES[Number(chip.dataset.template)];
      nameInput.value = t.name;
      glyph = pick('.glyph', sheet.querySelector(`.glyph[data-glyph="${t.glyph}"]`) ?? sheet.querySelector('.glyph'), 'glyph');
      category = pick('.segment', sheet.querySelector(`.segment[data-category="${t.category}"]`), 'category');
      sync();
      haptic('light');
      if (soundOn()) playPick();
    });
  });

  sheet.querySelectorAll('.glyph').forEach((b) => b.addEventListener('click', () => { glyph = pick('.glyph', b, 'glyph'); haptic('light'); }));
  sheet.querySelectorAll('.segment').forEach((b) => b.addEventListener('click', () => { category = pick('.segment', b, 'category'); haptic('light'); }));
  sheet.querySelectorAll('.day').forEach((b) => b.addEventListener('click', () => {
    const on = !b.classList.contains('on');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    haptic('light');
  }));
  nameInput.addEventListener('input', sync);

  const close = presentSheet(sheet, el('scrim'));

  submit.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    // A duplicate is only a duplicate against OTHER habits, not the one being edited.
    const others = editHabit ? state.habits.filter((h) => h.id !== editHabit.id) : state.habits;
    if (isDuplicateName(name, others)) {
      toast(`You already have a "${name}" quest.`);
      return;
    }
    const reminder = sheet.querySelector('#habit-reminder').value || null;
    const goal = sheet.querySelector('#habit-goal').value.trim() || null;
    const picked = [...sheet.querySelectorAll('.day.on')].map((b) => Number(b.dataset.day));
    // All seven selected is the same thing as no schedule; store it as "every day".
    const days = picked.length === 7 ? [] : picked;
    if (picked.length === 0) {
      toast('Pick at least one day.');
      return;
    }
    if (reminder) await ensurePermission();   // asked at the moment it is needed, not on first launch

    if (editHabit) {
      Object.assign(editHabit, { name, glyph, category, reminder, goal, days });
    } else {
      if (state.habits.length >= MAX_HABITS) return;
      state.habits.push(makeHabit({ name, glyph, category, reminder, goal, days }, state.habits));
    }
    save(state);
    render();
    haptic('success');
    if (soundOn()) playAdd();
    syncReminders(state.habits, state.creature.name).catch((err) => console.warn('reminder sync failed', err));
    cloud?.pushAll(state).catch((err) => console.warn('cloud write queued/failed', err));
    close(0);
  });
}

el('add-quest').addEventListener('click', () => { haptic('light'); openAddSheet(); });

// Shared by the You button and the Home guest banner. Calls the cached fn directly (no await before
// it) so the Google popup opens inside the tap gesture — an await here gets the popup blocked on iOS.
function beginSignIn() {
  haptic('light');
  if (!signInFn) { toast('Still loading — try again in a moment.'); return; }
  Promise.resolve(signInFn()).catch((err) => {
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
    toast(err?.code === 'auth/unauthorized-domain'
      ? 'This site is not authorized in Firebase yet.'
      : `Sign-in failed: ${err?.code || err?.message || 'unknown'}`);
    console.warn('sign-in failed', err);
  });
}
el('home-signin').addEventListener('click', beginSignIn);

// Two-tap delete so a stray tap can't wipe an account: first tap arms + warns, second within 4s
// wipes local + cloud and reloads to a fresh guest.
function bindDeleteAccount(btn) {
  if (!btn) return;
  let armed = false;
  let armTimer = null;
  btn.addEventListener('click', async () => {
    if (!armed) {
      armed = true;
      btn.textContent = 'Tap again to delete everything';
      btn.classList.add('danger-btn--armed');
      armTimer = setTimeout(() => {
        armed = false;
        btn.textContent = 'Delete my account';
        btn.classList.remove('danger-btn--armed');
      }, 4000);
      return;
    }
    clearTimeout(armTimer);
    btn.disabled = true;
    btn.textContent = 'Deleting…';
    try {
      if (cloudCtx) {
        const { deleteAccount } = await import('./cloud.js');
        await deleteAccount(cloudCtx);
      }
    } catch (err) {
      console.warn('account delete failed', err);
    }
    localStorage.removeItem('habitgame.state.v1');
    location.reload();
  });
}

// A habit row: quick tap edits, press-and-hold deletes. Hold is deliberate where destructive, the
// fill animates over 1.2s and letting go early cancels (DESIGN_MOTION_SPEC §5).
const HOLD_MS = 1200;
const TAP_MS = 300;
function bindHabitRow(host) {
  let timer = null;
  let held = null;
  let downAt = 0;
  let fired = false;

  const start = (e) => {
    const row = e.target.closest('[data-delete]');
    if (!row) return;
    held = row;
    fired = false;
    downAt = performance.now();
    row.classList.add('holding');
    timer = setTimeout(() => {
      fired = true;
      const removedId = row.dataset.delete;
      state.habits = state.habits.filter((h) => h.id !== removedId);
      state.day.doneIds = state.day.doneIds.filter((id) => id !== removedId);
      save(state);
      render();
      haptic('medium');
      if (soundOn()) playRemove();
      syncReminders(state.habits, state.creature.name).catch((err) => console.warn('reminder sync failed', err));
      cloud?.deleteHabits([removedId]).catch((err) => console.warn('cloud delete failed', err));
      cloud?.pushAll(state).catch((err) => console.warn('cloud write queued/failed', err));
    }, HOLD_MS);
  };
  const up = () => {
    clearTimeout(timer);
    const row = held;
    held?.classList.remove('holding');
    held = null;
    // A short press that didn't trigger a delete opens the edit sheet for that habit.
    if (row && !fired && performance.now() - downAt < TAP_MS) {
      const h = state.habits.find((x) => x.id === row.dataset.delete);
      if (h) { haptic('light'); openAddSheet(h); }
    }
  };
  const cancel = () => { clearTimeout(timer); held?.classList.remove('holding'); held = null; };

  host.addEventListener('pointerdown', start);
  host.addEventListener('pointerup', up);
  host.addEventListener('pointercancel', cancel);
  host.addEventListener('pointerleave', cancel);
}
bindHabitRow(el('screen-you'));

// Navigation is instant by design (DESIGN_MOTION_SPEC §3 part 2): tabs are hit dozens of times a
// day, so the screens swap with a 120ms opacity fade and nothing slides.
function showScreen(name) {
  screen = name;
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.dataset.screen !== name; });
  document.querySelectorAll('.tab').forEach((t) => {
    t.setAttribute('aria-selected', String(t.dataset.screen === name));
  });
  render();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.innerHTML = `${icons[tab.dataset.icon]}<span>${tab.dataset.label}</span>`;
  // Navigation stays sound-free (§6) but gets a light haptic tick — satisfying without being noise.
  tab.addEventListener('pointerdown', () => { haptic('light'); showScreen(tab.dataset.screen); });
});

// Day rollover is event-driven: no polling timer burning battery in a WebView.
function checkRollover() {
  const result = rollover(state, todayKey());
  if (result.rolled) {
    state = result.state;
    render();
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRollover(); });
window.addEventListener('focus', checkRollover);
document.addEventListener('resume', checkRollover);   // Capacitor app resume

async function boot() {
  checkRollover();
  render();
  bindIdleLifecycle();

  // A ✓ tapped on a notification lands here. The habit completes at the centre of the screen
  // because there is no tap point to float the XP from.
  initReminders((habitId) => {
    const centre = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    complete(habitId, centre);
  }).then((ready) => {
    if (ready) syncReminders(state.habits, state.creature.name);
  }).catch((err) => console.warn('reminders unavailable', err));

  // Cloud/auth is set up BEFORE the welcome screen so sign-in works there and identity is known.
  const {
    initCloud, pullState, pushCompletion, pushWholeState, deleteHabits,
    currentIdentity, watchAuth, saveProfile, startGoogleSignIn,
  } = await import('./cloud.js');
  const ctx = await initCloud();
  if (ctx) {
    cloudCtx = ctx;
    signInFn = startGoogleSignIn;   // sign-in buttons now work with no async gap before the popup
    cloud = {
      push: (s, completion) => pushCompletion(ctx, s, completion),
      pushAll: (s) => pushWholeState(ctx, s),
      deleteHabits: (ids) => deleteHabits(ctx, ids),
    };
    identity = currentIdentity();
    if (ctx.authError) {
      toast(ctx.authError === 'auth/unauthorized-domain'
        ? 'Sign-in blocked — add this site to Firebase authorized domains.'
        : `Sign-in error: ${ctx.authError}`);
    }
    // Live auth: whenever sign-in state changes (popup completes, or a redirect lands), the UI
    // updates and the profile is saved. Fixes "signed in but still shows login" and the missing email.
    watchAuth(async (id) => {
      identity = id;
      render();
      if (!id.anonymous) {
        toast(`Signed in as ${id.name || id.email}`);
        state.account = { email: id.email, name: id.name, uid: id.uid };
        save(state);
        try { await saveProfile(ctx); await pushWholeState(ctx, state); } catch (err) { console.warn('profile save failed', err); }
      }
    });
  }

  // First run on the web: the welcome screen (sign in or continue as guest) THEN the starter pick.
  if (!state.creature.species) {
    const { runWelcome, runOnboarding } = await import('./onboarding.js');
    await runWelcome(el('overlay'), { onSignIn: beginSignIn });
    const species = await runOnboarding(el('overlay'));
    state.creature.species = species;
    state.creature.name = SPECIES[species].name;
    save(state);
    render();
  }

  if (!ctx) return;

  const remote = await pullState(ctx, todayKey());
  if (remote && (remote.updatedAt ?? 0) > (state.updatedAt ?? 0)) {
    state = { ...state, ...remote };
    const beforeIds = state.habits.map((h) => h.id);
    state.habits = dedupeHabits(state.habits);   // the cloud copy may predate the no-duplicate rule
    save(state);
    const removed = beforeIds.filter((id) => !state.habits.some((h) => h.id === id));
    if (removed.length) {
      await deleteHabits(ctx, removed);           // delete the orphan docs or they resurrect on pull
      await pushWholeState(ctx, state);
    }
  } else {
    await pushWholeState(ctx, state);
  }
  render();
}

boot().catch((err) => console.warn('boot fell back to local-only', err));

// On-device diagnostics: open /play/?diag to dump real layout numbers as plain text (inline styles,
// no dependency on tokens/app.css), so an engine-specific render bug can be read off a screenshot.
if (location.search.includes('diag')) {
  setTimeout(() => {
    const rect = (sel) => {
      const e = sel[0] === '#' ? document.getElementById(sel.slice(1)) : document.querySelector(sel);
      if (!e) return `${sel}: MISSING`;
      const r = e.getBoundingClientRect();
      return `${sel}: ${Math.round(r.width)}x${Math.round(r.height)} @top${Math.round(r.top)}`;
    };
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
    const sheets = [...document.styleSheets].map((s) => {
      let rules = '?';
      try { rules = s.cssRules.length; } catch { rules = 'BLOCKED'; }
      return `${(s.href || 'inline').split('/').pop()}=${rules}`;
    }).join(' ');
    const report = [
      'DIAG',
      navigator.userAgent,
      `viewport ${window.innerWidth}x${window.innerHeight}`,
      `--text resolved: "${cssVar}"  (should be #eef0ff)`,
      `stylesheets: ${sheets}`,
      rect('.app'), rect('#level'), rect('.scene'), rect('#creature'),
      rect('#screen-home'), rect('#quests'), rect('.tabs'),
    ].join('\n');
    const box = document.createElement('pre');
    box.textContent = report;
    box.setAttribute('style',
      'position:fixed;left:0;top:0;right:0;z-index:99999;margin:0;padding:10px;'
      + 'background:#000;color:#0f0;font:11px/1.4 monospace;white-space:pre-wrap;border-bottom:2px solid #0f0');
    document.body.appendChild(box);
  }, 800);
}
