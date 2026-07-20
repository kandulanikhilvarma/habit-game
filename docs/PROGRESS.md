# PROGRESS

Living log. Every session ends by updating this file; every session starts by reading it.

---

## 2026-07-20 — Firestore sync (Gate 0 exit criterion)

### Decision taken
The Firebase JS SDK reaches `app/www` through **esbuild**, not a CDN. `scripts/firebase-entry.js`
re-exports the handful of symbols the app uses; `npm run build:firebase` bundles them into
`app/www/vendor/firebase.js` (676 KB minified, gitignored, generated). A CDN import would have
cost a network fetch on first launch and weakened the offline-first promise for nothing.

### Shipped
- `app/www/cloud.js` — anonymous auth, Firestore with `persistentLocalCache`, whole-state pull at
  boot, and one batched write per completion covering the user doc, the habit, the day rollup and
  the completion row. Completion rows are written from day one because analytics cannot be backfilled.
- `shared/paths.js` — Firestore paths in one place, imported by both the app and the rules test, so
  a path cannot drift away from the rule that protects it.
- Boot order: local state renders first, the cloud catches up second. A cloud failure never costs a completion.
- No Firebase config present → the app runs local-only, no errors. That is what ships until the
  project exists.
- OpenJDK 21 installed on this machine (with your approval), so the emulator suite runs locally now.

### Verified in this session
- `npm run test:rules` locally: 8/8, including every document shape the app actually writes and the
  same documents denied to a second uid.
- Real app in a browser against the auth + Firestore emulators: anonymous sign-in, whole-state push,
  then a completion wrote `users/{uid}/completions/2026-07-20_workout` with `{hid, date, ts, source, xp}`
  and `users/{uid}/days/2026-07-20` with `{done:1, total:3, perfect:false, xpEarned:11, doneIds:[workout]}`.
- **Offline → sync**: killed the emulator, completed a habit (UI advanced to 2/3, XP 82 stored
  locally), restarted the emulator — the queued write landed 6 s later. The completion's `ts`
  (13:41:55, the moment of the tap) is earlier than Firestore's `createTime` (13:42:22), which is the
  proof it was queued rather than re-sent.
- Boot pull: cleared `localStorage`, reloaded, and the app restored XP 60 and the 1-day streak from Firestore.
- Local-only fallback with the config file removed: completions still work, perfect-day bonus applied
  (82 + 11 + 30 = 123).

### Still needs the phone
Same list as below, plus: airplane-mode round-trip on the device, and whether the 676 KB bundle hurts
cold start on a cheap Android.

---

## 2026-07-20 — Gate 0 scaffold

### Shipped
- Repo initialised, planning docs moved into `docs/`, `build-kickoff` skill moved to `.claude/skills/build-kickoff/SKILL.md`.
- `shared/game-math.js` — XP, level curve, evolution stages, moods, streaks, freezes, missed-day catch-up. Written from MASTER_PLAN §3.4 (there is no prototype file in this repo).
- `app/www/` Home screen: top bar, XP bar, creature scene (Kumo stages 1–2 as inline SVG), today row, 3 seeded quests, tab bar. Check-in beat per DESIGN_MOTION_SPEC §3 item 1.
- `app/www/store.js` — localStorage persistence + event-driven day rollover (no polling timer).
- `api/` Flask app with `/api/health`, `services/firebase_client.py` seam, stdout logger, Pydantic module.
- `web/` landing stub leading with the screen-time positioning (VALIDATION_REPORT §7 condition 2).
- `firestore.rules` + emulator test proving another uid is denied.
- Capacitor 8.4.2 Android project at `app/android` (appId `app.kumo.habitgame`).
- CI (`.github/workflows/ci.yml`): pytest · node game-math tests + syntax check + shared-copy drift check · Firestore rules emulator test.
- APK workflow (`.github/workflows/android.yml`): `assembleDebug` → downloadable artifact.

### Verified in this session
- `npm test` → 17/17 pass.
- `pytest -q` → 2 passed.
- Home screen at 375×812 in a real browser: completed 3 habits, XP 10 → 60, level 1 → 2, streak 0 → 1, mood `sleeping → content → radiant`, egg cracks 0 → 3, state survived a reload.
- Audited in-page: zero undersized tap targets, muted text 8.54:1, primary text 16.64:1, zero emoji in UI chrome.
- Grepped for banned motion: no `transition: all`, no `ease-in`, no `scale(0)` entry. The one layout-property transition found (`transition: width` on the XP bar) was replaced with `transform: scaleX`.

### Needs on-device test (never mark these verified from a cloud/desktop session)
- APK install and first launch on the phone.
- Check-in beat at 60fps on a cheap Android (the ₹8k floor device from MASTER_PLAN §8).
- `prefers-reduced-motion` behaviour with the OS setting actually on — the CSS block exists and was code-reviewed, but nothing rendered it.
- Haptics (`Capacitor Haptics` is referenced in `fx.js` but the plugin is not installed yet — the browser vibrate fallback is what ran).

### Verified in CI, not locally
- Firestore rules test: no JDK on this machine, so the emulator could not start here. The `rules` job in CI is the evidence — it passes, including "another uid cannot read or write that tree".
- Repo: https://github.com/kandulanikhilvarma/habit-game (public). PR #1 merged with all three CI jobs green.
- APK: run 29745232136 built `kumo-debug-apk`, 3,768,666 bytes, downloadable from the Actions page.

### Two bugs CI caught that local runs hid
- `pytest` collected nothing in CI: `python -m pytest` puts the repo root on `sys.path`, bare `pytest` does not. Fixed with `pythonpath = .` in `pytest.ini`.
- `./gradlew: Permission denied`: the wrapper was committed from Windows without the exec bit. Fixed with `git update-index --chmod=+x` (PR #2). Anything executable added from this machine needs the same treatment.

### Next
1. Download the APK on the phone and install it — first real launch.
2. Firebase project → Anonymous auth + Firestore → `app/www/firebase-config.js`, service account into Vercel env.
3. Connect the repo to Vercel (native Git integration; no token in a public repo).
4. Gate 0 exit: complete a habit on the phone and prove XP survives offline → sync.

### Open questions
- ~~How does the Firebase JS SDK get into `app/www` without a bundler?~~ Settled on esbuild — see the entry above.
- Multi-device conflict handling is newest-write-wins on whole state (`ponytail:` comment in `app/www/app.js`). Fine for one device; revisit when an account can be on two.
- Nunito is referenced in `tokens.css` but no woff2 is bundled, so the WebView currently falls back to Roboto. Self-host the variable font before Gate 1 (no Google Fonts CDN call from the app shell).
- Undo on a completed habit is deliberately absent this gate (see the `ponytail:` comment in `app/www/app.js`); decide the accounting rules with the edit/delete flows in Gate 1.
