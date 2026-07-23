import {
  xpForCompletion, levelFromTotalXp, stageForLevel, moodFor,
  streakAfterDay, attunementFrom, lineageFor, PERFECT_DAY_BONUS,
} from './game-math.js';
import { load, save, rollover, todayKey } from './store.js';
import { creatureSvg, SPECIES, LINEAGE_STYLE } from './creature.js';
import { renderJourney, renderYou } from './screens.js';
import { icons } from './icons.js';
import { celebrate, wakeUp, haptic, bindIdleLifecycle, randomizeBlink } from './fx.js';
import { playAdd, playRemove, playPick, playPet } from './audio.js';
import { sheetMarkup, makeHabit, TEMPLATES, MAX_HABITS } from './habits.js';
import { presentSheet } from './sheet.js';
import { initReminders, ensurePermission, syncReminders } from './reminders.js';

const el = (id) => document.getElementById(id);
let state = load();
let cloud = null;
let screen = 'home';
let identity = { anonymous: true, email: null, name: null };

// Sound only plays once the user has opted in; haptics fire freely (silent, and a no-op on iOS web).
const soundOn = () => state.settings.sound === true;

function render() {
  const { level, into, need } = levelFromTotalXp(state.creature.xp);
  const stage = stageForLevel(level);
  const done = state.day.doneIds.length;
  const total = state.habits.length;

  el('level').innerHTML = `${icons.star}<span>Lv ${level}</span>`;
  el('streak').innerHTML =
    `<span class="flame-icon" id="flame">${icons.flame}</span><span>${state.gStreak} day streak</span>`;
  el('xp-fill').style.transform = `scaleX(${(into / need).toFixed(3)})`;

  const cracks = Math.min((state.creature.cracks ?? 0) + done, 3);
  const lineage = lineageFor(attunementFrom(state.habits));
  el('creature').innerHTML = creatureSvg(state.creature.species, stage, {
    cracks, asleep: state.comeback, lineage,
  });
  el('creature-name').textContent = state.creature.name;
  el('creature-stage-tag').textContent = state.comeback
    ? 'Asleep · waiting for you'
    : `${stageName(stage, lineage)} · ${moodFor(done, total)}`;

  el('today-label').textContent = `Today ${done}/${total}`;
  el('today-dots').innerHTML = state.habits
    .map((h) => `<span class="dot${state.day.doneIds.includes(h.id) ? ' on' : ''}"></span>`)
    .join('');

  el('quests').innerHTML = state.habits.map(questMarkup).join('');
  el('add-quest').hidden = state.habits.length >= MAX_HABITS;
  randomizeBlink();

  if (screen === 'journey') renderJourney(el('screen-journey'), state);
  if (screen === 'you') {
    renderYou(el('screen-you'), state, identity);
    el('google-signin')?.addEventListener('click', async () => {
      haptic('light');
      const { startGoogleSignIn } = await import('./cloud.js');
      try { await startGoogleSignIn(); } catch (err) { console.warn('sign-in start failed', err); }
    });
    el('sign-out')?.addEventListener('click', async () => {
      const { signOutUser } = await import('./cloud.js');
      await signOutUser();
      location.reload();   // simplest correct reset: re-init as a fresh anonymous session
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

function questMarkup(h) {
  const isDone = state.day.doneIds.includes(h.id);
  const streakMeta = h.streak > 0
    ? `${icons.flame}<span>${h.streak} day${h.streak === 1 ? '' : 's'}</span>`
    : '<span>New quest</span>';
  return `
    <li class="quest${isDone ? ' done' : ''}">
      <span class="quest__glyph">${h.glyph}</span>
      <span class="quest__text">
        <span class="quest__name">${h.name}</span>
        <span class="quest__meta">${streakMeta}</span>
      </span>
      <button class="check${isDone ? ' on' : ''}" data-habit="${h.id}"
              aria-pressed="${isDone}" aria-label="Complete ${h.name}">
        <span class="check__ring">${icons.check}</span>
      </button>
    </li>`;
}

// ponytail: no undo this gate. Reversing XP, per-habit streak, global streak and the perfect-day
// bonus is real accounting; it belongs with the edit/delete flows, not bolted on here.
function complete(habitId, at) {
  if (state.day.doneIds.includes(habitId)) return;
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit) return;

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
  const perfect = state.day.doneIds.length === state.habits.length;
  if (perfect) xp += PERFECT_DAY_BONUS;
  const wasAsleep = state.comeback;

  state.creature.xp += xp;
  state.day.xpEarned += xp;

  if (wasAsleep) {
    // Coming back is the moment worth marking, so the badge is earned here and never expires.
    state.comeback = false;
    if (!state.badges.includes('rekindled')) state.badges.push('rekindled');
  }
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
  if (state.settings.sound === null) askAboutSound();

  // Fire-and-forget: the write is already local and Firestore replays it whenever the network
  // comes back. A failure here must never cost the user their completion.
  cloud?.push(state, { hid: habitId, xp }).catch((err) => console.warn('cloud write queued/failed', err));
}

// Respond on pointerdown — feedback belongs on the press, not on click.
el('quests').addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('.check');
  if (!btn) return;
  complete(btn.dataset.habit, { x: e.clientX, y: e.clientY });
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
    <p class="ask__text">${state.creature.name} wants to make sounds — okay?</p>
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

function openAddSheet() {
  const sheet = el('sheet');
  sheet.innerHTML = sheetMarkup(state.habits.length);

  let glyph = sheet.querySelector('.glyph').dataset.glyph;
  let category = sheet.querySelector('.segment').dataset.category;
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
  nameInput.addEventListener('input', sync);

  const close = presentSheet(sheet, el('scrim'));

  submit.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name || state.habits.length >= MAX_HABITS) return;
    const reminder = sheet.querySelector('#habit-reminder').value || null;

    // Permission is asked here, at the moment it is actually needed, rather than on first launch.
    if (reminder) await ensurePermission();

    state.habits.push(makeHabit({ name, glyph, category, reminder }, state.habits));
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

// Hold-to-delete, not a confirm dialog: deliberate where destructive, snappy on cancel
// (DESIGN_MOTION_SPEC §5). The overlay fills over 1.2s; letting go before it completes cancels.
const HOLD_MS = 1200;
function bindHoldToDelete(host) {
  let timer = null;
  let held = null;

  const start = (e) => {
    const row = e.target.closest('[data-delete]');
    if (!row) return;
    held = row;
    row.classList.add('holding');
    timer = setTimeout(() => {
      state.habits = state.habits.filter((h) => h.id !== row.dataset.delete);
      state.day.doneIds = state.day.doneIds.filter((id) => id !== row.dataset.delete);
      save(state);
      render();
      haptic('medium');
      if (soundOn()) playRemove();
      // A deleted habit must stop reminding: cancel-and-reschedule clears its pending notification.
      syncReminders(state.habits, state.creature.name).catch((err) => console.warn('reminder sync failed', err));
      cloud?.pushAll(state).catch((err) => console.warn('cloud write queued/failed', err));
    }, HOLD_MS);
  };
  const cancel = () => {
    clearTimeout(timer);
    held?.classList.remove('holding');
    held = null;
  };

  host.addEventListener('pointerdown', start);
  host.addEventListener('pointerup', cancel);
  host.addEventListener('pointercancel', cancel);
  host.addEventListener('pointerleave', cancel);
}
bindHoldToDelete(el('screen-you'));

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
  if (!state.creature.species) {
    const { runOnboarding } = await import('./onboarding.js');
    const species = await runOnboarding(el('overlay'));
    state.creature.species = species;
    state.creature.name = SPECIES[species].name;
    save(state);
  }

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

  // The cloud is optional and always second: the screen is already drawn from local state by now.
  // ponytail: newest-write-wins on whole state. Real per-field merge only matters once one account
  // has two devices, which is a Gate 1+ problem.
  const { initCloud, pullState, pushCompletion, pushWholeState, currentIdentity } = await import('./cloud.js');
  const ctx = await initCloud();
  if (!ctx) return;

  identity = currentIdentity();
  if (screen === 'you') render();   // reflect signed-in state if the You tab is already open

  const remote = await pullState(ctx, todayKey());
  if (remote && (remote.updatedAt ?? 0) > (state.updatedAt ?? 0)) {
    state = { ...state, ...remote };
    save(state);
    render();
  } else {
    await pushWholeState(ctx, state);
  }
  cloud = {
    push: (s, completion) => pushCompletion(ctx, s, completion),
    pushAll: (s) => pushWholeState(ctx, s),
  };
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
