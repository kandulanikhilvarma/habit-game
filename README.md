<div align="center">

<img width="1983" height="793" alt="Budreadme" src="https://github.com/user-attachments/assets/89a89651-cc06-40c4-b3f9-b6630045b543" />

# Bud

**A habit tracker that refuses to punish you for missing a day.**

Tick your habits, a creature grows. Miss a week, it waits. Come back, and coming back is
the thing that gets rewarded — there is no award in this app for an unbroken streak,
because that is the same sentence as *punished for missing*.

[![CI](https://github.com/kandulanikhilvarma/habit-game/actions/workflows/ci.yml/badge.svg)](https://github.com/kandulanikhilvarma/habit-game/actions/workflows/ci.yml)
[![APK](https://github.com/kandulanikhilvarma/habit-game/actions/workflows/android.yml/badge.svg)](https://github.com/kandulanikhilvarma/habit-game/actions/workflows/android.yml)
![tests](https://img.shields.io/badge/tests-132%20passing-3fb98f)
![no framework](https://img.shields.io/badge/frontend-vanilla%20JS-4c5bd4)
![license](https://img.shields.io/badge/license-MIT-666)

<img src="docs/screenshots/evolution.png" alt="One creature through four stages: hatchling, sprite, guardian, radiant" width="620">

*One creature, four stages. Which one you get depends on which habits you actually kept.*

</div>

---

## Why this exists

Every habit app on the store runs the same loop: a streak counter, a red X, and a
notification that shames you at 9pm. It works for about eleven days. Then you miss one,
the number goes to zero, and you delete the app.

Bud is built on the opposite bet — **the return is the hard part, so reward the return.**

- Miss a day and a **banked freeze** covers it. You earn one per seven-day run, two maximum.
- Miss a week and the creature is asleep, not dead. Waking it is its own moment.
- Come back after a break and you earn **Rekindled** — an award you *cannot* get by never leaving.
- There is a test asserting no award name ever contains "never" or "without missing", so a
  future change can't quietly reintroduce the punishment mechanic wearing a medal.

## What's in it

| | |
|---|---|
| **Branching evolution** | Your habit mix picks the lineage. Mind-heavy grows a Moth, body-heavy an Ember, balance a Prismatic. Five stages, eleven hand-made forms, and every promotion visibly changes the art — a label change with the same picture is not evolution. |
| **Awards that mean something** | Derived from state, never toggled: undo a completion and its award goes back with the XP. The board shows what you earned plus the *single* nearest rung of each ladder — not a wall of locked medals. |
| **Three ways to read your data** | A fortnight bar chart, a this-week-vs-last comparison, and an 84-day heatmap. Each answers a different question, so you pick the one you're actually asking. |
| **A weekly letter** | Written by your creature, in its voice, quoting the private notes you left that week. A diary nothing ever reads back is just typing. |
| **Habit DNA card** | A shareable PNG of your creature, stage, lineage and streak. Rendered client-side; the typeface is embedded so the card can't come out in Times New Roman. |
| **Offline first** | Everything works with no connection and syncs when there is one. The app says so plainly rather than failing quietly. |
| **Rest days** | A Mon/Wed/Fri habit doesn't make Tuesday an unfinished day. Perfect-day maths respects the schedule. |
| **Your data is yours** | Export the whole save as JSON, delete the account for real, and sign-out wipes the device — not just the session. |

<div align="center">
<img src="docs/screenshots/starters.png" alt="Six starter creatures" width="620">

*Six starters. You pick one; the rest of the tree you earn.*
</div>

## What makes the codebase worth a look

- **No framework, no build step for the app.** Vanilla HTML/CSS/JS. `app/www` is served as-is.
  The only bundling is the Firebase SDK.
- **The game maths is one tested file.** `shared/game-math.js` owns XP, levels, stages, moods and
  streaks. Change a number there or nowhere. 132 tests run on `node --test` with no test framework
  installed.
- **Undo is order-independent.** Completions store their own before-state and day-level rewards
  unwind from the day, so undoing the *first* habit you ticked works exactly like undoing the last.
- **Contrast is measured, not eyeballed.** Every colour decision in `DESIGN.md` carries the ratio it
  was checked at, composited through the real alpha stack in both themes.
- **The design rules are written down and enforced.** `transition: all` and `ease-in` are banned,
  `prefers-reduced-motion` is handled on every animation, touch targets are ≥44px, and no emoji is
  used as UI chrome — emoji are only ever a habit glyph the user chose.

## Status

The web product is **complete and deployed**. The full loop, analytics, weekly letter, branching
evolution, the world scene, the share card, Google auth, offline-first sync and the compliance pages
all ship, and `main` deploys clean.

**Not built:** Health Connect auto-verification, screen-time habits, the home-screen widget, push
notifications, and the Play listing. All of it is Android-native and needs a physical device,
Android Studio and a Play account. See [docs/PROGRESS.md](docs/PROGRESS.md).

## Run it

```bash
npm install          # node 22+
npm run serve        # build, then serve the game at localhost:4173
```

```bash
npm test             # 132 game-logic tests, node --test, no framework
npm run check        # syntax-check every frontend module
```

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt
pytest               # the Flask API
npm run test:rules   # Firestore rules against the emulator (needs a JDK)
```

Without `app/www/firebase-config.js` the app runs entirely on `localStorage` — no errors, no
account, full game. Copy `firebase-config.example.js` to wire up a real project. For emulators, set
`projectId: 'demo-bud'` and `useEmulator: true`, then:

```bash
npx firebase emulators:start --only firestore,auth --project demo-bud
```

CI builds a debug APK on every push to `main` — grab `bud-debug-apk` from the
[Actions tab](https://github.com/kandulanikhilvarma/habit-game/actions) instead of building Android
locally.

## Layout

```
app/www/        the game: vanilla HTML/CSS/JS, no framework, no build step
app/android/    Capacitor shell (the only native code will be the widget)
shared/         game-math, analytics, schedule, achievements — pure, tested, no DOM
api/            Flask on Vercel: thin routes/, services/ per integration, Pydantic schemas
web/            marketing site and share pages
scripts/        sync-shared and the site builder
docs/           plans, validation, design + motion spec, and the progress log
tests/          pytest for the API, emulator tests for the Firestore rules
```

`app/www/*.js` copies of `shared/` modules are **generated** by `npm run sync:shared`, and CI fails
on drift. Edit `shared/`, never the copy — a Capacitor webroot cannot import from outside itself,
which is the only reason the duplication exists.

## The rules this repo is built under

[`CLAUDE.md`](CLAUDE.md) is the law of the project — stack constraints, engineering rules,
verification-before-done. [`DESIGN.md`](DESIGN.md) owns the palette and the standing visual bans.
[`PRODUCT.md`](PRODUCT.md) owns product truth and records the decisions that are settled.

Deeper: [Stack & architecture](docs/Stack_Architecture_Plan.md) ·
[MVP master plan](docs/HABITGAME_MVP_MASTER_PLAN.md) ·
[Validation report](docs/VALIDATION_REPORT.md) ·
[Design & motion spec](docs/DESIGN_MOTION_SPEC.md) ·
[Progress log](docs/PROGRESS.md)

## Contributing

Issues and PRs welcome. Two things to know before opening one:

1. **The constraints are the point.** No React, no Tailwind, no CSS library. A narrow-purpose CDN
   library for one specific feature on one page can be discussed; a framework cannot.
2. **Verification before done.** Logic changes come with a test; UI changes come with the measured
   number — contrast ratio, px of overflow, screens of scrolling. "Looks fine" is not evidence.

## Licence

MIT — see [LICENSE](LICENSE).

The eleven creature images are original assets for this project and are **not** covered by the MIT
grant. Fork the code freely; draw your own creatures.

<div align="center">
<br>
<sub>If "don't punish the return" is an idea you'd want in your own habit app, a ⭐ helps other
people find it.</sub>
</div>
