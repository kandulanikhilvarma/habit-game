import {
  xpForCompletion, levelFromTotalXp, stageForLevel, moodFor,
  streakAfterDay, PERFECT_DAY_BONUS,
} from './game-math.js';
import { load, save, rollover, todayKey } from './store.js';
import { creatureSvg, SPECIES } from './creature.js';
import { renderJourney, renderYou } from './screens.js';
import { icons } from './icons.js';
import { celebrate, bindIdleLifecycle, randomizeBlink } from './fx.js';

const el = (id) => document.getElementById(id);
let state = load();
let cloud = null;
let screen = 'home';

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
  el('creature').innerHTML = creatureSvg(state.creature.species, stage, cracks);
  el('creature-name').textContent = state.creature.name;
  el('creature-stage-tag').textContent = `${stage === 1 ? 'Egg' : 'Hatchling'} · ${moodFor(done, total)}`;

  el('today-label').textContent = `Today ${done}/${total}`;
  el('today-dots').innerHTML = state.habits
    .map((h) => `<span class="dot${state.day.doneIds.includes(h.id) ? ' on' : ''}"></span>`)
    .join('');

  el('quests').innerHTML = state.habits.map(questMarkup).join('');
  randomizeBlink();

  if (screen === 'journey') renderJourney(el('screen-journey'), state);
  if (screen === 'you') renderYou(el('screen-you'), state);
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

  if (firstToday) {
    const rolled = streakAfterDay({ streak: state.gStreak, freezes: state.freezes, completedToday: true });
    state.gStreak = rolled.streak;
    state.freezes = rolled.freezes;
    state.gBest = Math.max(state.gBest, state.gStreak);
  }
  if (state.day.doneIds.length === state.habits.length) xp += PERFECT_DAY_BONUS;

  state.creature.xp += xp;
  state.day.xpEarned += xp;
  save(state);
  render();

  celebrate({ xp, at, stageEl: el('creature'), flameEl: el('flame') });

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
});

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
  tab.addEventListener('pointerdown', () => showScreen(tab.dataset.screen));
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

  // The cloud is optional and always second: the screen is already drawn from local state by now.
  // ponytail: newest-write-wins on whole state. Real per-field merge only matters once one account
  // has two devices, which is a Gate 1+ problem.
  const { initCloud, pullState, pushCompletion, pushWholeState } = await import('./cloud.js');
  const ctx = await initCloud();
  if (!ctx) return;

  const remote = await pullState(ctx, todayKey());
  if (remote && (remote.updatedAt ?? 0) > (state.updatedAt ?? 0)) {
    state = { ...state, ...remote };
    save(state);
    render();
  } else {
    await pushWholeState(ctx, state);
  }
  cloud = { push: (s, completion) => pushCompletion(ctx, s, completion) };
}

boot().catch((err) => console.warn('boot fell back to local-only', err));
