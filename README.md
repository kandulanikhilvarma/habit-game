# Kumo

A habit game where the habits are the controller. Real behaviour — steps, sleep, screen time,
or a single tap — feeds a creature that grows, evolves and builds a small world. No manual
tracking where a phone API can do the tracking for you.

The wedge: multi-habit tracking + multi-source auto-verification + a care-based creature +
honest personal analytics. Every neighbouring product does one or two of those. Screen-time
habits as creature care is the part nobody has built.

**Status: Gate 0 (foundation).** Not installable from a store, not feature-complete. See
[docs/PROGRESS.md](docs/PROGRESS.md) for what actually works today.

## Gates

| Gate | Scope | State |
|---|---|---|
| 0 | Repo, game math, Home screen, Flask API, CI/CD, Capacitor shell, Firestore rules | build done, on-device exit criterion pending |
| 1 | 3 screens, onboarding, templates, streak freezes, reward juice + sound, notifications, Play closed testing | not started |
| 2 | Health Connect, screen-time habits, home-screen widget, Journey analytics, branching evolution | not started |
| 3 | World scene, evolution stages 3-5, weekly letter + FCM, share page, Play production | not started |

## Layout

```
api/            Flask on Vercel — thin routes/, services/ per integration, Pydantic schemas
app/www/        the game UI: vanilla HTML/CSS/JS, no framework, no build step
app/android/    Capacitor Android shell (generated; the only native code will be the widget)
shared/         game-math.js — the tested source of truth for XP, levels, moods, streaks
web/            marketing site and share pages, served by Vercel
docs/           plan, validation, design + motion spec, progress log
tests/          pytest for the API, Firestore rules tests for the emulator
```

`app/www/game-math.js` is a generated copy of `shared/game-math.js` — a Capacitor webroot cannot
import from outside itself. Edit the file in `shared/`, never the copy.

## Running it

```bash
npm install                      # node 22+
npm run serve                    # build + game UI at localhost:4173
npm test                         # game math (node --test, no framework)
npm run check                    # syntax check the frontend modules

python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt
pytest                           # Flask API

npm run test:rules               # Firestore rules against the emulator (needs a JDK)
npm run cap:sync                 # build, then copy the webroot into the Android project
```

`npm run build` does two generated things: copies `shared/*.js` into the webroot, and bundles the
Firebase SDK into `app/www/vendor/firebase.js` with esbuild. Both outputs are gitignored.

Without `app/www/firebase-config.js` the app runs local-only against `localStorage` — no errors, no
account. Copy `firebase-config.example.js` to wire it up. To develop against emulators instead of a
real project, set `projectId: 'demo-kumo'` and `useEmulator: true`, then:

```bash
npx firebase emulators:start --only firestore,auth --project demo-kumo
```

The debug APK is built by CI on every push to `main` — download `kumo-debug-apk` from the
[Actions tab](https://github.com/kandulanikhilvarma/habit-game/actions) rather than building
Android locally.

## Rules this repo is built under

`CLAUDE.md` is the law: vanilla frontend, no framework, no CSS library. Animate `transform` and
`opacity` only — `transition: all` and `ease-in` are banned, every animation handles
`prefers-reduced-motion`, every touch target is at least 44px, and no emoji is used as a UI icon.
Raw health and usage data never leaves the device; only derived completion events sync.

Full detail: [Stack & architecture](docs/Stack_Architecture_Plan.md) ·
[MVP master plan](docs/HABITGAME_MVP_MASTER_PLAN.md) ·
[Validation report](docs/VALIDATION_REPORT.md) ·
[Design & motion spec](docs/DESIGN_MOTION_SPEC.md)

## Setup still owned by a human

1. Firebase project → Anonymous auth + Firestore → copy `app/www/firebase-config.example.js`
   to `firebase-config.js`, service-account JSON into Vercel env as `FIREBASE_SERVICE_ACCOUNT`.
2. Connect the repo to Vercel once (native Git integration — no deploy token in a public repo).
3. Install the APK on a phone and judge how it feels. Nothing in CI can do that.
